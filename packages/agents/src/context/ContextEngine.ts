/**
 * @atlas/agents — ContextEngine
 *
 * Assembles token-bounded context from Active Editor, Open Tabs, Workspace Graph, Diagnostics, and Git Status.
 */

export interface ContextOptions {
  activeFilePath?: string;
  activeContent?: string;
  openTabs?: Array<{ filePath: string; content: string }>;
  gitStatusSummary?: string;
  cursorLine?: number;
  cursorSymbol?: string;
  terminalHistory?: string;
  diagnostics?: string;
  maxTokens?: number;
}

export interface AssembledContext {
  promptContext: string;
  estimatedTokens: number;
}

export class ContextEngine {
  private static readonly CHARS_PER_TOKEN = 4;

  public static assembleContext(options: ContextOptions): AssembledContext {
    const maxTokens = options.maxTokens ?? 4000;
    const maxChars = maxTokens * ContextEngine.CHARS_PER_TOKEN;

    const sections: string[] = [];

    if (options.activeFilePath && options.activeContent) {
      let cursorInfo = "";
      if (options.cursorLine !== undefined) {
        cursorInfo = `\n(Cursor is on line ${options.cursorLine}${options.cursorSymbol ? `, symbol: ${options.cursorSymbol}` : ''})`;
      }
      sections.push(`=== Active File: ${options.activeFilePath} ===${cursorInfo}\n${options.activeContent.slice(0, 2000)}`);
    }

    if (options.openTabs && options.openTabs.length > 0) {
      const tabsInfo = options.openTabs
        .map(t => `File: ${t.filePath}\n${t.content.slice(0, 500)}`)
        .join("\n---\n");
      sections.push(`=== Open Workspace Tabs ===\n${tabsInfo}`);
    }

    if (options.gitStatusSummary) {
      sections.push(`=== Git Repository Status ===\n${options.gitStatusSummary}`);
    }

    if (options.terminalHistory) {
      sections.push(`=== Terminal History ===\n${options.terminalHistory.slice(-2000)}`);
    }

    if (options.diagnostics) {
      sections.push(`=== Diagnostics / Errors ===\n${options.diagnostics.slice(0, 2000)}`);
    }

    let fullText = sections.join("\n\n");
    if (fullText.length > maxChars) {
      fullText = fullText.slice(0, maxChars) + "\n...[Context Truncated]";
    }

    return {
      promptContext: fullText,
      estimatedTokens: Math.ceil(fullText.length / ContextEngine.CHARS_PER_TOKEN),
    };
  }
}
