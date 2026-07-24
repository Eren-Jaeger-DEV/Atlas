/**
 * AtlasParallel — Shared Types
 *
 * Defines the data structures shared between WorkerPool, ParallelPlanner,
 * ParallelMerger, and the IPC layer.
 */

export type ParallelWorkerStatus =
  | "pending"
  | "planning"
  | "coding"
  | "testing"
  | "reviewing"
  | "done"
  | "error"
  | "cancelled";

export interface ParallelSubTask {
  /** Unique ID for this sub-task */
  id: string;
  /** Short human-readable title for the dashboard */
  title: string;
  /** Full task description passed to the Orchestrator */
  goal: string;
  /** Estimated file paths this task will touch (for conflict pre-detection) */
  estimatedFiles: string[];
  /** IDs of sub-tasks that must complete before this one starts */
  deps: string[];
}

export interface ParallelPlan {
  id: string;
  overallGoal: string;
  tasks: ParallelSubTask[];
  createdAt: string;
}

export interface WorkerState {
  id: string;
  task: ParallelSubTask;
  status: ParallelWorkerStatus;
  log: string[];
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  output?: any;
}

export interface ParallelEvent {
  workerId: string;
  type: "status_change" | "log" | "done" | "error";
  status?: ParallelWorkerStatus;
  message?: string;
  output?: any;
}
