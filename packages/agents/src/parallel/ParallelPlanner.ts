/**
 * AtlasParallel — ParallelPlanner
 *
 * Accepts a high-level goal and uses an LLM to decompose it into N independent
 * sub-tasks. Tasks that would touch the same file are automatically serialized
 * (via dep edges). Tasks that are independent run fully in parallel.
 *
 * Returns a ParallelPlan with tasks and their dependency graph.
 */

import { randomUUID } from "node:crypto";
import type { ILLMProvider } from "@atlas/core";
import type { ParallelPlan, ParallelSubTask } from "./types.js";

export interface ParallelPlannerConfig {
  provider: ILLMProvider;
  repoRoot: string;
}

const DECOMPOSE_SYSTEM_PROMPT = `You are an expert software engineering planner.
Your job is to decompose a complex coding goal into a set of INDEPENDENT sub-tasks that can be worked on in parallel.

Rules:
1. Each sub-task must be atomic and clearly scoped to specific files or modules.
2. If two sub-tasks would touch the same file, add a dependency (one must run before the other).
3. Output ONLY a valid JSON array — no markdown, no explanation.
4. Keep the number of sub-tasks between 2 and 6. Do not over-split.

Output format:
[
  {
    "id": "task-1",
    "title": "Short title",
    "goal": "Detailed description of exactly what to implement",
    "estimatedFiles": ["path/to/file.ts"],
    "deps": []
  }
]`;

export class ParallelPlanner {
  private config: ParallelPlannerConfig;

  constructor(config: ParallelPlannerConfig) {
    this.config = config;
  }

  async decompose(overallGoal: string): Promise<ParallelPlan> {
    const planId = randomUUID();

    let rawTasks: any[] = [];
    try {
      const response = await this.config.provider.complete({
        messages: [
          { role: "system", content: DECOMPOSE_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Repository root: ${this.config.repoRoot}\n\nGoal: ${overallGoal}\n\nDecompose this into parallel sub-tasks:`
          }
        ]
      });

      const text = typeof response === "string" ? response : response?.content ?? "";
      // Extract JSON array from response (handles markdown fences if any)
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        rawTasks = JSON.parse(match[0]);
      }
    } catch (err) {
      console.error("[ParallelPlanner] LLM decomposition failed, creating single task:", err);
    }

    // Fallback: single task covering the full goal
    if (!rawTasks.length) {
      rawTasks = [{
        id: "task-1",
        title: overallGoal.slice(0, 60),
        goal: overallGoal,
        estimatedFiles: [],
        deps: []
      }];
    }

    // Normalize and assign fresh IDs
    const tasks: ParallelSubTask[] = rawTasks.map((t: any, idx: number) => ({
      id: t.id ?? `task-${idx + 1}`,
      title: t.title ?? `Sub-task ${idx + 1}`,
      goal: t.goal ?? overallGoal,
      estimatedFiles: Array.isArray(t.estimatedFiles) ? t.estimatedFiles : [],
      deps: Array.isArray(t.deps) ? t.deps : []
    }));

    // Auto-detect file conflicts and add serialization deps
    const fileOwners = new Map<string, string>(); // file -> first task id
    for (const task of tasks) {
      for (const file of task.estimatedFiles) {
        if (fileOwners.has(file)) {
          const ownerId = fileOwners.get(file)!;
          if (!task.deps.includes(ownerId) && task.id !== ownerId) {
            task.deps.push(ownerId);
          }
        } else {
          fileOwners.set(file, task.id);
        }
      }
    }

    return {
      id: planId,
      overallGoal,
      tasks,
      createdAt: new Date().toISOString()
    };
  }
}
