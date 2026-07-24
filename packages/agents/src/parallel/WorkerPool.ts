/**
 * AtlasParallel — WorkerPool
 *
 * Manages a pool of concurrent Orchestrator instances, each running an
 * independent sub-task from a ParallelPlan.
 *
 * Architecture:
 * - Uses async Promise.all for concurrency (LLM-bound tasks are I/O-bound,
 *   not CPU-bound, so async concurrency is as effective as Worker Threads
 *   without the serialization complexity).
 * - Dependency graph is respected: tasks with deps wait for their deps to
 *   complete before starting.
 * - Real-time events are streamed via onEvent callback.
 * - Workers can be individually cancelled.
 */

import { randomUUID } from "node:crypto";
import { Orchestrator, type OrchestratorConfig } from "../orchestrator.js";
import { SelfHealingVerifier } from "./SelfHealingVerifier.js";
import type { WorkerState, ParallelPlan, ParallelSubTask, ParallelEvent, ParallelWorkerStatus } from "./types.js";

export interface WorkerPoolConfig {
  /** Shared orchestrator config (provider + memory + repoRoot) */
  orchestratorConfig: Omit<OrchestratorConfig, "onEvent">;
  /** Maximum concurrent workers (default: 4) */
  maxConcurrency?: number;
  /** Called on any state change or log update */
  onEvent: (event: ParallelEvent) => void;
}

export class WorkerPool {
  private config: WorkerPoolConfig;
  private workers = new Map<string, WorkerState>();
  private cancelledIds = new Set<string>();
  private maxConcurrency: number;

  constructor(config: WorkerPoolConfig) {
    this.config = config;
    this.maxConcurrency = config.maxConcurrency ?? 4;
  }

  /** Returns a snapshot of all workers */
  list(): WorkerState[] {
    return Array.from(this.workers.values());
  }

  /** Cancels a running worker by ID */
  cancel(workerId: string): boolean {
    if (!this.workers.has(workerId)) return false;
    this.cancelledIds.add(workerId);
    this.updateWorker(workerId, { status: "cancelled", finishedAt: new Date().toISOString() });
    return true;
  }

