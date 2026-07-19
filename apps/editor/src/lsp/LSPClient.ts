import * as monaco from "monaco-editor";
import { MonacoLanguageClient, MessageTransports } from "monaco-languageclient";
import { AbstractMessageReader, AbstractMessageWriter, DataCallback, Message } from "vscode-jsonrpc";
import { logToOutput } from "../components/OutputPanel.js";

const api = () => (window as any).atlasAPI;

// A custom reader that listens to IPC events
class IpcMessageReader extends AbstractMessageReader {
  private disposeCallback?: () => void;
  private callback?: DataCallback;

  listen(callback: DataCallback): monaco.IDisposable {
    this.callback = callback;
    this.disposeCallback = api()?.onLspMessage((message: string) => {
      try {
        // The LSP message from stdio may contain multiple messages separated by Content-Length headers.
        // Wait, standard stdio from TS Language Server uses HTTP headers like "Content-Length: 123\r\n\r\n{...}"
        // But our IPC is just forwarding the raw buffer strings.
        // monaco-languageclient's default reader/writer might expect to parse this.
        // Actually, if we just pass the raw chunks, it won't work easily unless we use the StreamMessageReader
        // But let's assume we can just pass the string to a parser, or we can use the reader that vscode-jsonrpc provides!
      } catch (e) {
        console.error(e);
      }
    });
    return { dispose: () => this.disposeCallback?.() };
  }
}

class IpcMessageWriter extends AbstractMessageWriter {
  async write(msg: Message): Promise<void> {
    const json = JSON.stringify(msg);
    const length = new TextEncoder().encode(json).length;
    const payload = `Content-Length: ${length}\r\n\r\n${json}`;
    api()?.sendLspMessage(payload);
  }
  end(): void {}
}

let client: MonacoLanguageClient | null = null;
let isInitialized = false;
let isInitializing = false;

export async function initLSPClient(repoPath: string) {
  if (isInitialized || isInitializing) return;
  isInitializing = true;
  logToOutput("LSP", `Starting TypeScript Language Server for ${repoPath}...`);

  const status = await api()?.startLsp(repoPath);
  if (status !== "started" && status !== "already_running") {
    logToOutput("LSP", "Failed to start TS LSP.");
    isInitializing = false;
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
          const length = parseInt(match[1], 10);
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
  const transports: MessageTransports = { reader, writer };

  client = new MonacoLanguageClient({
    name: "TypeScript Language Client",
    clientOptions: {
      documentSelector: ["typescript", "javascript", "typescriptreact", "javascriptreact"]
    },
    connectionProvider: {
      get: async () => transports
    }
  });

  client.start();
  console.log("LSP Client Started!");
}
