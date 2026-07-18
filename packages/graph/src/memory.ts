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
