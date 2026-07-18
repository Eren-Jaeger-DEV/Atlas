/**
 * @atlas/agents — Public API
 */

// LLM providers
export { OpenAIProvider } from "./llm/openai.js";
export { AnthropicProvider } from "./llm/anthropic.js";
export { GeminiProvider } from "./llm/gemini.js";
export {
  createProvider,
  detectProviderFromEnv,
  getAvailableProviders,
} from "./llm/provider.js";

// Agents
export { runPlanner } from "./planner.js";
export type { PlannerOptions } from "./planner.js";
export { runCoder } from "./coder.js";
export type { CoderOptions } from "./coder.js";
export { runTester } from "./tester.js";
export type { TesterOptions } from "./tester.js";
export { runReviewer } from "./reviewer.js";
export type { ReviewerOptions } from "./reviewer.js";

// Orchestrator
export { Orchestrator } from "./orchestrator.js";
export type { OrchestratorConfig } from "./orchestrator.js";

// Tools
export {
  FS_TOOL_DEFINITIONS,
  readFileTool,
  writeFileTool,
  listDirectoryTool,
} from "./tools/fs-tools.js";
export {
  GRAPH_TOOL_DEFINITIONS,
  queryMemoryTool,
  getImpactTool,
  recordDecisionTool,
} from "./tools/graph-tools.js";
export {
  SHELL_TOOL_DEFINITIONS,
  runTestsTool,
  runCommandTool,
} from "./tools/shell-tools.js";
