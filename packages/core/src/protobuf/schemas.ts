/**
 * @atlas/core — Protobuf Schemas & Binary Struct Types
 *
 * Lightweight, zero-dependency Protobuf binary frame definitions matching Cursor's
 * `aiserver.v1` and Antigravity's `google.protobuf` sidecar transport specification.
 */

export interface AgentEventFrame {
  version: number;
  runId: string;
  timestamp: number;
  type: "token" | "step_start" | "state_change" | "awaiting_human" | "log" | "error";
  content?: string;
  tool?: string;
  argsJson?: string;
  state?: string;
}

export interface DiffZoneFrame {
  version: number;
  runId: string;
  filePath: string;
  oldContent: string;
  newContent: string;
  hunks: Array<{
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    lines: string[];
  }>;
}
