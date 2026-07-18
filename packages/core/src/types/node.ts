/**
 * @atlas/core — Graph Node & Edge Types
 *
 * These are the fundamental atoms of the Memory Engine.
 * All graph data stored in SQLite conforms to these types.
 */

// ---------------------------------------------------------------------------
// Node kinds
// ---------------------------------------------------------------------------

export type NodeKind =
  | "file"
  | "function"
  | "class"
  | "symbol" // variables, constants, type aliases
  | "decision" // architectural / implementation decisions
  | "bug" // tracked issues / defects
  | "todo"; // TODO / FIXME comments captured during indexing

// ---------------------------------------------------------------------------
// Edge kinds
// ---------------------------------------------------------------------------

export type EdgeKind =
  | "contains" // file → function, file → class
  | "imports" // file → file (module import)
  | "calls" // function → function
  | "inherits" // class → class
  | "implements" // class → interface/symbol
  | "exports" // file → symbol
  | "decided_by" // code node → decision node
  | "fixed_by" // bug node → commit / function node
  | "supersedes"; // decision node → older decision node

// ---------------------------------------------------------------------------
// Core node type
// ---------------------------------------------------------------------------

export interface GraphNode {
  /** Stable UUID — content-addressed (sha256 of filePath + label) */
  id: string;
  kind: NodeKind;
  /** Human-readable name — function name, file path, decision title */
  label: string;
  /** Absolute path to the source file this node belongs to */
  filePath: string;
  /** 1-indexed start line within filePath */
  startLine?: number;
  /** 1-indexed end line within filePath */
  endLine?: number;
  /** Short LLM-generated summary for vector embedding */
  summary?: string;
  /** Git commit hash when this node was last updated */
  commitHash?: string;
  /** Unix timestamp (ms) when this node was last indexed */
  indexedAt: number;
  /** Arbitrary metadata (JSON-serialised) */
  meta?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Core edge type
// ---------------------------------------------------------------------------

export interface GraphEdge {
  /** Stable UUID — sha256 of (fromId + kind + toId) */
  id: string;
  kind: EdgeKind;
  fromId: string;
  toId: string;
  /** Unix timestamp (ms) of when this edge was established */
  createdAt: number;
  /** Optional metadata (e.g. import specifier string, call argument count) */
  meta?: Record<string, unknown>;
}
