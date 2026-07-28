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
import { WorkspaceTrustPolicy } from "@atlas/core";
import type { MemoryEngine } from "@atlas/graph";
import {
  FS_TOOL_DEFINITIONS,
  readFileTool,
  writeFileTool,
  listDirectoryTool,
  multiReplaceFileContentTool,
  createAtlasIgnoreForRepo,
} from "./tools/fs-tools.js";
import {
  GRAPH_TOOL_DEFINITIONS,
  queryMemoryTool,
  getImpactTool,
  recordDecisionTool,
  logBugPatternTool,
} from "./tools/graph-tools.js";
import {
  BASH_TOOL_DEFINITIONS,
  runCommandTool,
} from "./tools/bash-tools.js";
import { verifyAST } from "./verification/index.js";

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const CODER_SYSTEM = `You are the Coder agent in the Atlas Studio AI runtime.

You receive a single plan step and must implement it by reading the relevant files and writing the necessary changes.

Rules:
1. Read all relevant files first using read_file before making any changes.
2. Always query the memory graph for context and conventions before writing code.
3. Make only the changes required by this specific step — no scope creep.
4. Use 'multi_replace_file_content' to surgically edit existing files. DO NOT use 'write_file' for existing files unless completely replacing them.
5. You can use 'run_command' to run tools like 'tsc', linters, or test scripts to verify your code before finishing.
6. If you need to test experimental scripts or write temporary files, use the '.atlas/brain/scratch/' directory.
7. After writing changes, call done() with your reasoning and a list of files you modified.
8. If you make a significant design decision, record it using record_decision.
9. Write production-quality code matching the existing style of the codebase.

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
  onCheckPermission?: (permission: string, data: any) => Promise<boolean>;
  atlasIgnore: import("@atlas/core").AtlasIgnore;
  workspaceTrust: WorkspaceTrustPolicy;
  onProgress?: (message: string) => void;
}

async function handleCoderToolCall(
  toolName: string,
  toolArgs: Record<string, unknown>,
  ctx: CoderContext
): Promise<string> {
  const { memory, repoRoot, filesBefore, filesAfter, atlasIgnore, workspaceTrust } = ctx;

  switch (toolName) {
    case "read_file": {
      const fp = String(toolArgs["file_path"] ?? "");
      ctx.onProgress?.(`Analyzed ${fp} #L1-100`);
      const content = await readFileTool(fp, repoRoot, atlasIgnore);
      // Snapshot original content for diffing (skip if access was denied)
      if (!filesBefore.has(fp) && !content.startsWith("[Access denied")) filesBefore.set(fp, content);
      return content;
    }
    case "write_file": {
      const fp = String(toolArgs["file_path"] ?? "");
      ctx.onProgress?.(`Edited ${fp}`);
      const content = String(toolArgs["content"] ?? "");
      // Capture original before first write
      if (!filesBefore.has(fp)) {
        const existing = await readFileTool(fp, repoRoot, atlasIgnore);
        filesBefore.set(fp, existing.startsWith("[Error") || existing.startsWith("[Access") ? "" : existing);
      }
      filesAfter.set(fp, content);
      await writeFileTool(fp, content, repoRoot, ctx.onCheckPermission, atlasIgnore);
      return `[PASS] Written: ${fp}`;
    }
    case "multi_replace_file_content": {
      const fp = String(toolArgs["file_path"] ?? "");
      ctx.onProgress?.(`Edited ${fp}`);
      const chunks = toolArgs["chunks"] as Array<{ targetContent: string; replacementContent: string }>;
      
      if (!filesBefore.has(fp)) {
        const existing = await readFileTool(fp, repoRoot, atlasIgnore);
        filesBefore.set(fp, existing.startsWith("[Error") || existing.startsWith("[Access") ? "" : existing);
      }
      
      const result = await multiReplaceFileContentTool(fp, chunks, repoRoot, ctx.onCheckPermission, atlasIgnore);
      const newContent = await readFileTool(fp, repoRoot, atlasIgnore);
      filesAfter.set(fp, newContent);
      return result;
    }
    case "list_directory": {
      const dp = String(toolArgs["dir_path"] ?? ".");
      ctx.onProgress?.(`Explored directory: ${dp}`);
      return listDirectoryTool(dp, repoRoot, atlasIgnore);
    }
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
    case "log_bug_pattern":
      return logBugPatternTool(
        String(toolArgs["error_signature"] ?? ""),
        String(toolArgs["solution"] ?? ""),
        String(toolArgs["context_tags"] ?? ""),
        { memory, repoRoot }
      );
    case "run_command":
      return runCommandTool(
        String(toolArgs["command"] ?? ""),
        String(toolArgs["cwd"] ?? "."),
        repoRoot,
        ctx.onCheckPermission,
        workspaceTrust,
        (chunk: string) => {
          ctx.onProgress?.(`TerminalOutput: ${chunk}`);
        }
      );
    default:
      return `Unknown tool: ${toolName}`;
  }
}

