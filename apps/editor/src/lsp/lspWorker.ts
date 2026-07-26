// Web Worker for processing LSP JSON-RPC payloads off the main thread

let buffer = "";

self.onmessage = (e: MessageEvent) => {
  const { type, chunk } = e.data;
  
  if (type === "chunk" && typeof chunk === "string") {
    buffer += chunk;
    
    while (true) {
      const match = buffer.match(/Content-Length:\s*(\d+)\r\n\r\n/);
      if (!match) break;
      
      const length = parseInt(match[1]!, 10);
      const headerLength = match[0].length;
      
      if (buffer.length < headerLength + length) {
        break; // Not enough data yet
      }
      
      const body = buffer.slice(headerLength, headerLength + length);
      buffer = buffer.slice(headerLength + length);
      
      try {
        const msg = JSON.parse(body);
        // Post the fully parsed object back to the main thread via structured cloning
        self.postMessage({ type: "message", msg });
      } catch (err) {
        console.error("[LSP Worker] Failed to parse LSP message", err, body);
      }
    }
  }
};
