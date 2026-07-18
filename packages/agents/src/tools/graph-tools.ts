/**
 * @atlas/agents — Graph Query Tools
 *
 * Agent-facing wrappers over the Memory Engine.
 * Agents use these to query the knowledge graph, get impact analysis,
 * and record decisions — all through the same graph the editor shows.
 */

import type { LLMToolDefinition } from "@atlas/core";
import type { MemoryEngine } from "@atlas/graph";

export interface GraphToolContext {
  memory: MemoryEngine;
  repoRoot: string;
}

export async function queryMemoryTool(
  query: string,
  ctx: GraphToolContext
): Promise<string> {
  const nodes = ctx.memory.search(query, 10);
  if (nodes.length === 0) return "No relevant nodes found in the memory graph.";
  return nodes
    .map(
      (n) =>
        `[${n.kind}] ${n.label} (${n.filePath}:${n.startLine ?? "?"})\n  ${n.summary ?? "No summary"}`
    )
    .join("\n\n");
}

export async function getImpactTool(
  filePath: string,
  symbolName: string | undefined,
  ctx: GraphToolContext
): Promise<string> {
  const result = await ctx.memory.impact(filePath, symbolName);
  return JSON.stringify(
    {
      riskLevel: result.riskLevel,
      riskRationale: result.riskRationale,
      affectedFiles: result.affectedFiles.length,
      affectedTests: result.affectedTestFiles.length,
      affectedEndpoints: result.affectedApiEndpoints.length,
      topAffectedFiles: result.affectedFiles.slice(0, 10).map((f) => f.filePath),
    },
    null,
    2
  );
}

export async function recordDecisionTool(
  title: string,
  description: string,
  rationale: string,
  ctx: GraphToolContext
): Promise<string> {
  const { sha256 } = await import("js-sha256");
  const id = sha256(`decision:${title}:${Date.now()}`).slice(0, 24);
  const decision = ctx.memory.recordDecision({
    id,
    title,
    description,
    rationale,
  });
  return `Decision recorded: ${decision.id} — "${decision.title}"`;
}

// ---------------------------------------------------------------------------
// LLM tool definitions
// ---------------------------------------------------------------------------

export const GRAPH_TOOL_DEFINITIONS: LLMToolDefinition[] = [
  {
    name: "query_memory",
    description:
      "Search the project knowledge graph for relevant context — past decisions, related functions, known bugs, TODOs. Always query this before writing code.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Natural language query to search the knowledge graph with.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_impact",
    description:
      "Get the dependency impact (blast radius) of a file or function. Returns affected files, tests, and API endpoints.",
    parameters: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the file, relative to the repository root.",
        },
        symbol_name: {
          type: "string",
          description: "Optional: the specific function or class name to analyze.",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "record_decision",
    description:
      "Record an architectural or implementation decision in the knowledge graph. Call this when making significant design choices so future agents and developers can trace the reasoning.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Short title for the decision.",
        },
        description: {
          type: "string",
          description: "What was decided.",
        },
        rationale: {
          type: "string",
          description: "Why this decision was made and what alternatives were rejected.",
        },
      },
      required: ["title", "description", "rationale"],
    },
  },
];