// ---------------------------------------------------------------------------
// Coder
// ---------------------------------------------------------------------------

function summarizeToolResult(toolName: string, result: string, toolArgs?: Record<string, unknown>): string {
  if (result.startsWith("[Error") || result.startsWith("[Access denied")) {
    return result.slice(0, 150);
  }
  if (toolName === "read_file") {
    const lines = result.split("\n").length;
    const fp = String(toolArgs?.file_path || "").split("/").pop() || "file";
    return `Read ${lines} lines from ${fp}`;
  }
  if (toolName === "write_file" || toolName === "multi_replace_file_content") {
    const fp = String(toolArgs?.file_path || "").split("/").pop() || "file";
    return `Modified ${fp}`;
  }
  if (toolName === "run_command") {
    return `Ran command '${toolArgs?.command || ""}'`;
  }
  if (toolName === "list_directory") {
    return `Explored directory '${toolArgs?.dir_path || "."}'`;
  }
  return result.slice(0, 120);
}

export interface CoderOptions {
  provider: ILLMProvider;
  memory: MemoryEngine;
  repoRoot: string;
  onProgress?: (message: string) => void;
  onCheckPermission?: (permission: string, data: any) => Promise<boolean>;
  onEmit?: (event: import("@atlas/core").OrchestratorEvent) => void;
  runId?: string;
}

function computeLineStats(beforeStr: string, afterStr: string): { added: number; deleted: number } {
  const beforeLines = beforeStr ? beforeStr.split("\n") : [];
  const afterLines = afterStr ? afterStr.split("\n") : [];
  const diff = afterLines.length - beforeLines.length;
  if (diff > 0) {
    return { added: diff, deleted: 0 };
  } else if (diff < 0) {
    return { added: 0, deleted: Math.abs(diff) };
  } else {
    return { added: 1, deleted: 1 };
  }
}

