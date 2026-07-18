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
export type { ExtensionPermission, ExtensionManifest } from "./types/extension.js";

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

// Platform & Service Architecture
export { EventBus, type AtlasEventName, type EventCallback } from "./events/EventBus.js";
export { ServiceContainer } from "./platform/ServiceContainer.js";
export { CommandService, type CommandDescriptor, type CommandHandler } from "./services/CommandService.js";
export { SettingsService, DEFAULT_SETTINGS_SCHEMA, type SettingsSchema } from "./services/SettingsService.js";
export { ExtensionHost, type ExtensionContext, type ExtensionModule } from "./services/ExtensionHost.js";
export { PermissionEngine, type PermissionRequest } from "./security/PermissionEngine.js";
export { ExtensionManager, type InstalledExtension, type AtlasExtensionModule } from "./extensions/ExtensionManager.js";

// Cloud Sync & Accounts
export { AccountService, type UserProfile } from "./cloud/AccountService.js";
export { LocalTokenStore } from "./cloud/LocalTokenStore.js";
export { ProfileManager, type WorkspaceProfile } from "./cloud/ProfileManager.js";
export { CloudSyncEngine, type SyncPayload } from "./cloud/CloudSyncEngine.js";
export { CollaborationService, type TeamMember, type ActivityItem } from "./cloud/CollaborationService.js";

// Release Engineering & Distribution
export { ReleaseConfig, type ReleaseChannel, type BuildMetadata } from "./release/ReleaseConfig.js";
export { AutoUpdaterService, type UpdateInfo } from "./release/AutoUpdaterService.js";
export { PerformanceMonitor, type PerformanceBudgets } from "./release/PerformanceMonitor.js";
export { DiagnosticService, type DiagnosticBundle } from "./release/DiagnosticService.js";
export { SecurityAuditService, type SbomReport } from "./release/SecurityAuditService.js";
