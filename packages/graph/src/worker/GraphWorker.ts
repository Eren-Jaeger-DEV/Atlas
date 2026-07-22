/**
 * @atlas/graph — GraphWorker Thread Script
 *
 * Runs SQLite GraphDB queries and vector similarity searches in a dedicated
 * background worker thread (node:worker_threads) to keep the main event loop
 * completely unblocked during massive codebase index runs.
 */

import { parentPort } from "node:worker_threads";
import { GraphDB } from "../db/graph-db.js";

let dbInstance: GraphDB | null = null;

if (parentPort) {
  parentPort.on("message", async (msg: any) => {
    const { id, type, payload } = msg;

    try {
      if (type === "INIT") {
        const dbPath = payload?.dbPath || ":memory:";
        dbInstance = new GraphDB(dbPath);
        parentPort?.postMessage({ id, success: true });
        return;
      }

      if (!dbInstance) {
        throw new Error("GraphWorker is not initialized with a GraphDB instance.");
      }

      switch (type) {
        case "ADD_NODE": {
          dbInstance.upsertNode(payload.node);
          parentPort?.postMessage({ id, success: true });
          break;
        }
        case "ADD_EDGE": {
          dbInstance.upsertEdge(payload.edge);
          parentPort?.postMessage({ id, success: true });
          break;
        }
        case "GET_ALL_NODES": {
          const res = dbInstance.getAllNodes();
          parentPort?.postMessage({ id, success: true, data: res });
          break;
        }
        case "GET_EDGES_FOR_NODE": {
          const res = dbInstance.getEdgesFrom(payload.nodeId);
          parentPort?.postMessage({ id, success: true, data: res });
          break;
        }
        case "LOG_CHAT_NODE": {
          dbInstance.logChatNode(payload.chatNode);
          parentPort?.postMessage({ id, success: true });
          break;
        }
        case "GET_CHAT_NODES": {
          const res = dbInstance.getChatNodes(payload.sessionId);
          parentPort?.postMessage({ id, success: true, data: res });
          break;
        }
        case "UPSERT_EMBEDDING": {
          dbInstance.upsertChatNodeEmbedding(payload.chatId, payload.vector);
          parentPort?.postMessage({ id, success: true });
          break;
        }
        case "SEARCH_SIMILAR_CHAT_NODES": {
          // Calculate cosine similarity off main thread
          const embeddings = dbInstance.getChatNodeEmbeddings();
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
          parentPort?.postMessage({ id, success: true, data: scored.slice(0, topK) });
          break;
        }
        case "CLOSE": {
          dbInstance.close();
          dbInstance = null;
          parentPort?.postMessage({ id, success: true });
          break;
        }
        default:
          throw new Error(`Unknown GraphWorker action type: ${type}`);
      }
    } catch (err: any) {
      parentPort?.postMessage({ id, success: false, error: err?.message || String(err) });
    }
  });
}
