/**
 * @atlas/core — Impact Analysis Types
 *
 * Used by the Live Dependency Impact engine (packages/graph).
 * Zero AI involved — pure static graph traversal.
 */

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface AffectedFile {
  filePath: string;
  /** How many hops away in the dependency graph */
  distance: number;
  /** Why this file is affected */
  reason: string;
}

export interface ImpactResult {
  /** The symbol or file the impact was computed for */
  target: {
    filePath: string;
    symbolName?: string;
    startLine?: number;
    endLine?: number;
  };
  /** All files transitively affected by a change to the target */
  affectedFiles: AffectedFile[];
  /** Subset of affectedFiles that are test files */
  affectedTestFiles: AffectedFile[];
  /** Subset of affectedFiles that are API endpoint handlers */
  affectedApiEndpoints: AffectedFile[];
  /** Computed risk level based on blast radius */
  riskLevel: RiskLevel;
  /** How the risk level was computed */
  riskRationale: string;
  /** Time taken to compute (should be < 500ms) */
  computedInMs: number;
}
