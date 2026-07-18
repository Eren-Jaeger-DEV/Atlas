/**
 * @atlas/core — Agent Runtime Types
 *
 * Types shared between the agent runtime (packages/agents) and any consumer
 * (CLI, editor plugin). The editor core NEVER imports these directly.
 */

// ---------------------------------------------------------------------------
// Orchestrator state machine
// ---------------------------------------------------------------------------

export type AgentState =
  | "IDLE"
  | "PLANNING"
  | "CODING"
  | "TESTING"
  | "REVIEWING"
  | "AWAITING_HUMAN" // orchestrator paused — human input required
  | "DONE"
  | "ERROR";

// ---------------------------------------------------------------------------
// Planner output
// ---------------------------------------------------------------------------

export interface PlanStep {
  /** Stable UUID */
  id: string;
  /** Short title for display */
  title: string;
  /** Full description of what the Coder should do for this step */
  description: string;
  /** Files the Coder should read before acting on this step */
  relevantFiles: string[];
  /** Planner's reasoning that produced this step (stored in memory graph) */
  reasoning: string;
  /** Zero-indexed position within the plan */
  order: number;
}

export interface Plan {
  id: string;
  goal: string;
  steps: PlanStep[];
  /** Raw Planner reasoning before steps were extracted */
  planningReasoning: string;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Coder output
// ---------------------------------------------------------------------------

export interface CoderOutput {
  /** The plan step this output satisfies */
  planStepId: string;
  /** Unified diff format — apply with `patch` or `git apply` */
  diff: string;
  /** Files that were modified by this diff */
  modifiedFiles: string[];
  /** Coder's reasoning for the chosen implementation approach */
  reasoning: string;
  /** Alternatives considered and rejected */
  alternativesConsidered?: string[];
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Tester output
// ---------------------------------------------------------------------------

export type TestStatus = "passed" | "failed" | "errored" | "skipped";

export interface TestResult {
  planStepId: string;
  status: TestStatus;
  /** Total tests run */
  total: number;
  passed: number;
  failed: number;
  /** Raw stdout/stderr from the test runner */
  output: string;
  /** Specific test failures to feed back to the Coder */
  failures: Array<{
    testName: string;
    message: string;
    stackTrace?: string;
  }>;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Reviewer output
// ---------------------------------------------------------------------------

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface ReviewFinding {
  kind:
    | "security"
    | "breaking_change"
    | "convention_violation"
    | "performance"
    | "test_coverage"
    | "documentation"
    | "info";
  riskLevel: RiskLevel;
  title: string;
  description: string;
  /** File and line range this finding applies to */
  location?: {
    filePath: string;
    startLine: number;
    endLine: number;
  };
}

export interface ReviewResult {
  planStepId: string;
  overallRisk: RiskLevel;
  findings: ReviewFinding[];
  /** Reviewer's summary of the change */
  summary: string;
  /** Whether the orchestrator should interrupt the human before proceeding */
  requiresHumanReview: boolean;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Full run record (stored in memory graph)
// ---------------------------------------------------------------------------

export interface RunRecord {
  id: string;
  goal: string;
  plan: Plan;
  coderOutputs: CoderOutput[];
  testResults: TestResult[];
  reviewResult?: ReviewResult;
  finalState: AgentState;
  /** Git commit hash of the resulting change (if committed) */
  commitHash?: string;
  startedAt: number;
  completedAt?: number;
}

// ---------------------------------------------------------------------------
// Orchestrator events (streamed to CLI / editor)
// ---------------------------------------------------------------------------

export type OrchestratorEvent =
  | { type: "state_change"; state: AgentState; runId: string }
  | { type: "plan_ready"; plan: Plan; runId: string }
  | { type: "step_start"; step: PlanStep; runId: string }
  | { type: "coder_output"; output: CoderOutput; runId: string }
  | { type: "test_result"; result: TestResult; runId: string }
  | { type: "review_result"; result: ReviewResult; runId: string }
  | { type: "awaiting_human"; reason: string; runId: string }
  | { type: "done"; record: RunRecord; runId: string }
  | { type: "error"; message: string; runId: string };
