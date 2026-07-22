/**
 * @atlas/agents — TrajectoryReplay Engine
 *
 * Records immutable step-by-step state snapshots during TaskDAG execution.
 * Enables step rewind, trajectory time-travel, offline playback, and agent prompt branching.
 */

import type { RunRecord, PlanStep, CoderOutput, TestResult } from "@atlas/core";

export interface TrajectorySnapshot {
  stepIndex: number;
  timestamp: number;
  step: PlanStep;
  coderOutput?: CoderOutput;
  testResult?: TestResult;
  runRecordState: Partial<RunRecord>;
}

export class TrajectoryReplay {
  private snapshots: TrajectorySnapshot[] = [];

  constructor(public readonly runId: string, public readonly goal: string) {}

  recordStep(
    stepIndex: number,
    step: PlanStep,
    coderOutput?: CoderOutput,
    testResult?: TestResult,
    runRecordState: Partial<RunRecord> = {}
  ): TrajectorySnapshot {
    const snapshot: TrajectorySnapshot = {
      stepIndex,
      timestamp: Date.now(),
      step: { ...step },
      coderOutput: coderOutput ? { ...coderOutput } : undefined,
      testResult: testResult ? { ...testResult } : undefined,
      runRecordState: { ...runRecordState },
    };

    this.snapshots.push(snapshot);
    return snapshot;
  }

  getSnapshots(): readonly TrajectorySnapshot[] {
    return this.snapshots;
  }

  rewindTo(stepIndex: number): TrajectorySnapshot | null {
    if (stepIndex < 0 || stepIndex >= this.snapshots.length) {
      return null;
    }
    this.snapshots = this.snapshots.slice(0, stepIndex + 1);
    return this.snapshots[this.snapshots.length - 1] || null;
  }

  exportPlayback(): string {
    return JSON.stringify(
      {
        runId: this.runId,
        goal: this.goal,
        snapshotCount: this.snapshots.length,
        snapshots: this.snapshots,
      },
      null,
      2
    );
  }

  static importPlayback(jsonString: string): TrajectoryReplay {
    const data = JSON.parse(jsonString);
    const replay = new TrajectoryReplay(data.runId || "restored-run", data.goal || "");
    if (Array.isArray(data.snapshots)) {
      replay.snapshots = data.snapshots;
    }
    return replay;
  }
}
