/**
 * @atlas/agents — Public API
 */

export { Orchestrator } from "./orchestrator.js";
export { runPlanner } from "./planner.js";
export { runCoder } from "./coder.js";
export { runReviewer } from "./reviewer.js";
export { runTester } from "./tester.js";

export {
  createProvider,
  detectProviderFromEnv,
  getAvailableProviders,
} from "./llm/provider.js";

export { ProviderRouter } from "./llm/ProviderRouter.js";
export { MultiRegionApiRouter, type RegionCluster, type RegionEndpoint } from "./llm/MultiRegionApiRouter.js";
export { SmartModelClassifier, type ModelTier, type ClassificationResult } from "./llm/SmartModelClassifier.js";
export { ContextEngine, type ContextOptions, type AssembledContext } from "./context/ContextEngine.js";
export { TaskDAG } from "./dag/TaskDAG.js";
export { TrajectoryReplay, type TrajectorySnapshot } from "./dag/TrajectoryReplay.js";
export { BrainManager, type BrainContext } from "./brain.js";
export { createLSPDiagnosticTool, createLSPDefinitionTool } from "./tools/lsp-tools.js";
export { VisualVerifier, type VisualSnapshot, type VisualVerificationResult } from "./verification/VisualVerifier.js";
export { AXTreeExtractor, type AXNode, type AXTreeSummary } from "./browser/AXTreeExtractor.js";
export { VisionGrounding, type GroundedElement } from "./browser/VisionGrounding.js";
export { BrowserEngine, type NetworkLogEntry } from "./browser/BrowserEngine.js";
export { getBrowserToolDefinitions, executeBrowserTool, type AgentToolDefinition } from "./browser/BrowserTools.js";
export { BrowserSubagent, type BrowserSubagentOptions, type BrowserSubagentResult } from "./browser/BrowserSubagent.js";

// AtlasParallel — multi-agent concurrent workflow
export { WorkerPool, type WorkerPoolConfig } from "./parallel/WorkerPool.js";
export { ParallelPlanner, type ParallelPlannerConfig } from "./parallel/ParallelPlanner.js";
export { ParallelMerger, type MergeReport, type FileEdit, type MergeConflict } from "./parallel/ParallelMerger.js";
export { SelfHealingVerifier, type VerificationResult } from "./parallel/SelfHealingVerifier.js";
export { SelfHealingLoop, type SelfHealingResult, type HealingIteration } from "./parallel/SelfHealingLoop.js";
export { WorkflowSkillCreator } from "./parallel/WorkflowSkillCreator.js";
export { ExecutionSubagent, type ExecutionSubagentConfig, type ExecutionSubagentResult } from "./subagents/ExecutionSubagent.js";
export type { ParallelPlan, ParallelSubTask, WorkerState, ParallelEvent, ParallelWorkerStatus } from "./parallel/types.js";

// Atlas Horizon Spec-Driven Swarm Intelligence
export { HorizonEngine, horizonEngine } from "./horizon/HorizonEngine.js";
export type { HorizonSpec, HorizonWave, HorizonTask, HorizonStage, HorizonTaskStatus } from "./horizon/HorizonTypes.js";

