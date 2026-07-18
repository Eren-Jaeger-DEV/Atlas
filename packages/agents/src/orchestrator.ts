/**
 * @atlas/agents — Orchestrator
 *
 * The state machine sequencing Planner → Coder → Tester → Reviewer.
 * Intentionally simple and legible — a 4-node state machine you can debug.
 *
 * Spec principle: "A 4-node state machine you can debug beats an 11-agent
 * mesh you can't."
 *
 * State transitions:
 *   IDLE → PLANNING (goal received)
 *   PLANNING → CODING (plan ready)
 *   CODING → TESTING (coder output ready)
 *   TESTING → CODING (tests failed, retry)
 *   TESTING → REVIEWING (tests passed)
 *   REVIEWING → AWAITING_HUMAN (reviewer flags high risk)
 *   REVIEWING → DONE (reviewer approves)
 *   AWAITING_HUMAN → DONE (human approves)
 *   * → ERROR (any unrecoverable failure)
 */

import { sha256 } from "js-sha256";
import type {
  ILLMProvider,
  Plan,
  CoderOutput,
  TestResult,
  ReviewResult,
  RunRecord,
  OrchestratorEvent,
  AgentState,
} from "@atlas/core";
import type { MemoryEngine } from "@atlas/graph";
import { runPlanner } from "./planner.js";
import { runCoder } from "./coder.js";
import { runTester } from "./tester.js";
import { runReviewer } from "./reviewer.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface OrchestratorConfig {
  provider: ILLMProvider;
  memory: MemoryEngine;
  repoRoot: string;
  /** Max times the Coder retries after test failure before giving up */
  maxCoderRetries?: number;
  /** Event handler for streaming progress to CLI / editor */
  onEvent: (event: OrchestratorEvent) => void;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export class Orchestrator {
  private config: OrchestratorConfig;
  private maxCoderRetries: number;

  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.maxCoderRetries = config.maxCoderRetries ?? 3;
  }

  private emit(event: OrchestratorEvent) {
    this.config.onEvent(event);
  }

  private progress(message: string) {
    // Emit as console-friendly progress (used by CLI)
    process.stdout.write(message + "\n");
  }

  async run(goal: string): Promise<RunRecord> {
    const runId = sha256(`run:${goal}:${Date.now()}`).slice(0, 24);
    const startedAt = Date.now();

    const coderOutputs: CoderOutput[] = [];
    const testResults: TestResult[] = [];
    let plan: Plan | undefined;
    let reviewResult: ReviewResult | undefined;
    let finalState: AgentState = "ERROR";

    const commonOpts = {
      provider: this.config.provider,
      memory: this.config.memory,
      repoRoot: this.config.repoRoot,
      onProgress: (msg: string) => this.progress(msg),
    };

    try {
      // ─── PLANNING ───────────────────────────────────────────────────────
      this.emit({ type: "state_change", state: "PLANNING", runId });

      plan = await runPlanner(goal, commonOpts);
      this.emit({ type: "plan_ready", plan, runId });

      // ─── CODING + TESTING (per step) ────────────────────────────────────
      this.emit({ type: "state_change", state: "CODING", runId });

      for (const step of plan.steps) {
        this.emit({ type: "step_start", step, runId });

        let coderOutput: CoderOutput | undefined;
        let testResult: TestResult | undefined;
        let retries = 0;

        // Coder → Tester loop with retry on failure
        while (retries <= this.maxCoderRetries) {
          // Code the step (pass prior test failure context on retries)
          coderOutput = await runCoder(step, {
            ...commonOpts,
            // On retry, inject failure context into the system context
            // via the memory engine's query (Coder reads it via query_memory)
          });
          this.emit({ type: "coder_output", output: coderOutput, runId });
          coderOutputs.push(coderOutput);

          // Test the step
          this.emit({ type: "state_change", state: "TESTING", runId });
          testResult = await runTester(step, {
            repoRoot: this.config.repoRoot,
            onProgress: (msg: string) => this.progress(msg),
          });
          this.emit({ type: "test_result", result: testResult, runId });
          testResults.push(testResult);

          if (testResult.status === "passed") break;

          retries++;
          if (retries <= this.maxCoderRetries) {
            this.progress(
              `⚠️  Tests failed — retrying Coder (attempt ${retries}/${this.maxCoderRetries})...`
            );
            this.emit({ type: "state_change", state: "CODING", runId });

            // Record test failures in memory so Coder can query them
            this.config.memory.recordDecision({
              id: sha256(`test-failure:${step.id}:${retries}`).slice(0, 24),
              title: `Test failure: ${step.title} (retry ${retries})`,
              description: `Tests failed for step "${step.title}" on attempt ${retries}`,
              rationale: testResult.failures
                .map((f) => `${f.testName}: ${f.message}`)
                .join("\n"),
            });
          } else {
            this.progress(
              `❌ Tests still failing after ${this.maxCoderRetries} retries — proceeding to review`
            );
          }
        }
      }

      // ─── REVIEWING ──────────────────────────────────────────────────────
      this.emit({ type: "state_change", state: "REVIEWING", runId });

      const lastStep = plan.steps.at(-1);
      const lastCoderOutput = coderOutputs.at(-1);

      if (lastStep && lastCoderOutput) {
        reviewResult = await runReviewer(lastStep, lastCoderOutput, commonOpts);
        this.emit({ type: "review_result", result: reviewResult, runId });

        if (reviewResult.requiresHumanReview) {
          this.emit({
            type: "awaiting_human",
            reason: `Reviewer flagged ${reviewResult.overallRisk} risk: ${reviewResult.summary.slice(0, 200)}`,
            runId,
          });
          this.emit({ type: "state_change", state: "AWAITING_HUMAN", runId });
          finalState = "AWAITING_HUMAN";
        } else {
          finalState = "DONE";
        }
      } else {
        finalState = "DONE";
      }
    } catch (err) {
      finalState = "ERROR";
      this.emit({
        type: "error",
        message: err instanceof Error ? err.message : String(err),
        runId,
      });
    }

    const record: RunRecord = {
      id: runId,
      goal,
      plan: plan!,
      coderOutputs,
      testResults,
      reviewResult,
      finalState,
      startedAt,
      completedAt: Date.now(),
    };

    // Persist run to memory graph (AI Timeline)
    this.config.memory.saveRun(record as unknown as Record<string, unknown>);

    this.emit({ type: "state_change", state: finalState, runId });
    if (finalState === "DONE" || finalState === "AWAITING_HUMAN") {
      this.emit({ type: "done", record, runId });
    }

    return record;
  }
}
