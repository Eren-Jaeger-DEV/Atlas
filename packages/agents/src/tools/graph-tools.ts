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

export async function logBugPatternTool(
  errorSignature: string,
  solution: string,
  contextTags: string,
  ctx: GraphToolContext
): Promise<string> {
  const { sha256 } = await import("js-sha256");
  const id = sha256(`bug:${errorSignature}:${Date.now()}`).slice(0, 24);
  ctx.memory.logBugPattern({
    id,
    errorSignature,
    solution,
    contextTags,
    createdAt: Date.now(),
  });
  return `Bug pattern recorded with ID: ${id}`;
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
          description:
            "Optional name of a specific function or class to target the impact analysis.",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "record_decision",
    description:
      "Record a significant architectural or design decision into the project's knowledge graph.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Short, descriptive title of the decision.",
        },
        description: {
          type: "string",
          description: "Detailed description of what was decided and why.",
        },
        rationale: {
          type: "string",
          description:
            "The specific reasoning, trade-offs, and alternatives considered.",
        },
      },
      required: ["title", "description", "rationale"],
    },
  },
  {
    name: "log_bug_pattern",
    description:
      "Record a recurring bug or a complex fix so the Swarm can learn to avoid it in the future.",
    parameters: {
      type: "object",
      properties: {
        error_signature: {
          type: "string",
          description: "A short, distinct description or snippet of the error.",
        },
        solution: {
          type: "string",
          description: "How the error was resolved or the correct pattern to use.",
        },
        context_tags: {
          type: "string",
          description: "Comma-separated tags (e.g. 'react, state, memory-leak').",
        },
      },
      required: ["error_signature", "solution"],
    },
  }
];
