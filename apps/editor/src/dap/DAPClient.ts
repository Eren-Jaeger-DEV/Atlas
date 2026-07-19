const api = () => (window as any).atlasAPI;

export interface DAPEvent {
  event: string;
  body?: any;
}

class DAPClient {
  private seq = 1;
  private pendingRequests = new Map<number, (res: any) => void>();
  private listeners: Set<(e: DAPEvent) => void> = new Set();
  
  constructor() {
    api()?.onDapMessage((_event: any, message: string) => {
      try {
        const msg = JSON.parse(message);
        if (msg.type === "response" && msg.request_seq) {
          if (this.pendingRequests.has(msg.request_seq)) {
            this.pendingRequests.get(msg.request_seq)!(msg.body);
            this.pendingRequests.delete(msg.request_seq);
          }
        } else if (msg.type === "event") {
          this.listeners.forEach((l) => l({ event: msg.event, body: msg.body }));
        }
      } catch (e) {
        console.error("DAP parse error", e);
      }
    });
  }

  onEvent(listener: (e: DAPEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async sendRequest(command: string, args?: any): Promise<any> {
    const id = this.seq++;
    const payload = { type: "request", seq: id, command, arguments: args };
    api()?.sendDapMessage(JSON.stringify(payload));
    return new Promise((resolve) => {
      this.pendingRequests.set(id, resolve);
    });
  }
}

export const dapClient = new DAPClient();
