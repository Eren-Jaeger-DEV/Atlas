import * as monaco from "monaco-editor";
import { MonacoLanguageClient } from "monaco-languageclient";
import { AbstractMessageReader } from "vscode-jsonrpc/lib/messageReader.js";
import { AbstractMessageWriter } from "vscode-jsonrpc/lib/messageWriter.js";
import { DataCallback, Message } from "vscode-jsonrpc";
import { logToOutput } from "../components/OutputPanel.js";

const api = () => (window as any).atlasAPI;

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

  // To properly handle LSP headers, we can use the standard StreamMessageReader/Writer if we had Node streams.
  // In the browser, we have to parse Content-Length. Let's do a simple manual parser.
  class ManualIpcReader extends AbstractMessageReader {
    private disposeCallback?: () => void;
    private buffer = "";

    listen(callback: DataCallback): monaco.IDisposable {
      this.disposeCallback = api()?.onLspMessage((chunk: string) => {
        this.buffer += chunk;
        while (true) {
          const match = this.buffer.match(/Content-Length:\s*(\d+)\r\n\r\n/);
          if (!match) break;
          const length = parseInt(match[1]!, 10);
          const headerLength = match[0].length;
          if (this.buffer.length < headerLength + length) {
            break; // not enough data yet
          }
          const body = this.buffer.slice(headerLength, headerLength + length);
          this.buffer = this.buffer.slice(headerLength + length);
          try {
            const msg = JSON.parse(body);
            callback(msg);
          } catch (e) {
            console.error("Failed to parse LSP message", e, body);
          }
        }
      });
      return { dispose: () => this.disposeCallback?.() };
    }
  }

  const reader = new ManualIpcReader();
  const writer = new IpcMessageWriter();
  const transports = { reader, writer };

  client = new MonacoLanguageClient({
    name: "Language Client",
    clientOptions: {
      documentSelector: ["typescript", "javascript", "typescriptreact", "javascriptreact", "python"]
    },
    messageTransports: transports
  });

  client.onRequest("workspace/applyEdit", async (params: any) => {
    try {
      const editsByFile: Record<string, any[]> = {};
      if (params.edit.changes) {
        for (const [uri, edits] of Object.entries(params.edit.changes)) {
          const fsPath = monaco.Uri.parse(uri).fsPath;
          const filePath = fsPath ? fsPath : monaco.Uri.parse(uri).path;
          editsByFile[filePath] = edits as any[];
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

export async function fetchDocumentSymbols(filePath: string): Promise<any[]> {
  if (!client) return [];
  try {
    const uri = monaco.Uri.file(filePath).toString();
    const result = await client.sendRequest("textDocument/documentSymbol", {
      textDocument: { uri }
    });
    return (result as any[]) || [];
  } catch (err) {
    console.error("Failed to fetch document symbols:", err);
    return [];
  }
}