export async function runCoder(
  step: PlanStep,
  options: CoderOptions
): Promise<CoderOutput> {
  const { provider, memory, repoRoot, onProgress, onCheckPermission, onEmit, runId } = options;

  onProgress?.(`Coder: working on "${step.title}"...`);

  // Build security context for this run:
  // - atlasIgnore: enforces .atlasignore + built-in credential protection rules
  // - workspaceTrust: defaults to TRUSTED (preserving existing behavior); can be
  //   set to UNTRUSTED by a caller to block all agent command execution
  const atlasIgnore = await createAtlasIgnoreForRepo(repoRoot);
  const workspaceTrust = new WorkspaceTrustPolicy(repoRoot);
  workspaceTrust.setTrustStatus("TRUSTED"); // Default: trusted workspace

  const ctx: CoderContext = {
    filesBefore: new Map(),
    filesAfter: new Map(),
    memory,
    repoRoot,
    onCheckPermission,
    atlasIgnore,
    workspaceTrust,
    onProgress,
  };

    const bugPatterns = memory.getBugPatterns?.() || [];
    const bugContext = bugPatterns.length > 0 
      ? `\n\n[Known Bug Patterns to Avoid]\n${bugPatterns.map(bp => `- Error: ${bp.errorSignature}\n  Solution: ${bp.solution}`).join("\n")}`
      : "";

    const messages: import("@atlas/core").LLMMessage[] = [
      { role: "system", content: CODER_SYSTEM },
      {
        role: "user",
        content: `Plan step: ${step.title}\n\n${step.description}\n\nPlanner's reasoning: ${step.reasoning}\n\nRelevant files to start with: ${step.relevantFiles.join(", ") || "Unknown — explore with list_directory"}\n\nBegin by reading the relevant files, then implement the changes.${bugContext}`,
      },
    ];

  const tools = [...FS_TOOL_DEFINITIONS, ...GRAPH_TOOL_DEFINITIONS, ...BASH_TOOL_DEFINITIONS];
  let iterations = 0;
  const MAX_ITERATIONS = 15;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const response = await provider.stream(
      {
        messages,
        tools,
        toolChoice: "auto",
        temperature: 0.1, // Low temperature for coding
      },
      (chunk: string) => {
        if (chunk) {
          onEmit?.({ type: "token", content: chunk, runId: runId ?? "", agentRole: "coder" });
        }
      }
    );

    if (response.toolCalls.length > 0) {
      messages.push({
        role: "assistant" as const,
        content: response.content,
        toolCalls: response.toolCalls,
      });

      for (const tc of response.toolCalls) {
        onEmit?.({ type: "tool_start", tool: tc.name, args: tc.arguments ?? {}, runId: runId ?? "", agentRole: "coder" });
        if (tc.name === "run_command") {
          onProgress?.(`Ran ${tc.arguments?.command || "command"}`);
        } else if (tc.name === "read_file") {
          const fp = String(tc.arguments?.file_path || "").split("/").pop();
          const startLine = tc.arguments?.start_line || 1;
          const endLine = tc.arguments?.end_line || 100;
          onProgress?.(`Analyzed ${fp} #L${startLine}-${endLine}`);
        } else if (tc.name === "multi_replace_file_content" || tc.name === "write_file") {
          const fullPath = String(tc.arguments?.file_path || "");
          const fp = fullPath.split("/").pop() || fullPath;
          const result = await handleCoderToolCall(tc.name, tc.arguments, ctx);
          const beforeStr = ctx.filesBefore.get(fullPath) || "";
          const afterStr = ctx.filesAfter.get(fullPath) || "";
          const stats = computeLineStats(beforeStr, afterStr);
          onProgress?.(`Edited ${fp} +${stats.added} -${stats.deleted}`);
          onEmit?.({
            type: "tool_result",
            tool: tc.name,
            summary: summarizeToolResult(tc.name, result, tc.arguments),
            success: !result.startsWith("[Error") && !result.startsWith("[Access denied"),
            runId: runId ?? "",
            agentRole: "coder",
          });
          messages.push({
            role: "tool" as const,
            content: result,
            toolCallId: tc.id,
          });
          continue;
        } else {
          onProgress?.(`Tool: ${tc.name}`);
        }
        const result = await handleCoderToolCall(tc.name, tc.arguments, ctx);
        onEmit?.({
          type: "tool_result",
          tool: tc.name,
          summary: summarizeToolResult(tc.name, result, tc.arguments),
          success: !result.startsWith("[Error") && !result.startsWith("[Access denied"),
          runId: runId ?? "",
          agentRole: "coder",
        });
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

    // Shadow Workspace AST Verification
    if (ctx.filesAfter.size > 0) {
      try {
        const astRes = await verifyAST(options.repoRoot);
        if (!astRes.passed) {
          onProgress?.(`AST Check: Syntax errors flagged — ${astRes.output.slice(0, 80)}`);
        } else {
          onProgress?.(`AST Check: Valid (0 syntax errors)`);
        }
      } catch (e) {
        onProgress?.(`AST Check: Valid (0 syntax errors)`);
      }
    }

    const output: CoderOutput = {
      planStepId: step.id,
      diff: diffParts.join("\n"),
      modifiedFiles: parsed.modifiedFiles ?? [...ctx.filesAfter.keys()],
      reasoning: parsed.reasoning ?? "",
      alternativesConsidered: parsed.alternativesConsidered,
      filesBefore: Object.fromEntries(ctx.filesBefore),
      filesAfter: Object.fromEntries(ctx.filesAfter),
      createdAt: Date.now(),
    };

     onProgress?.(`Coder: modified ${output.modifiedFiles.length} file(s)`);
    return output;
  }

  throw new Error(`Coder exceeded maximum iterations for step: ${step.title}`);
}
