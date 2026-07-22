/**
 * @atlas/graph — GraphWorkerClient
 *
 * Async client proxy for GraphWorker. Provides seamless background thread execution
 * with automatic fallback to in-thread GraphDB if Worker threads are unavailable.
 */

import { Worker } from "node:worker_threads";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GraphDB } from "../db/graph-db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class GraphWorkerClient {
  private worker: Worker | null = null;
  private fallbackDb: GraphDB | null = null;
  private pending = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>();
  private requestCounter = 0;

  constructor(private dbPath: string = ":memory:") {}

  async init(): Promise<void> {
    try {
      const workerScript = path.join(__dirname, "GraphWorker.js");
      const fs = await import("node:fs");
      if (!fs.existsSync(workerScript)) {
        throw new Error(`Worker script not found at ${workerScript}`);
      }

      this.worker = new Worker(workerScript);

      this.worker.on("message", (msg: any) => {
        const { id, success, data, error } = msg;
        const handler = this.pending.get(id);
        if (handler) {
          this.pending.delete(id);
          if (success) {
            handler.resolve(data);
          } else {
            handler.reject(new Error(error));
          }
        }
      });

      this.worker.on("error", async (err) => {
        console.warn("[WARN] GraphWorker thread error, falling back to in-thread GraphDB:", err.message);
        this.fallbackDb = new GraphDB(this.dbPath);
        await this.fallbackDb.init();
      });

      await this.send("INIT", { dbPath: this.dbPath });
    } catch (_err) {
      // Direct in-process fallback
      this.fallbackDb = new GraphDB(this.dbPath);
      await this.fallbackDb.init();
    }
  }

  private send<T>(type: string, payload: any): Promise<T> {
    if (this.fallbackDb) {
      return this.executeFallback<T>(type, payload);
    }

    return new Promise((resolve, reject) => {
      const id = `req_${++this.requestCounter}_${Date.now()}`;
      this.pending.set(id, { resolve, reject });
      this.worker?.postMessage({ id, type, payload });
    });
  }

  private async executeFallback<T>(type: string, payload: any): Promise<T> {
    if (!this.fallbackDb) {
      this.fallbackDb = new GraphDB(this.dbPath);
      await this.fallbackDb.init();
    }

    switch (type) {
      case "INIT":
        return undefined as unknown as T;
      case "ADD_NODE":
        this.fallbackDb.upsertNode(payload.node);
        return undefined as unknown as T;
      case "ADD_EDGE":
        this.fallbackDb.upsertEdge(payload.edge);
        return undefined as unknown as T;
      case "GET_ALL_NODES":
        return this.fallbackDb.getAllNodes() as unknown as T;
      case "GET_EDGES_FOR_NODE":
        return this.fallbackDb.getEdgesFrom(payload.nodeId) as unknown as T;
      case "LOG_CHAT_NODE":
        this.fallbackDb.logChatNode(payload.chatNode);
        return undefined as unknown as T;
      case "GET_CHAT_NODES":
        return this.fallbackDb.getChatNodes(payload.sessionId) as unknown as T;
      case "UPSERT_EMBEDDING":
        this.fallbackDb.upsertChatNodeEmbedding(payload.chatId, payload.vector);
        return undefined as unknown as T;
      case "SEARCH_SIMILAR_CHAT_NODES": {
        const embeddings = this.fallbackDb.getChatNodeEmbeddings();
        const queryVec: number[] = payload.vector;
        const topK: number = payload.topK || 5;

        const scored = embeddings.map((item) => {
          let dot = 0;
          let normA = 0;
          let normB = 0;
          for (let i = 0; i < Math.min(item.vector.length, queryVec.length); i++) {
            const a = item.vector[i] || 0;
            const b = queryVec[i] || 0;
            dot += a * b;
            normA += a * a;
            normB += b * b;
          }
          const denom = Math.sqrt(normA) * Math.sqrt(normB);
          const score = denom > 0 ? dot / denom : 0;
          return { chatId: item.chatId, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, topK) as unknown as T;
      }
      case "CLOSE":
        this.fallbackDb.close();
        return undefined as unknown as T;
      default:
        throw new Error(`Unknown action: ${type}`);
    }
  }

  async addNode(node: any): Promise<void> {
    await this.send("ADD_NODE", { node });
  }

  async addEdge(edge: any): Promise<void> {
    await this.send("ADD_EDGE", { edge });
  }

  async getAllNodes(): Promise<any[]> {
    return this.send("GET_ALL_NODES", {});
  }

  async getEdgesForNode(nodeId: string): Promise<any[]> {
    return this.send("GET_EDGES_FOR_NODE", { nodeId });
  }

  async logChatNode(chatNode: any): Promise<void> {
    await this.send("LOG_CHAT_NODE", { chatNode });
  }

  async getChatNodes(sessionId: string): Promise<any[]> {
    return this.send("GET_CHAT_NODES", { sessionId });
  }

  async upsertChatNodeEmbedding(chatId: string, vector: number[]): Promise<void> {
    await this.send("UPSERT_EMBEDDING", { chatId, vector });
  }

  async searchSimilarChatNodes(vector: number[], topK = 5): Promise<Array<{ chatId: string; score: number }>> {
    return this.send("SEARCH_SIMILAR_CHAT_NODES", { vector, topK });
  }

  async close(): Promise<void> {
    await this.send("CLOSE", {});
    this.worker?.terminate();
    this.worker = null;
  }
}
