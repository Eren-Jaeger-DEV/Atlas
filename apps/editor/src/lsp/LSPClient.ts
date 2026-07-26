import * as monaco from "monaco-editor";
import { MonacoLanguageClient } from "monaco-languageclient";
import { AbstractMessageReader } from "vscode-jsonrpc/lib/messageReader.js";
import { AbstractMessageWriter } from "vscode-jsonrpc/lib/messageWriter.js";
import { DataCallback, Message } from "vscode-jsonrpc";
import { logToOutput } from "../components/OutputPanel.js";

const api = () => window.atlasAPI;

class IpcMessageWriter extends AbstractMessageWriter {
  async write(msg: Message): Promise<void> {
    const json = JSON.stringify(msg);
    const length = new TextEncoder().encode(json).length;
    const payload = `Content-Length: ${length}\r\n\r\n${json}`;
    api()?.sendLspMessage(payload);
  }
  end(): void {}
}

export type LSPStatus = "loading" | "ready" | "error";

let client: MonacoLanguageClient | null = null;
let isInitialized = false;
let isInitializing = false;
let currentStatus: LSPStatus = "ready";
const statusListeners = new Set<(status: LSPStatus) => void>();

export function onLspStatusChange(callback: (status: LSPStatus) => void) {
  statusListeners.add(callback);
  callback(currentStatus);
  return () => statusListeners.delete(callback);
}

function updateStatus(status: LSPStatus) {
  currentStatus = status;
  for (const listener of statusListeners) {
    listener(status);
  }
}

export async function initLSPClient(repoPath: string, language: string = "typescript") {
  if (isInitialized || isInitializing) return;
  
  const supported = ["typescript", "javascript", "typescriptreact", "javascriptreact", "python"];
  let isLanguageSupported = supported.includes(language);
  
  if (!isLanguageSupported && api()) {
    const extensions = await api()!.listExtensions();
    // E.g., C# might map to atlas.language.csharp
    const extId = `atlas.language.${language.toLowerCase()}`;
    isLanguageSupported = extensions.some(ext => (ext.id || ext.name)?.toLowerCase() === extId || (ext.id || ext.name)?.toLowerCase() === `atlas.language.${language.toLowerCase()}`);
  }

  if (!isLanguageSupported) {
    console.log(`[LSP] Language '${language}' is not supported. Please install the extension from the Marketplace.`);
    return;
  }
  isInitializing = true;
  updateStatus("loading");
  logToOutput("LSP", `Starting ${language} Language Server for ${repoPath}...`);

  const status = await api()?.startLsp(repoPath, language);
  if (status !== "started" && status !== "already_running") {
    logToOutput("LSP", "Failed to start TS LSP.");
    isInitializing = false;
    updateStatus("error");
    return;
  }

  logToOutput("LSP", `LSP started successfully. Connecting client...`);

  // Offload parsing of LSP message payloads (regex + JSON parsing) to a Web Worker
  // to avoid blocking the main UI thread during heavy typing and autocompletion
  class WorkerIpcReader extends AbstractMessageReader {
    private disposeCallback?: () => void;
    private worker: Worker;

    constructor() {
      super();
      this.worker = new Worker(new URL('./lspWorker.ts', import.meta.url), { type: 'module' });
    }

    listen(callback: DataCallback): monaco.IDisposable {
      this.worker.onmessage = (e) => {
        if (e.data?.type === "message" && e.data?.msg) {
          callback(e.data.msg);
        }
      };

      this.disposeCallback = api()?.onLspMessage((chunk: string) => {
        this.worker.postMessage({ type: "chunk", chunk });
      });

      return { 
        dispose: () => {
          this.disposeCallback?.();
          this.worker.terminate();
        } 
      };
    }
  }

  const reader = new WorkerIpcReader();
  const writer = new IpcMessageWriter();
  const transports = { reader, writer };

  try {
    client = new MonacoLanguageClient({
      name: "Language Client",
      clientOptions: {
        documentSelector: ["typescript", "javascript", "typescriptreact", "javascriptreact", "python", language]
      },
      messageTransports: transports
    });
  } catch (e) {
    console.warn("Failed to initialize MonacoLanguageClient. If you are using v8+, ensure vscode/localExtensionHost is initialized.", e);
    isInitializing = false;
    updateStatus("error");
    return;
  }

  client.onRequest("workspace/applyEdit", async (params: any) => {
    try {
      const editsByFile: Record<string, monaco.languages.TextEdit[]> = {};
      if (params.edit.changes) {
        for (const [uri, edits] of Object.entries(params.edit.changes)) {
          const fsPath = monaco.Uri.parse(uri).fsPath;
          const filePath = fsPath ? fsPath : monaco.Uri.parse(uri).path;
          editsByFile[filePath] = edits as unknown as monaco.languages.TextEdit[];
        }
      }
      if (params.edit.documentChanges) {
        for (const change of params.edit.documentChanges) {
          if (change.textDocument && change.edits) {
            const fsPath = monaco.Uri.parse(change.textDocument.uri).fsPath;
            const filePath = fsPath ? fsPath : monaco.Uri.parse(change.textDocument.uri).path;
            if (!editsByFile[filePath]) editsByFile[filePath] = [];
            editsByFile[filePath].push(...change.edits);
          }
        }
      }

      await api()?.applyWorkspaceEdit(editsByFile);
      return { applied: true };
    } catch (e) {
      console.error("Failed to apply workspace edit:", e);
      return { applied: false };
    }
  });

  client.start();
  console.log("LSP Client Started!");
}

export function getLSPClient() {
  return client;
}

export async function fetchDocumentSymbols(filePath: string): Promise<monaco.languages.DocumentSymbol[]> {
  if (!client) return [];
  try {
    const uri = monaco.Uri.file(filePath).toString();
    const result = await client.sendRequest("textDocument/documentSymbol", {
      textDocument: { uri }
    });
    return (result as unknown as monaco.languages.DocumentSymbol[]) || [];
  } catch (err) {
    console.error("Failed to fetch document symbols:", err);
    return [];
  }
}
