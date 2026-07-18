/**
 * @atlas/graph — SQLite Graph Database (sql.js backend)
 *
 * Uses sql.js (pure WASM SQLite) instead of better-sqlite3 to avoid
 * native compilation on Windows. Functionally identical API.
 *
 * Persistence: sql.js runs SQLite in memory. We persist to disk by
 * writing the binary database file after each write transaction.
 *
 * Schema design decisions:
 * - All IDs are content-addressed strings (not auto-increment integers)
 * - Decision log is append-only (reversals = new node with supersedes edge)
 * - JSON columns for meta, plan data
 */

import initSqlJs from "sql.js";
import type { Database } from "sql.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { GraphNode, GraphEdge } from "@atlas/core";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const SCHEMA = /* sql */ `
CREATE TABLE IF NOT EXISTS nodes (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL,
  label       TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  start_line  INTEGER,
  end_line    INTEGER,
  summary     TEXT,
  commit_hash TEXT,
  indexed_at  INTEGER NOT NULL,
  meta        TEXT
);

CREATE TABLE IF NOT EXISTS edges (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL,
  from_id     TEXT NOT NULL,
  to_id       TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  meta        TEXT
);

CREATE INDEX IF NOT EXISTS edges_from  ON edges(from_id);
CREATE INDEX IF NOT EXISTS edges_to    ON edges(to_id);
CREATE INDEX IF NOT EXISTS nodes_file  ON nodes(file_path);
CREATE INDEX IF NOT EXISTS nodes_kind  ON nodes(kind);
CREATE INDEX IF NOT EXISTS nodes_label ON nodes(label);

CREATE TABLE IF NOT EXISTS decisions (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  rationale   TEXT NOT NULL,
  supersedes  TEXT,
  commit_hash TEXT,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
  id            TEXT PRIMARY KEY,
  goal          TEXT NOT NULL,
  plan          TEXT NOT NULL,
  coder_outputs TEXT NOT NULL,
  test_results  TEXT NOT NULL,
  review_result TEXT,
  final_state   TEXT NOT NULL,
  commit_hash   TEXT,
  started_at    INTEGER NOT NULL,
  completed_at  INTEGER
);

