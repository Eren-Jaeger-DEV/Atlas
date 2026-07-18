/**
 * @atlas/core — Extension API (The Wall)
 *
 * This is the ONLY interface the editor core exposes to plugins.
 * The AI plugin talks to the core EXCLUSIVELY through IExtensionAPI.
 *
 * Architectural rule: nothing inside apps/editor/src/core/ may import
 * from packages/agents. The agent runtime is a plugin. It only gets this.
 *
 * Consequence: if a feature can't be expressed through this API, it
 * doesn't belong in the editor core — extend the API or build a new plugin.
 */

import type { ImpactResult } from "../types/impact.js";
import type { GraphNode, GraphEdge } from "../types/node.js";
import type { OrchestratorEvent, RunRecord } from "../types/agent.js";

// ---------------------------------------------------------------------------
// Editor state queries (read-only, plugin can observe but not mutate)
// ---------------------------------------------------------------------------

export interface IEditorState {
  /** Currently open file path, or undefined if no file is open */
  readonly activeFilePath: string | undefined;
  /** Current cursor position in the active file */
  readonly cursor: { line: number; column: number } | undefined;
  /** Selected text in the active file, if any */
  readonly selection: string | undefined;
  /** Whether the editor is in "normal mode" (no AI plugin) */
  readonly isAIPluginLoaded: boolean;
}

// ---------------------------------------------------------------------------
// Memory / graph queries
// ---------------------------------------------------------------------------

export interface IMemoryQuery {
  /** Get all nodes for a file */
  getNodesForFile(filePath: string): Promise<GraphNode[]>;
  /** Get edges from/to a node */
  getEdges(nodeId: string, direction: "from" | "to" | "both"): Promise<GraphEdge[]>;
  /** Fuzzy semantic search over node summaries */
  semanticSearch(query: string, limit?: number): Promise<GraphNode[]>;
}

export interface IImpactQuery {
  /**
   * Compute live dependency impact for a file and optional symbol.
   * This is a pure graph traversal — no AI, no network, should be < 500ms.
   */
  computeImpact(filePath: string, symbolName?: string): Promise<ImpactResult>;
}

// ---------------------------------------------------------------------------
// Agent runtime bridge (plugin → runtime, via IPC under the hood)
// ---------------------------------------------------------------------------

export interface IAgentBridge {
  /** Start an agent run for a goal. Returns a run ID. */
  run(goal: string): Promise<string>;
  /** Cancel a running agent loop */
  cancel(runId: string): Promise<void>;
  /** Subscribe to events from a run */
  onEvent(runId: string, handler: (event: OrchestratorEvent) => void): () => void;
  /** Get the full record of a completed run */
  getRunRecord(runId: string): Promise<RunRecord | undefined>;
}

// ---------------------------------------------------------------------------
// UI integration (plugin can register panels and commands)
// ---------------------------------------------------------------------------

export interface IPanelRegistration {
  id: string;
  title: string;
  /** React component to render inside the panel — passed as an opaque handle */
  componentKey: string;
  position: "left" | "right" | "bottom";
}

export interface ICommandRegistration {
  id: string;
  title: string;
  keybinding?: string;
  handler: () => void | Promise<void>;
}

export interface IUIRegistry {
  registerPanel(panel: IPanelRegistration): () => void;
  registerCommand(command: ICommandRegistration): () => void;
  showNotification(message: string, kind?: "info" | "warning" | "error"): void;
}

// ---------------------------------------------------------------------------
// The Extension API — all of the above, in one interface
// ---------------------------------------------------------------------------

export interface IExtensionAPI {
  readonly version: string;
  readonly editorState: IEditorState;
  readonly memory: IMemoryQuery;
  readonly impact: IImpactQuery;
  readonly agent: IAgentBridge;
  readonly ui: IUIRegistry;

  /** Called when the plugin is loaded */
  onActivate(pluginId: string): void;
  /** Called when the plugin is unloaded */
  onDeactivate(pluginId: string): void;
}

// ---------------------------------------------------------------------------
// Plugin manifest (every plugin must export a default conforming to this)
// ---------------------------------------------------------------------------

export interface IAtlasPlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  activate(api: IExtensionAPI): void | Promise<void>;
  deactivate(): void | Promise<void>;
}
