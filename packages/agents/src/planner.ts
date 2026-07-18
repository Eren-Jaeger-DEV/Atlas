/**
 * @atlas/agents — Planner Agent
 *
 * Takes a goal string and knowledge graph context, produces a Plan.
 * Research mode = Planner queries graph tools before decomposing.
 *
 * The Planner is intentionally simple: it asks the LLM to decompose
 * the goal, armed with graph context. The plan steps are stored in
 * the memory graph so every Coder output is traceable back to the
 * step that requested it.
 */

import { sha256 } from "js-sha256";
import type { ILLMProvider, Plan, PlanStep } from "@atlas/core";
import type { MemoryEngine } from "@atlas/graph";
import {
  GRAPH_TOOL_DEFINITIONS,
  queryMemoryTool,
  getImpactTool,
} from "./tools/graph-tools.js";
import { FS_TOOL_DEFINITIONS, readFileTool, listDirectoryTool } from "./tools/fs-tools.js";

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const PLANNER_SYSTEM = `You are the Planner agent in the Atlas Studio AI runtime.

Your job is to decompose a user's coding goal into a sequence of clear, atomic plan steps that a Coder agent can execute one at a time.

Rules:
1. ALWAYS query the knowledge graph first (query_memory, get_impact) before producing the plan.
2. ALWAYS list the relevant directories to understand the codebase structure.
3. Each plan step must be a single, self-contained change a developer could make in one sitting.
4. Include the specific files each step will touch in relevantFiles.
5. Write your reasoning explicitly — it will be stored permanently in the knowledge graph.
6. Keep the plan to 3-7 steps for most goals. Resist scope creep.

When you are ready to output the plan, respond with a JSON object in this exact format:
{
  "steps": [
    {
      "title": "Short title",
      "description": "Detailed description of what to do",
      "relevantFiles": ["relative/path/to/file.ts"],
      "reasoning": "Why this step is needed and what approach to take"
    }
  ],
  "planningReasoning": "Overall reasoning for the plan structure"
}`;

// ---------------------------------------------------------------------------
// Tool call handler
// ---------------------------------------------------------------------------

async function handlePlannerToolCall(
  toolName: string,
  toolArgs: Record<string, unknown>,
  memory: MemoryEngine,
  repoRoot: string
): Promise<string> {
  switch (toolName) {
    case "query_memory":
      return queryMemoryTool(String(toolArgs["query"] ?? ""), { memory, repoRoot });
    case "get_impact":
      return getImpactTool(
        String(toolArgs["file_path"] ?? ""),
        toolArgs["symbol_name"] ? String(toolArgs["symbol_name"]) : undefined,
        { memory, repoRoot }
      );
    case "read_file":
      return readFileTool(String(toolArgs["file_path"] ?? ""), repoRoot);
    case "list_directory":
      return listDirectoryTool(String(toolArgs["dir_path"] ?? "."), repoRoot);
    default:
      return `Unknown tool: ${toolName}`;
  }
}

// ---------------------------------------------------------------------------
// Planner
// ---------------------------------------------------------------------------

export interface PlannerOptions {
  provider: ILLMProvider;
  memory: MemoryEngine;
  repoRoot: string;
  onProgress?: (message: string) => void;
}

export async function runPlanner(
  goal: string,
  options: PlannerOptions
): Promise<Plan> {
  const { provider, memory, repoRoot, onProgress } = options;

  onProgress?.("🔍 Planner: researching codebase...");

  const messages: import("@atlas/core").LLMMessage[] = [
    { role: "system", content: PLANNER_SYSTEM },
    {
      role: "user",
      content: `Goal: ${goal}\n\nStart by querying the knowledge graph and understanding the codebase, then produce your plan.`,
    },
  ];

  const tools = [...GRAPH_TOOL_DEFINITIONS, ...FS_TOOL_DEFINITIONS];

  // Agentic loop — Planner can call tools multiple times before committing the plan
  let iterations = 0;
  const MAX_ITERATIONS = 10;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const response = await provider.complete({
      messages,
      tools,
      toolChoice: "auto",
      temperature: 0.2,
    });

    // Check if the model made tool calls
    if (response.toolCalls.length > 0) {
      // Append assistant message with tool calls
      messages.push({
        role: "assistant" as const,
        content: response.content,
        toolCalls: response.toolCalls,
      });

      // Execute each tool and append results
      for (const tc of response.toolCalls) {
        onProgress?.(`🔧 Planner tool: ${tc.name}(${JSON.stringify(tc.arguments).slice(0, 60)}...)`);
        const result = await handlePlannerToolCall(
          tc.name,
          tc.arguments,
          memory,
          repoRoot
        );
        messages.push({
          role: "tool" as const,
          content: result,
          toolCallId: tc.id,
        });
      }
      continue;
    }

    // No tool calls — extract the plan from the response
    onProgress?.("📋 Planner: producing plan...");

    // Parse JSON from response content
    let parsed: { steps: any[]; planningReasoning: string };
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in planner response");
      parsed = JSON.parse(jsonMatch[0]);
    } catch (err) {
      throw new Error(`Planner produced invalid JSON: ${err}`);
    }

    const planId = sha256(`plan:${goal}:${Date.now()}`).slice(0, 24);
    const steps: PlanStep[] = parsed.steps.map(
      (s: any, idx: number): PlanStep => ({
        id: sha256(`step:${planId}:${idx}`).slice(0, 24),
        title: s.title ?? `Step ${idx + 1}`,
        description: s.description ?? "",
        relevantFiles: Array.isArray(s.relevantFiles) ? s.relevantFiles : [],
        reasoning: s.reasoning ?? "",
        order: idx,
      })
    );

    const plan: Plan = {
      id: planId,
      goal,
      steps,
      planningReasoning: parsed.planningReasoning ?? "",
      createdAt: Date.now(),
    };

    onProgress?.(`✅ Planner: ${steps.length} step plan ready`);
    return plan;
  }

  throw new Error("Planner exceeded maximum iterations without producing a plan");
}
