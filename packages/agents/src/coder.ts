/**
 * @atlas/agents — Coder Agent
 *
 * Takes a PlanStep, reads relevant files via graph traversal, produces
 * modified file content. Every Coder output is stored with:
 * - The PlanStep that requested it
 * - The reasoning that produced it
 * - Alternatives considered
 * 
 * This enables the "clickable line → reasoning" traceability requirement.
 */

import { sha256 } from "js-sha256";
import { createPatch } from "diff";
import type { ILLMProvider, PlanStep, CoderOutput } from "@atlas/core";
import type { MemoryEngine } from "@atlas/graph";
import {
  FS_TOOL_DEFINITIONS,
  readFileTool,
  writeFileTool,
  listDirectoryTool,
} from "./tools/fs-tools.js";
import {
  GRAPH_TOOL_DEFINITIONS,
  queryMemoryTool,
  getImpactTool,
  recordDecisionTool,
} from "./tools/graph-tools.js";

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const CODER_SYSTEM = `You are the Coder agent in the Atlas Studio AI runtime.

You receive a single plan step and must implement it by reading the relevant files and writing the necessary changes.

Rules:
1. Read all relevant files first using read_file before making any changes.
2. Always query the memory graph for context and conventions before writing code.
3. Make only the changes required by this specific step — no scope creep.
4. After writing changes, call done() with your reasoning and a list of files you modified.
5. If you make a significant design decision, record it using record_decision.
6. Write production-quality code matching the existing style of the codebase.

When you are finished, respond with a JSON object:
{
  "reasoning": "Why you made the choices you did",
  "alternativesConsidered": ["Alternative A and why it was rejected", "..."],
  "modifiedFiles": ["path/to/file.ts"]
}`;

// ---------------------------------------------------------------------------
// Tool handler
// ---------------------------------------------------------------------------

interface CoderContext {
  filesBefore: Map<string, string>;
  filesAfter: Map<string, string>;
  memory: MemoryEngine;
  repoRoot: string;
}

async function handleCoderToolCall(
  toolName: string,
  toolArgs: Record<string, unknown>,
  ctx: CoderContext
): Promise<string> {
  const { memory, repoRoot, filesBefore, filesAfter } = ctx;

  switch (toolName) {
    case "read_file": {
      const fp = String(toolArgs["file_path"] ?? "");
      const content = await readFileTool(fp, repoRoot);
      // Snapshot original content for diffing
      if (!filesBefore.has(fp)) filesBefore.set(fp, content);
      return content;
    }
    case "write_file": {
      const fp = String(toolArgs["file_path"] ?? "");
      const content = String(toolArgs["content"] ?? "");
      // Capture original before first write
      if (!filesBefore.has(fp)) {
        const existing = await readFileTool(fp, repoRoot);
        filesBefore.set(fp, existing.startsWith("[Error") ? "" : existing);
      }
      filesAfter.set(fp, content);
      await writeFileTool(fp, content, repoRoot);
      return `✓ Written: ${fp}`;
    }
    case "list_directory":
      return listDirectoryTool(String(toolArgs["dir_path"] ?? "."), repoRoot);
    case "query_memory":
      return queryMemoryTool(String(toolArgs["query"] ?? ""), { memory, repoRoot });
    case "get_impact":
      return getImpactTool(
        String(toolArgs["file_path"] ?? ""),
        toolArgs["symbol_name"] ? String(toolArgs["symbol_name"]) : undefined,
        { memory, repoRoot }
      );
    case "record_decision":
      return recordDecisionTool(
        String(toolArgs["title"] ?? ""),
        String(toolArgs["description"] ?? ""),
        String(toolArgs["rationale"] ?? ""),
        { memory, repoRoot }
      );
    default:
      return `Unknown tool: ${toolName}`;
  }
}

// ---------------------------------------------------------------------------
// Coder
// ---------------------------------------------------------------------------

export interface CoderOptions {
  provider: ILLMProvider;
  memory: MemoryEngine;
  repoRoot: string;
  onProgress?: (message: string) => void;
}

export async function runCoder(
  step: PlanStep,
  options: CoderOptions
): Promise<CoderOutput> {
  const { provider, memory, repoRoot, onProgress } = options;

  onProgress?.(`Coder: working on "${step.title}"...`);

  const ctx: CoderContext = {
    filesBefore: new Map(),
    filesAfter: new Map(),
    memory,
    repoRoot,
  };

  const messages: import("@atlas/core").LLMMessage[] = [
    { role: "system", content: CODER_SYSTEM },
    {
      role: "user",
      content: `Plan step: ${step.title}\n\n${step.description}\n\nPlanner's reasoning: ${step.reasoning}\n\nRelevant files to start with: ${step.relevantFiles.join(", ") || "Unknown — explore with list_directory"}\n\nBegin by reading the relevant files, then implement the changes.`,
    },
  ];

  const tools = [...FS_TOOL_DEFINITIONS, ...GRAPH_TOOL_DEFINITIONS];
  let iterations = 0;
  const MAX_ITERATIONS = 15;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const response = await provider.complete({
      messages,
      tools,
      toolChoice: "auto",
      temperature: 0.1, // Low temperature for coding
    });

    if (response.toolCalls.length > 0) {
      messages.push({
        role: "assistant" as const,
        content: response.content,
        toolCalls: response.toolCalls,
      });

      for (const tc of response.toolCalls) {
        onProgress?.(`🔧 Coder tool: ${tc.name}`);
        const result = await handleCoderToolCall(tc.name, tc.arguments, ctx);
        messages.push({
          role: "tool" as const,
          content: result,
          toolCallId: tc.id,
        });
      }
      continue;
    }

    // Parse final reasoning JSON
    let parsed: {
      reasoning: string;
      alternativesConsidered?: string[];
      modifiedFiles: string[];
    };
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Model finished without JSON — use what we have
        parsed = {
          reasoning: response.content,
          modifiedFiles: [...ctx.filesAfter.keys()],
        };
      } else {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      parsed = {
        reasoning: response.content,
        modifiedFiles: [...ctx.filesAfter.keys()],
      };
    }

    // Build unified diff from before/after snapshots
    const diffParts: string[] = [];
    for (const [fp, after] of ctx.filesAfter) {
      const before = ctx.filesBefore.get(fp) ?? "";
      const patch = createPatch(fp, before, after);
      diffParts.push(patch);
    }

    const output: CoderOutput = {
      planStepId: step.id,
      diff: diffParts.join("\n"),
      modifiedFiles: parsed.modifiedFiles ?? [...ctx.filesAfter.keys()],
      reasoning: parsed.reasoning ?? "",
      alternativesConsidered: parsed.alternativesConsidered,
      createdAt: Date.now(),
    };

     onProgress?.(`Coder: modified ${output.modifiedFiles.length} file(s)`);
    return output;
  }

  throw new Error(`Coder exceeded maximum iterations for step: ${step.title}`);
}
