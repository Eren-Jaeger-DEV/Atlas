/**
 * @atlas/graph — Memory Engine
 *
 * High-level facade over GraphDB + impact engine. This is what the CLI
 * and agent runtime import — they don't talk to GraphDB directly.
 */

import path from "node:path";
import type { GraphNode, GraphEdge, ImpactResult } from "@atlas/core";
import { GraphDB } from "./db/graph-db.js";
import type { DecisionRecord } from "./db/graph-db.js";
import { computeImpact } from "./impact.js";
import { EmbeddingEngine, cosineSimilarity } from "./embeddings.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface MemoryEngineConfig {
  /** Absolute path to the repository root */
  repoRoot: string;
  /** Path to the SQLite database file (defaults to <repoRoot>/.atlas/graph.db) */
  dbPath?: string;
}

// ---------------------------------------------------------------------------
// MemoryEngine
// ---------------------------------------------------------------------------

export class MemoryEngine {
  readonly db: GraphDB;
  readonly repoRoot: string;

  private constructor(db: GraphDB, repoRoot: string) {
    this.db = db;
    this.repoRoot = repoRoot;
  }

  static async create(config: MemoryEngineConfig): Promise<MemoryEngine> {
    const dbPath =
      config.dbPath ?? path.join(config.repoRoot, ".atlas", "graph.db");
    const db = await GraphDB.create(dbPath);
    return new MemoryEngine(db, config.repoRoot);
  }

  // -------------------------------------------------------------------------
  // Indexing (called by atlas init)
  // -------------------------------------------------------------------------

  async bulkIndex(nodes: GraphNode[], edges: GraphEdge[]): Promise<void> {
    this.db.upsertNodes(nodes);
    this.db.upsertEdges(edges);
  }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  getNodesForFile(filePath: string): GraphNode[] {
    return this.db.getNodesForFile(filePath);
  }

  getEdgesFrom(nodeId: string): GraphEdge[] {
    return this.db.getEdgesFrom(nodeId);
  }

  getEdgesTo(nodeId: string): GraphEdge[] {
    return this.db.getEdgesTo(nodeId);
  }

  search(query: string, limit = 20): GraphNode[] {
    return this.db.searchNodes(query, limit);
  }

  // -------------------------------------------------------------------------
  // Vector Embeddings & Hybrid Search
  // -------------------------------------------------------------------------

  async indexEmbeddings(engine?: EmbeddingEngine): Promise<number> {
    const embedder = engine ?? new EmbeddingEngine();
    const existingEmbeddings = new Set(this.db.getNodeEmbeddings().map((e) => e.nodeId));
    const allNodes = this.db.getAllNodes();

    let count = 0;
    for (const node of allNodes) {
      if (existingEmbeddings.has(node.id)) continue;
      const textToEmbed = `${node.kind} ${node.label} ${node.filePath} ${node.summary ?? ""}`.trim();
      const vector = await embedder.embed(textToEmbed);
      this.db.upsertNodeEmbedding(node.id, vector);
      count++;
    }
    return count;
  }

  async vectorSearch(query: string, limit = 20, engine?: EmbeddingEngine): Promise<GraphNode[]> {
    const embedder = engine ?? new EmbeddingEngine();
    const queryVector = await embedder.embed(query);
    const storedEmbeddings = this.db.getNodeEmbeddings();

    if (storedEmbeddings.length === 0) {
      await this.indexEmbeddings(embedder);
    }

    const embeddingsList = this.db.getNodeEmbeddings();
    const scored: Array<{ nodeId: string; score: number }> = [];

    for (const item of embeddingsList) {
      const score = cosineSimilarity(queryVector, item.vector);
      if (score > 0) {
        scored.push({ nodeId: item.nodeId, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);

    const results: GraphNode[] = [];
    for (const item of scored.slice(0, limit)) {
      const node = this.db.getNode(item.nodeId);
      if (node) results.push(node);
    }

    return results;
  }

  async hybridSearch(query: string, limit = 20, engine?: EmbeddingEngine): Promise<GraphNode[]> {
    const keywordResults = this.search(query, limit * 2);
    const vectorResults = await this.vectorSearch(query, limit * 2, engine);

    const rrfScores = new Map<string, number>();
    const k = 60; // Standard RRF constant

    keywordResults.forEach((node, rank) => {
      const current = rrfScores.get(node.id) ?? 0;
      rrfScores.set(node.id, current + 1 / (k + rank + 1));
    });

    vectorResults.forEach((node, rank) => {
      const current = rrfScores.get(node.id) ?? 0;
      rrfScores.set(node.id, current + 1 / (k + rank + 1));
    });

    const sortedNodeIds = Array.from(rrfScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    const results: GraphNode[] = [];
    for (const id of sortedNodeIds) {
      const node = this.db.getNode(id);
      if (node) results.push(node);
    }

    return results;
  }

  // -------------------------------------------------------------------------
  // Impact analysis (the core differentiator)
  // -------------------------------------------------------------------------

  async impact(filePath: string, symbolName?: string): Promise<ImpactResult> {
    return computeImpact(this.db, filePath, symbolName);
  }

  // -------------------------------------------------------------------------
  // Decision log (append-only)
  // -------------------------------------------------------------------------

  recordDecision(
    decision: Omit<DecisionRecord, "createdAt">
  ): DecisionRecord {
    return this.db.logDecision(decision);
  }

  getDecisions(): DecisionRecord[] {
    return this.db.getDecisions();
  }

  // -------------------------------------------------------------------------
  // Run traces (AI Timeline)
  // -------------------------------------------------------------------------

  saveRun(run: Record<string, unknown>): void {
    this.db.saveRun(run);
  }

  getRun(id: string): Record<string, unknown> | undefined {
    return this.db.getRun(id);
  }

  // -------------------------------------------------------------------------
  // Housekeeping
  // -------------------------------------------------------------------------

  getStats() {
    return this.db.getStats();
  }

  close(): void {
    this.db.close();
  }
}
