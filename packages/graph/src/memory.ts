/**
 * @atlas/graph — Memory Engine
 *
 * High-level facade over GraphDB + impact engine + developer intelligence queries.
 */

import path from "node:path";
import type { GraphNode, GraphEdge, ImpactResult } from "@atlas/core";
import { GraphDB } from "./db/graph-db.js";
import type { DecisionRecord, BugPattern } from "./db/graph-db.js";
import { computeImpact } from "./impact.js";
import { EmbeddingEngine, cosineSimilarity } from "./embeddings.js";

export interface MemoryEngineConfig {
  /** Absolute path to the repository root */
  repoRoot: string;
  /** Path to the SQLite database file (defaults to <repoRoot>/.atlas/graph.db) */
  dbPath?: string;
}

export interface CircularDependency {
  cycle: string[];
}

export interface ProjectHealthReport {
  score: number;
  totalFiles: number;
  totalSymbols: number;
  todoCount: number;
  circularDependenciesCount: number;
  orphanModulesCount: number;
  circularDependencies: CircularDependency[];
  orphanModules: string[];
}

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

  async bulkIndex(nodes: GraphNode[], edges: GraphEdge[]): Promise<void> {
    this.db.upsertNodes(nodes);
    this.db.upsertEdges(edges);
  }

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
  // Symbol Navigation: Go to Definition & Find References
  // -------------------------------------------------------------------------

  findSymbolDefinition(symbolName: string): GraphNode | undefined {
    const nodes = this.search(symbolName, 10);
    return nodes.find(n => n.label === symbolName || n.label.endsWith(`:${symbolName}`));
  }

  findSymbolReferences(symbolName: string): GraphNode[] {
    const def = this.findSymbolDefinition(symbolName);
    if (!def) return [];

    const incomingEdges = this.getEdgesTo(def.id);
    const refs: GraphNode[] = [];
    for (const edge of incomingEdges) {
      const sourceNode = this.db.getNode(edge.fromId);
      if (sourceNode) refs.push(sourceNode);
    }
    return refs;
  }

  // -------------------------------------------------------------------------
  // Circular Dependency Detection & Health Metrics
  // -------------------------------------------------------------------------

  detectCircularDependencies(): CircularDependency[] {
    const allEdges = this.db.getAllEdges();
    const adj: Map<string, string[]> = new Map();

    for (const edge of allEdges) {
      if (!adj.has(edge.fromId)) adj.set(edge.fromId, []);
      adj.get(edge.fromId)!.push(edge.toId);
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();
    const cycles: CircularDependency[] = [];

    const dfs = (curr: string, path: string[]) => {
      visited.add(curr);
      recStack.add(curr);
      path.push(curr);

      const neighbors = adj.get(curr) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart !== -1) {
            cycles.push({ cycle: [...path.slice(cycleStart), neighbor] });
          }
        }
      }

      recStack.delete(curr);
    };

    for (const node of this.db.getAllNodes()) {
      if (!visited.has(node.id)) {
        dfs(node.id, []);
      }
    }

    return cycles.slice(0, 10);
  }

  getProjectHealthMetrics(): ProjectHealthReport {
    const allNodes = this.db.getAllNodes();
    const fileNodes = allNodes.filter(n => n.kind === "file");
    const symbolNodes = allNodes.filter(n => n.kind !== "file");

    const cycles = this.detectCircularDependencies();

    const orphanModules: string[] = [];
    for (const file of fileNodes) {
      const inEdges = this.getEdgesTo(file.id);
      const outEdges = this.getEdgesFrom(file.id);
      if (inEdges.length === 0 && outEdges.length === 0) {
        orphanModules.push(file.filePath);
      }
    }

    let score = 100;
    score -= cycles.length * 5;
    score -= Math.min(orphanModules.length * 2, 20);
    score = Math.max(score, 50);

    return {
      score,
      totalFiles: fileNodes.length,
      totalSymbols: symbolNodes.length,
      todoCount: 0,
      circularDependenciesCount: cycles.length,
      orphanModulesCount: orphanModules.length,
      circularDependencies: cycles,
      orphanModules,
    };
  }

  // -------------------------------------------------------------------------
  // Chat Memory (Phase 5)
  // -------------------------------------------------------------------------

  logChatNode(node: { id: string, sessionId: string, role: string, content: string, createdAt: number }): void {
    this.db.logChatNode(node);
  }

  getChatNodes(sessionId: string): Array<{ id: string, sessionId: string, role: string, content: string, createdAt: number }> {
    return this.db.getChatNodes(sessionId);
  }

  upsertDeveloperProfile(id: string, preferences: string): void {
    this.db.upsertDeveloperProfile(id, preferences);
  }

  getDeveloperProfile(id: string): string | undefined {
    return this.db.getDeveloperProfile(id);
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

  async indexChatEmbeddings(engine?: EmbeddingEngine): Promise<number> {
    const embedder = engine ?? new EmbeddingEngine();
    const existingEmbeddings = new Set(this.db.getChatNodeEmbeddings().map((e) => e.chatId));
    const allChatNodes = this.db.getAllChatNodes();

    let count = 0;
    for (const node of allChatNodes) {
      if (existingEmbeddings.has(node.id)) continue;
      const textToEmbed = `${node.role}: ${node.content}`.trim();
      const vector = await embedder.embed(textToEmbed);
      this.db.upsertChatNodeEmbedding(node.id, vector);
      count++;
    }
    return count;
  }

  async vectorSearchChat(query: string, limit = 10, engine?: EmbeddingEngine): Promise<Array<{ id: string, sessionId: string, role: string, content: string, createdAt: number }>> {
    const embedder = engine ?? new EmbeddingEngine();
    const queryVector = await embedder.embed(query);
    const storedEmbeddings = this.db.getChatNodeEmbeddings();

    if (storedEmbeddings.length === 0) {
      await this.indexChatEmbeddings(embedder);
    }

    const embeddingsList = this.db.getChatNodeEmbeddings();
    const scored: Array<{ chatId: string; score: number }> = [];

    for (const item of embeddingsList) {
      const score = cosineSimilarity(queryVector, item.vector);
      if (score > 0) {
        scored.push({ chatId: item.chatId, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);

    const results: Array<any> = [];
    for (const item of scored.slice(0, limit)) {
      const node = this.db.getChatNode(item.chatId);
      if (node) results.push(node);
    }

    return results;
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
    const k = 60;

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

  async impact(filePath: string, symbolName?: string): Promise<ImpactResult> {
    return computeImpact(this.db, filePath, symbolName);
  }

  recordDecision(decision: Omit<DecisionRecord, "createdAt">): DecisionRecord {
    return this.db.logDecision(decision);
  }

  getDecisions(): DecisionRecord[] {
    return this.db.getDecisions();
  }

  saveRun(run: Record<string, unknown>): void {
    this.db.saveRun(run);
  }

  getRun(id: string): Record<string, unknown> | undefined {
    return this.db.getRun(id);
  }

  getAllRuns(): Record<string, unknown>[] {
    return this.db.getAllRuns();
  }

  logTaskEvent(runId: string, taskId: string, eventType: string, payload: any): void {
    this.db.logTaskEvent(runId, taskId, eventType, payload);
  }

  getTaskEvents(runId: string): Array<{ id: string, taskId: string, eventType: string, payload: any, createdAt: number }> {
    return this.db.getTaskEvents(runId);
  }

  logBugPattern(pattern: BugPattern): void {
    this.db.logBugPattern(pattern);
  }

  getBugPatterns(): BugPattern[] {
    return this.db.getBugPatterns();
  }

  getStats() {
    return this.db.getStats();
  }

  close(): void {
    this.db.close();
  }
}
