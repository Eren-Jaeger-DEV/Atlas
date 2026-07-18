/**
 * @atlas/core — Public API
 *
 * Single entry point for all consumers of the core package.
 */

// Types
export type { GraphNode, GraphEdge, NodeKind, EdgeKind } from "./types/node.js";
export type {
  AgentState,
  Plan,
  PlanStep,
  CoderOutput,
  TestResult,
  TestStatus,
  ReviewResult,
  ReviewFinding,
  RunRecord,
  OrchestratorEvent,
  RiskLevel as AgentRiskLevel,
} from "./types/agent.js";
export type {
  ImpactResult,
  AffectedFile,
  RiskLevel,
} from "./types/impact.js";
export type {
  ILLMProvider,
  LLMMessage,
  LLMRole,
  LLMToolDefinition,
  LLMToolCall,
  LLMRequest,
  LLMResponse,
  LLMProviderConfig,
  LLMProviderName,
} from "./types/llm.js";

// Plugin API
export type {
  IExtensionAPI,
  IAtlasPlugin,
  IEditorState,
  IMemoryQuery,
  IImpactQuery,
  IAgentBridge,
  IUIRegistry,
  IPanelRegistration,
  ICommandRegistration,
} from "./plugin/extension-api.js";
