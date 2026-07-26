/**
 * @atlas/core — TerminalSuggestEngine
 *
 * Terminal command auto-suggest and quick-fix generator matching VS Code (`terminal-suggest`)
 * and Copilot (Chapter 7).
 * Analyzes failed execution output and exit codes to produce 1-click executable command fixes.
 */

export interface TerminalQuickFix {
  id: string;
  originalCommand: string;
  suggestedCommand: string;
  explanation: string;
  confidence: number;
}

export class TerminalSuggestEngine {
  /**
   * Analyze command exit code and output log to produce quick fix suggestions.
   */
  public analyzeFailedCommand(cmd: string, exitCode: number, outputLog: string): TerminalQuickFix[] {
    const fixes: TerminalQuickFix[] = [];
    const lower = outputLog.toLowerCase();

    // Pattern 1: Command not found / missing package
    if (exitCode === 127 || lower.includes("command not found")) {
      const match = cmd.split(" ")[0];
      fixes.push({
        id: `fix-install-${Date.now()}`,
        originalCommand: cmd,
        suggestedCommand: `npm install -g ${match} || sudo apt install ${match}`,
        explanation: `Executable '${match}' was not found in system PATH. Install it globally or via package manager.`,
        confidence: 0.95,
      });
    }

    // Pattern 2: Missing node_modules / module not found
    if (lower.includes("cannot find module") || lower.includes("module_not_found")) {
      fixes.push({
        id: `fix-npm-install-${Date.now()}`,
        originalCommand: cmd,
        suggestedCommand: "npm install",
        explanation: "Required Node.js dependency is missing. Run 'npm install' to restore packages.",
        confidence: 0.98,
      });
    }

    // Pattern 3: Permission denied
    if (exitCode === 126 || lower.includes("permission denied")) {
      fixes.push({
        id: `fix-chmod-${Date.now()}`,
        originalCommand: cmd,
        suggestedCommand: `chmod +x ${cmd.split(" ")[0]} && ${cmd}`,
        explanation: "File permission denied. Grant execute permission with 'chmod +x'.",
        confidence: 0.9,
      });
    }

    return fixes;
  }
}