CREATE TABLE IF NOT EXISTS node_embeddings (
  node_id     TEXT PRIMARY KEY,
  vector_json TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
`;

// ---------------------------------------------------------------------------
// Decision log type
// ---------------------------------------------------------------------------

export interface DecisionRecord {
  id: string;
  title: string;
  description: string;
  rationale: string;
  supersedes?: string;
  commitHash?: string;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// GraphDB class
// ---------------------------------------------------------------------------

export class GraphDB {
  private db!: Database;
  private dbPath: string;
  private dirty = false;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    // Synchronous init — we load sql.js WASM synchronously for Node.js
    // (actual async init is done via GraphDB.create())
  }

  /**
   * Factory method — must be called instead of new GraphDB() to handle
   * the async WASM initialization of sql.js.
   */
  static async create(dbPath: string): Promise<GraphDB> {
    const instance = new GraphDB(dbPath);
    await instance.init();
    return instance;
  }

  private async init(): Promise<void> {
    mkdirSync(path.dirname(this.dbPath), { recursive: true });

    const SQL = await initSqlJs();
    if (existsSync(this.dbPath)) {
      const fileBuffer = readFileSync(this.dbPath);
      this.db = new SQL.Database(fileBuffer);
    } else {
      this.db = new SQL.Database();
    }

    this.db.run(SCHEMA);
    this.persist();
  }

  /** Persist in-memory db to disk */
  private persist(): void {
    const data = this.db.export();
    writeFileSync(this.dbPath, Buffer.from(data));
    this.dirty = false;
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private run(sql: string, params: Record<string, unknown> = {}): void {
    this.db.run(sql, params as any);
    this.dirty = true;
  }

  private all<T>(sql: string, params: Record<string, unknown> = {}): T[] {
    const stmt = this.db.prepare(sql);
    stmt.bind(params as any);
    const rows: T[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as unknown as T);
    }
    stmt.free();
    return rows;
  }

  private get<T>(sql: string, params: Record<string, unknown> = {}): T | undefined {
    const rows = this.all<T>(sql, params);
    return rows[0];
  }

  // -------------------------------------------------------------------------
  // Node operations
  // -------------------------------------------------------------------------

  upsertNode(node: GraphNode): void {
    this.run(
      `INSERT INTO nodes (id, kind, label, file_path, start_line, end_line,
                          summary, commit_hash, indexed_at, meta)
       VALUES ($id, $kind, $label, $filePath, $startLine, $endLine,
               $summary, $commitHash, $indexedAt, $meta)
       ON CONFLICT(id) DO UPDATE SET
         kind        = excluded.kind,
         label       = excluded.label,
         file_path   = excluded.file_path,
         start_line  = excluded.start_line,
         end_line    = excluded.end_line,
         summary     = excluded.summary,
         commit_hash = excluded.commit_hash,
         indexed_at  = excluded.indexed_at,
         meta        = excluded.meta`,
      {
        $id: node.id,
        $kind: node.kind,
        $label: node.label,
        $filePath: node.filePath,
        $startLine: node.startLine ?? null,
        $endLine: node.endLine ?? null,
        $summary: node.summary ?? null,
        $commitHash: node.commitHash ?? null,
        $indexedAt: node.indexedAt,
        $meta: node.meta ? JSON.stringify(node.meta) : null,
      }
    );
  }

  upsertNodes(nodes: GraphNode[]): void {
    for (const node of nodes) this.upsertNode(node);
    this.persist();
  }

  getNode(id: string): GraphNode | undefined {
    const row = this.get<any>("SELECT * FROM nodes WHERE id = $id", { $id: id });
    return row ? this.rowToNode(row) : undefined;
  }

  getNodesForFile(filePath: string): GraphNode[] {
    return this.all<any>("SELECT * FROM nodes WHERE file_path = $fp", { $fp: filePath }).map(this.rowToNode.bind(this));
  }

  getAllNodes(): GraphNode[] {
    return this.all<any>("SELECT * FROM nodes").map(this.rowToNode.bind(this));
  }

  searchNodes(query: string, limit = 20): GraphNode[] {
    return this.all<any>(
      "SELECT * FROM nodes WHERE label LIKE $q OR summary LIKE $q LIMIT $limit",
      { $q: `%${query}%`, $limit: limit }
    ).map(this.rowToNode.bind(this));
  }

  getNodeByLabel(label: string, filePath?: string): GraphNode | undefined {
    const row = filePath
      ? this.get<any>(
          "SELECT * FROM nodes WHERE label = $label AND file_path = $fp",
          { $label: label, $fp: filePath }
        )
      : this.get<any>(
          "SELECT * FROM nodes WHERE label = $label LIMIT 1",
          { $label: label }
        );
    return row ? this.rowToNode(row) : undefined;
  }

  private rowToNode(row: any): GraphNode {
    return {
      id: row.id,
      kind: row.kind,
      label: row.label,
      filePath: row.file_path,
      startLine: row.start_line ?? undefined,
      endLine: row.end_line ?? undefined,
      summary: row.summary ?? undefined,
      commitHash: row.commit_hash ?? undefined,
      indexedAt: row.indexed_at,
      meta: row.meta ? JSON.parse(row.meta) : undefined,
    };
  }

  // -------------------------------------------------------------------------
  // Edge operations
  // -------------------------------------------------------------------------

  upsertEdge(edge: GraphEdge): void {
    this.run(
      `INSERT INTO edges (id, kind, from_id, to_id, created_at, meta)
       VALUES ($id, $kind, $fromId, $toId, $createdAt, $meta)
       ON CONFLICT(id) DO NOTHING`,
      {
        $id: edge.id,
        $kind: edge.kind,
        $fromId: edge.fromId,
        $toId: edge.toId,
        $createdAt: edge.createdAt,
        $meta: edge.meta ? JSON.stringify(edge.meta) : null,
      }
    );
  }

  upsertEdges(edges: GraphEdge[]): void {
    for (const edge of edges) this.upsertEdge(edge);
    this.persist();
  }

  getEdgesFrom(nodeId: string): GraphEdge[] {
    return this.all<any>("SELECT * FROM edges WHERE from_id = $id", { $id: nodeId }).map(this.rowToEdge);
  }

  getEdgesTo(nodeId: string): GraphEdge[] {
    return this.all<any>("SELECT * FROM edges WHERE to_id = $id", { $id: nodeId }).map(this.rowToEdge);
  }

  getAllEdges(): GraphEdge[] {
    return this.all<any>("SELECT * FROM edges").map(this.rowToEdge.bind(this));
  }

  private rowToEdge(row: any): GraphEdge {
    return {
      id: row.id,
      kind: row.kind,
      fromId: row.from_id,
      toId: row.to_id,
      createdAt: row.created_at,
      meta: row.meta ? JSON.parse(row.meta) : undefined,
    };
  }

  // -------------------------------------------------------------------------
  // Graph traversal — blast radius (iterative BFS for sql.js compatibility)
  // -------------------------------------------------------------------------

  /**
   * BFS traversal — returns all nodes reachable from startId.
   * sql.js doesn't support recursive CTEs well in all versions,
   * so we implement BFS in JavaScript using repeated queries.
   * Still extremely fast for typical repo graphs (< 10ms).
   */
  getReachableNodes(
    startId: string,
    direction: "downstream" | "upstream",
    maxDepth = 10
  ): Array<{ id: string; distance: number }> {
    const fromCol = direction === "downstream" ? "from_id" : "to_id";
    const toCol = direction === "downstream" ? "to_id" : "from_id";

    const visited = new Map<string, number>();
    visited.set(startId, 0);
    let frontier = [startId];

    for (let depth = 1; depth <= maxDepth && frontier.length > 0; depth++) {
      const nextFrontier: string[] = [];

      for (const nodeId of frontier) {
        const neighbors = this.all<any>(
          `SELECT ${toCol} as neighbor FROM edges WHERE ${fromCol} = $id`,
          { $id: nodeId }
        );
        for (const row of neighbors) {
          const neighbor = row.neighbor as string;
          if (!visited.has(neighbor)) {
            visited.set(neighbor, depth);
            nextFrontier.push(neighbor);
          }
        }
      }

      frontier = nextFrontier;
    }

    const results: Array<{ id: string; distance: number }> = [];
    for (const [id, distance] of visited) {
      if (id !== startId) results.push({ id, distance });
    }
    return results.sort((a, b) => a.distance - b.distance);
  }

  // -------------------------------------------------------------------------
  // Decision log (append-only)
  // -------------------------------------------------------------------------

  logDecision(decision: Omit<DecisionRecord, "createdAt">): DecisionRecord {
    const record: DecisionRecord = { ...decision, createdAt: Date.now() };
    this.run(
      `INSERT INTO decisions (id, title, description, rationale,
                              supersedes, commit_hash, created_at)
       VALUES ($id, $title, $description, $rationale,
               $supersedes, $commitHash, $createdAt)`,
      {
        $id: record.id,
        $title: record.title,
        $description: record.description,
        $rationale: record.rationale,
        $supersedes: record.supersedes ?? null,
        $commitHash: record.commitHash ?? null,
        $createdAt: record.createdAt,
      }
    );
    this.persist();
    return record;
  }

  getDecisions(): DecisionRecord[] {
    return this.all<any>("SELECT * FROM decisions ORDER BY created_at DESC").map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      rationale: r.rationale,
      supersedes: r.supersedes ?? undefined,
      commitHash: r.commit_hash ?? undefined,
      createdAt: r.created_at,
    }));
  }

  // -------------------------------------------------------------------------
  // Run traces
  // -------------------------------------------------------------------------

  saveRun(run: Record<string, unknown>): void {
    this.run(
      `INSERT OR REPLACE INTO runs
         (id, goal, plan, coder_outputs, test_results, review_result,
          final_state, commit_hash, started_at, completed_at)
       VALUES
         ($id, $goal, $plan, $coderOutputs, $testResults, $reviewResult,
          $finalState, $commitHash, $startedAt, $completedAt)`,
      {
        $id: run["id"],
        $goal: run["goal"],
        $plan: JSON.stringify(run["plan"]),
        $coderOutputs: JSON.stringify(run["coderOutputs"] ?? []),
        $testResults: JSON.stringify(run["testResults"] ?? []),
        $reviewResult: run["reviewResult"] ? JSON.stringify(run["reviewResult"]) : null,
        $finalState: run["finalState"],
        $commitHash: (run["commitHash"] as string | undefined) ?? null,
        $startedAt: run["startedAt"],
        $completedAt: (run["completedAt"] as number | undefined) ?? null,
      }
    );
    this.persist();
  }

  getRun(id: string): Record<string, unknown> | undefined {
    const row = this.get<any>("SELECT * FROM runs WHERE id = $id", { $id: id });
    if (!row) return undefined;
    return {
      id: row.id,
      goal: row.goal,
      plan: JSON.parse(row.plan),
      coderOutputs: JSON.parse(row.coder_outputs),
      testResults: JSON.parse(row.test_results),
      reviewResult: row.review_result ? JSON.parse(row.review_result) : null,
      finalState: row.final_state,
      commitHash: row.commit_hash,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    };
  }

  // -------------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------------

  getStats(): { nodeCount: number; edgeCount: number; decisionCount: number; runCount: number } {
    const nodeCount = (this.get<any>("SELECT COUNT(*) as c FROM nodes")?.["c"] as number) ?? 0;
    const edgeCount = (this.get<any>("SELECT COUNT(*) as c FROM edges")?.["c"] as number) ?? 0;
    const decisionCount = (this.get<any>("SELECT COUNT(*) as c FROM decisions")?.["c"] as number) ?? 0;
    const runCount = (this.get<any>("SELECT COUNT(*) as c FROM runs")?.["c"] as number) ?? 0;
    return { nodeCount, edgeCount, decisionCount, runCount };
  }

  // -------------------------------------------------------------------------
  // Vector Embeddings
  // -------------------------------------------------------------------------

  upsertNodeEmbedding(nodeId: string, vector: number[]): void {
    this.run(
      `INSERT INTO node_embeddings (node_id, vector_json, created_at)
       VALUES ($nodeId, $vectorJson, $createdAt)
       ON CONFLICT(node_id) DO UPDATE SET
         vector_json = excluded.vector_json,
         created_at  = excluded.created_at`,
      {
        $nodeId: nodeId,
        $vectorJson: JSON.stringify(vector),
        $createdAt: Date.now(),
      }
    );
    this.persist();
  }

  getNodeEmbeddings(): Array<{ nodeId: string; vector: number[] }> {
    const rows = this.all<any>("SELECT node_id, vector_json FROM node_embeddings");
    return rows.map((r) => ({
      nodeId: r.node_id,
      vector: JSON.parse(r.vector_json),
    }));
  }

  getNodeEmbedding(nodeId: string): number[] | undefined {
    const row = this.get<any>("SELECT vector_json FROM node_embeddings WHERE node_id = $id", {
      $id: nodeId,
    });
    if (!row) return undefined;
    return JSON.parse(row.vector_json);
  }

  close(): void {
    if (this.dirty) this.persist();
    this.db.close();
  }
}
