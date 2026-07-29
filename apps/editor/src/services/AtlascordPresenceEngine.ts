/**
 * @atlas/editor — AtlascordPresenceEngine
 *
 * Real-time Discord Rich Presence calculation and template interpolation engine for Atlas Studio.
 * Derived dynamically from live workspace, active file tab, cursor position, and agent orchestrator state.
 */

export interface PresenceTemplateParams {
  file?: string;
  workspace?: string;
  language?: string;
  line?: number;
  col?: number;
  agentState?: string;
  health?: number | null;
  customDetailsTemplate?: string;
  customStateTemplate?: string;
  showWorkspaceName?: boolean;
  showActiveFile?: boolean;
  showAgentState?: boolean;
}

export interface AtlascordPresencePayload {
  details: string;
  state: string;
  largeImageKey: string;
  largeImageText: string;
  smallImageKey: string;
  smallImageText: string;
  startTimestamp: number;
}

export class AtlascordPresenceEngine {
  private static startTimestamp: number = Date.now();

  public static formatPresence(params: PresenceTemplateParams): AtlascordPresencePayload {
    const file = params.showActiveFile !== false && params.file ? params.file.split("/").pop() || params.file : "No Active File";
    const workspace = params.showWorkspaceName !== false && params.workspace ? params.workspace.split("/").pop() || params.workspace : "Atlas Workspace";
    const language = params.language ? params.language.toUpperCase() : "PLAINTEXT";
    const line = params.line ?? 1;
    const col = params.col ?? 1;
    const agentState = params.showAgentState !== false && params.agentState ? params.agentState.toUpperCase() : "IDLE";
    const health = params.health !== undefined && params.health !== null ? `${params.health}%` : "100%";

    const defaultDetails = params.file
      ? `Editing ${file} (${line}:${col})`
      : `Exploring ${workspace}`;

    const defaultState = params.agentState && params.agentState !== "IDLE"
      ? `Agent: ${agentState} • ${workspace}`
      : `Atlas Studio v1.0 • ${language}`;

    let details = params.customDetailsTemplate || defaultDetails;
    let state = params.customStateTemplate || defaultState;

    // Interpolate template tags
    details = details
      .replace(/\{file\}/g, file)
      .replace(/\{workspace\}/g, workspace)
      .replace(/\{language\}/g, language)
      .replace(/\{line\}/g, String(line))
      .replace(/\{col\}/g, String(col))
      .replace(/\{agentState\}/g, agentState)
      .replace(/\{health\}/g, health);

    state = state
      .replace(/\{file\}/g, file)
      .replace(/\{workspace\}/g, workspace)
      .replace(/\{language\}/g, language)
      .replace(/\{line\}/g, String(line))
      .replace(/\{col\}/g, String(col))
      .replace(/\{agentState\}/g, agentState)
      .replace(/\{health\}/g, health);

    const langKeyMap: Record<string, string> = {
      TYPESCRIPT: "typescript",
      TSX: "react",
      JAVASCRIPT: "javascript",
      JSX: "react",
      PYTHON: "python",
      CPP: "cpp",
      C: "c",
      HTML: "html",
      CSS: "css",
      JSON: "json",
      MARKDOWN: "markdown",
      RUST: "rust",
      GO: "go",
      JAVA: "java",
      PHP: "php",
      RUBY: "ruby"
    };

    const langAssetKey = langKeyMap[language] || language.toLowerCase();
    const largeImageKey = params.file ? langAssetKey : "atlas-logo";
    const largeImageText = params.file ? `Editing ${language} file` : `Atlas Studio — ${workspace}`;

    const smallImageKey = params.agentState && params.agentState !== "IDLE"
      ? "agent-active"
      : "atlas-logo";

    const smallImageText = params.agentState && params.agentState !== "IDLE"
      ? `AI Agent: ${agentState}`
      : `Atlas Studio IDE`;

    return {
      details,
      state,
      largeImageKey,
      largeImageText,
      smallImageKey,
      smallImageText,
      startTimestamp: this.startTimestamp,
    };
  }

  public static resetTimer(): void {
    this.startTimestamp = Date.now();
  }
}
