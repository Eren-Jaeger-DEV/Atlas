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
  TaskNode,
  TaskType,
  TaskStatus,
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
export type { PluginPermission, PluginManifest, LanguageContribution, AtlasPluginModule } from "./types/plugin.js";

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
export { LSPBridge, type LSPDiagnostic, type LSPSymbol, type LSPConfig } from "./platform/LSPBridge.js";
export { ServiceContainer } from "./platform/ServiceContainer.js";
export { CommandService, type CommandDescriptor, type CommandHandler } from "./services/CommandService.js";
export { SettingsService, DEFAULT_SETTINGS_SCHEMA, type SettingsSchema } from "./services/SettingsService.js";
export { PluginHost, type PluginContext, type PluginModule, type RegisteredViewItem, type RegisteredViewerItem } from "./services/PluginHost.js";
export { PermissionEngine, type PermissionRequest } from "./security/PermissionEngine.js";
export { AtlasIgnore } from "./security/AtlasIgnore.js";
export { SandboxWrapper, type SandboxPolicyConfig } from "./security/SandboxWrapper.js";
export { WorkspaceTrustPolicy, type TrustStatus } from "./security/WorkspaceTrustPolicy.js";
export { PluginManager, type InstalledPlugin } from "./extensions/PluginManager.js";
export { ForgeRegistryManager, type ForgePluginItem } from "./extensions/ForgeRegistryManager.js";
export { RemoteAuthorityTunnel, type RemoteAuthorityType, type RemoteConnectionConfig } from "./remote/RemoteAuthorityTunnel.js";

// Protobuf Binary Transport
export { ProtobufTransport } from "./protobuf/ProtobufTransport.js";
export { DiffZoneTransport } from "./protobuf/DiffZoneTransport.js";
export type { AgentEventFrame, DiffZoneFrame } from "./protobuf/schemas.js";
export { FeatureFlagManager, type FeatureFlagRule, type TelemetryEvent } from "./services/FeatureFlagManager.js";

// Memory & Shadow Workspace Architecture
export { MemoryStore, type MemoryScope, type MemoryEntry } from "./memory/MemoryStore.js";
export { ShadowWorkspace, type ShadowFile } from "./workspace/ShadowWorkspace.js";

// Importer & MCP OAuth Gateway
export { CompetitorSettingsImporter, type CompetitorRule, type ImportedConfigResult } from "./importer/CompetitorSettingsImporter.js";
export { McpOAuthGateway, type McpOAuthProviderConfig, type McpTokenSet } from "./mcp/McpOAuthGateway.js";

// Session, Terminal Suggest & Workspace Search
export { SessionManager, type ChatSession, type ChatMessage } from "./session/SessionManager.js";
export { TerminalSuggestEngine, type TerminalQuickFix } from "./terminal/TerminalSuggestEngine.js";
export { WorkspaceSearchIndexer, type SearchMatch, type SearchOptions } from "./search/WorkspaceSearchIndexer.js";

// Cloud Sync & Accounts
export { AccountService, type UserProfile } from "./cloud/AccountService.js";
export { LocalTokenStore } from "./cloud/LocalTokenStore.js";
export { ProfileManager, type WorkspaceProfile } from "./cloud/ProfileManager.js";
export { CloudSyncEngine, type SyncPayload, type StorageProvider } from "./cloud/CloudSyncEngine.js";
export { BrowserStorageProvider } from "./cloud/BrowserStorageProvider.js";
export { CollaborationService, type TeamMember, type ActivityItem } from "./cloud/CollaborationService.js";

// Release Engineering & Distribution
export { ReleaseConfig, type ReleaseChannel, type BuildMetadata } from "./release/ReleaseConfig.js";
export { AutoUpdaterService, type UpdateInfo } from "./release/AutoUpdaterService.js";
export { PerformanceMonitor, type PerformanceBudgets } from "./release/PerformanceMonitor.js";
export { PerformanceProfiler, type ProfilerMetrics } from "./release/PerformanceProfiler.js";
export { DiagnosticService, type DiagnosticBundle } from "./release/DiagnosticService.js";
export { SecurityAuditService, type SbomReport } from "./release/SecurityAuditService.js";
export { SecurityAuditEngine, type SecurityVulnerability } from "./security/SecurityAuditEngine.js";
export { StatusBarRegistry, type StatusBarItem } from "./services/StatusBarRegistry.js";

// Atlas Chronicle — Semantic Git History Narrator & Conventional Commit Engine
export { CommitNarrator, commitNarrator, type CommitAnnotation, type ConventionalType, type CommitRiskLevel } from "./git/CommitNarrator.js";

// Atlas Torch — One-Click CPU & Heap Flamegraph Profiler Engine
export { FlamegraphProfiler, flamegraphProfiler, type FlameFrame, type Hotspot, type TorchProfileReport } from "./release/FlamegraphProfiler.js";

// Atlas Canvas — In-Editor Reactive Notebook Engine (.atlas-nb)
export { ReactiveNotebookEngine, reactiveNotebookEngine, type NotebookCell, type NotebookDocument, type CellStatus } from "./notebook/ReactiveNotebookEngine.js";



