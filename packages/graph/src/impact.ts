/**
 * @atlas/graph — Live Dependency Impact Engine
 *
 * The flagship Phase 1 feature. Computes the blast radius of editing a
 * function or file — zero AI, zero network, pure SQLite graph traversal.
 *
 * Spec requirement: must return in < 500ms.
 * Works immediately after `atlas init`, before any agent has ever run.
 */

import path from "node:path";
import type { ImpactResult, AffectedFile, RiskLevel } from "@atlas/core";
import type { GraphDB } from "./db/graph-db.js";

// ---------------------------------------------------------------------------
// Heuristics for classifying affected files
// ---------------------------------------------------------------------------

const TEST_PATTERNS = [
  /\.test\.(ts|tsx|js|py)$/,
  /\.spec\.(ts|tsx|js|py)$/,
  /__tests__\//,
  /\/tests?\//,
  /\/test\//,
];

const API_PATTERNS = [
  /\/routes?\//,
  /\/controllers?\//,
  /\/handlers?\//,
  /\/endpoints?\//,
  /router\.(ts|js)$/,
  /api\.(ts|js)$/,
];

function isTestFile(filePath: string): boolean {
  return TEST_PATTERNS.some((p) => p.test(filePath));
}

function isApiEndpoint(filePath: string): boolean {
  return API_PATTERNS.some((p) => p.test(filePath));
}

// ---------------------------------------------------------------------------
// Risk scoring
// ---------------------------------------------------------------------------

function computeRisk(
  affectedFiles: AffectedFile[],
  affectedTests: AffectedFile[],
  affectedEndpoints: AffectedFile[]
): { level: RiskLevel; rationale: string } {
  const fileCount = affectedFiles.length;
  const endpointCount = affectedEndpoints.length;

  if (endpointCount > 0 && fileCount > 20) {
    return {
      level: "critical",
      rationale: `Affects ${endpointCount} API endpoint(s) and ${fileCount} files — high blast radius with public API surface.`,
    };
  }
  if (endpointCount > 0 || fileCount > 30) {
    return {
      level: "high",
      rationale: endpointCount > 0
        ? `Affects ${endpointCount} API endpoint(s) — changes may impact public API contracts.`
        : `Large blast radius: ${fileCount} files affected.`,
    };
  }
  if (fileCount > 10) {
    return {
      level: "medium",
      rationale: `Affects ${fileCount} files — moderate blast radius, review dependency chain.`,
    };
  }
  return {
    level: "low",
    rationale: `Affects ${fileCount} file(s) — contained change.`,
  };
}

// ---------------------------------------------------------------------------
// Main impact function
// ---------------------------------------------------------------------------

export async function computeImpact(
  db: GraphDB,
  filePath: string,
  symbolName?: string
): Promise<ImpactResult> {
  const start = performance.now();

  // Normalize path separators — fast-glob returns forward slashes, but
  // path.resolve() on Windows returns backslashes. Normalize everything.
  const normalizedPath = filePath.replace(/\\/g, "/");

  // Resolve the start node
  let startNodeId: string | undefined;

  if (symbolName) {
    // Find the specific function/class node
    const node = db.getNodeByLabel(symbolName, normalizedPath);
    startNodeId = node?.id;
  }

  if (!startNodeId) {
    // Fall back to the file node
    const fileNode = db.getNodesForFile(normalizedPath).find((n) => n.kind === "file");
    startNodeId = fileNode?.id;
  }

  if (!startNodeId) {
    const computedInMs = performance.now() - start;
    return {
      target: { filePath, ...(symbolName !== undefined ? { symbolName } : {}) },
      affectedFiles: [],
      affectedTestFiles: [],
      affectedApiEndpoints: [],
      riskLevel: "low",
      riskRationale: "No graph nodes found for this file. Run `atlas init` to build the graph.",
      computedInMs,
    };
  }

  // Traverse upstream (who depends on this node?)
  const reachable = db.getReachableNodes(startNodeId, "upstream");

  // Collect affected file paths (deduplicated)
  const seenFiles = new Set<string>();
  const affectedFiles: AffectedFile[] = [];

  for (const { id, distance } of reachable) {
    const node = db.getNode(id);
    if (!node) continue;

    const fp = node.filePath;
    if (seenFiles.has(fp) || fp === normalizedPath) continue;
    seenFiles.add(fp);

    affectedFiles.push({
      filePath: fp,
      distance,
      reason: `Reachable via ${node.kind} "${node.label}" (${distance} hop${distance > 1 ? "s" : ""})`,
    });
  }

  const affectedTestFiles = affectedFiles.filter((f) =>
    isTestFile(f.filePath)
  );
  const affectedApiEndpoints = affectedFiles.filter((f) =>
    isApiEndpoint(f.filePath)
  );

  const { level: riskLevel, rationale: riskRationale } = computeRisk(
    affectedFiles,
    affectedTestFiles,
    affectedApiEndpoints
  );

  return {
    target: { filePath, ...(symbolName !== undefined ? { symbolName } : {}) },
    affectedFiles,
    affectedTestFiles,
    affectedApiEndpoints,
    riskLevel,
    riskRationale,
    computedInMs: performance.now() - start,
  };
}