  /**
   * Execute a full ParallelPlan, respecting dependency edges.
   * Returns when all tasks are complete, errored, or cancelled.
   */
  async executePlan(plan: ParallelPlan): Promise<Map<string, WorkerState>> {
    // Initialize worker states
    for (const task of plan.tasks) {
      const workerId = randomUUID();
      this.workers.set(workerId, {
        id: workerId,
        task: { ...task }, // attach original task data; we use workerId as worker key
        status: "pending",
        log: []
      });
    }

    // Build task id → worker id mapping
    const taskIdToWorkerId = new Map<string, string>();
    for (const [wid, w] of this.workers) {
      taskIdToWorkerId.set(w.task.id, wid);
    }

    // Topological execution with concurrency limit
    const completed = new Set<string>(); // completed task IDs
    const running = new Set<string>();   // worker IDs currently running

    const isReady = (task: ParallelSubTask): boolean => {
      return task.deps.every(depId => {
        const depWorkerId = taskIdToWorkerId.get(depId);
        if (!depWorkerId) return true; // unknown dep = ignore
        return completed.has(depId);
      });
    };

    const pendingTasks = [...plan.tasks];

    const runWorker = async (task: ParallelSubTask, workerId: string) => {
      if (this.cancelledIds.has(workerId)) return;
      running.add(workerId);
      this.updateWorker(workerId, { status: "planning", startedAt: new Date().toISOString() });

      try {
        const orchestrator = new Orchestrator({
          ...this.config.orchestratorConfig,
          onEvent: (event) => {
            if (this.cancelledIds.has(workerId)) return;
            // Map orchestrator state → worker status
            const statusMap: Record<string, ParallelWorkerStatus> = {
              PLANNING: "planning", CODING: "coding",
              TESTING: "testing", REVIEWING: "reviewing",
              DONE: "done", ERROR: "error"
            };
            const newStatus = event.type === "state_change" && event.state
              ? (statusMap[event.state] ?? "coding")
              : undefined;

            if (newStatus) {
              this.updateWorker(workerId, { status: newStatus });
            }

            // Forward log messages
            const msg = event.type === "coder_output"
              ? `Modified ${(event as any).output?.modifiedFiles?.length || 0} files.`
              : event.type === "step_start"
              ? `Working on: ${(event as any).step?.title || ""}`
              : event.type === "test_result"
              ? `Test status: ${(event as any).result?.status || ""}`
              : undefined;

            if (msg) {
              const w = this.workers.get(workerId);
              if (w) {
                w.log.push(msg);
                if (w.log.length > 500) w.log.shift(); // cap log size
              }
              this.config.onEvent({ workerId, type: "log", message: msg });
            }
          }
        });

        if (this.cancelledIds.has(workerId)) return;

        const result: any = await orchestrator.run(task.goal);
        const editedFiles: string[] = result?.coderOutputs?.flatMap((c: any) => c.modifiedFiles ?? []) ?? task.estimatedFiles ?? [];

        // Self-Healing Tri-Surface Verification
        this.updateWorker(workerId, { status: "testing" });
        const verifier = new SelfHealingVerifier({
          repoRoot: this.config.orchestratorConfig.repoRoot,
          editedFiles
        });

        const verifyResult = await verifier.runSelfHealingLoop(
          editedFiles,
          async (errorFeedback) => {
            this.updateWorker(workerId, { status: "coding" });
            const w = this.workers.get(workerId);
            w?.log.push(`[SelfHealing] Repair prompt: ${errorFeedback.slice(0, 150)}...`);
            await orchestrator.run(`VERIFICATION REPAIR PROMPT:\n${errorFeedback}\nFix the code cleanly.`);
          }
        );

        if (!verifyResult.passed) {
          this.updateWorker(workerId, {
            status: "error",
            finishedAt: new Date().toISOString(),
            error: verifyResult.errorSummary ?? "Tri-surface verification failed"
          });
          this.config.onEvent({ workerId, type: "error", status: "error", message: verifyResult.errorSummary });
          completed.add(task.id);
          return;
        }

        this.updateWorker(workerId, { status: "done", finishedAt: new Date().toISOString(), output: result });
        this.config.onEvent({ workerId, type: "done", status: "done", output: result });
        completed.add(task.id);
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        this.updateWorker(workerId, { status: "error", finishedAt: new Date().toISOString(), error: msg });
        this.config.onEvent({ workerId, type: "error", status: "error", message: msg });
        completed.add(task.id); // mark done even on error so deps can unblock
      } finally {
        running.delete(workerId);
      }
    };

    // Scheduler loop
    while (pendingTasks.length > 0 || running.size > 0) {
      // Find tasks that are ready and not yet started
      const startable = pendingTasks.filter(t => {
        const wid = taskIdToWorkerId.get(t.id)!;
        return isReady(t) && !this.cancelledIds.has(wid);
      });

      // Launch up to maxConcurrency workers
      const slotsAvailable = this.maxConcurrency - running.size;
      const toStart = startable.slice(0, slotsAvailable);

      for (const task of toStart) {
        const workerId = taskIdToWorkerId.get(task.id)!;
        pendingTasks.splice(pendingTasks.indexOf(task), 1);
        runWorker(task, workerId); // do NOT await — run concurrently
      }

      if (running.size === 0 && toStart.length === 0) break; // stuck on cancelled deps

      // Yield to event loop
      await new Promise<void>(r => setTimeout(r, 100));
    }

    return this.workers;
  }

  /** Spawn a single ad-hoc worker outside of a plan */
  async spawnSingle(goal: string): Promise<string> {
    const workerId = randomUUID();
    const task: ParallelSubTask = {
      id: workerId,
      title: goal.slice(0, 60),
      goal,
      estimatedFiles: [],
      deps: []
    };

    this.workers.set(workerId, { id: workerId, task, status: "pending", log: [] });

    const plan: ParallelPlan = {
      id: randomUUID(),
      overallGoal: goal,
      tasks: [task],
      createdAt: new Date().toISOString()
    };

    this.executePlan(plan).catch(console.error); // fire and forget
    return workerId;
  }

  private updateWorker(workerId: string, updates: Partial<WorkerState>) {
    const w = this.workers.get(workerId);
    if (!w) return;
    Object.assign(w, updates);
    this.config.onEvent({
      workerId,
      type: "status_change",
      status: w.status,
      message: updates.error
    });
  }
}
