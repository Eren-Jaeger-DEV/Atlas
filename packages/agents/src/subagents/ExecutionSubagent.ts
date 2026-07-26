/**
 * @atlas/agents — ExecutionSubagent
 *
 * Specialized iterative subagent for executing shell commands (e.g. `npm test`, `cargo build`),
 * capturing stdout/stderr streams, and extracting concise error summaries matching VS Code's
 * `execution_subagent` (Chapter 8).
 */

export interface ExecutionSubagentConfig {
  repoRoot: string;
  command: string;
  query?: string;
  maxOutputLines?: number;
}

export interface ExecutionSubagentResult {
  command: string;
  exitCode: number;
  stdoutSummary: string;
  passed: boolean;
  errorLines: string[];
}

export class ExecutionSubagent {
  private config: ExecutionSubagentConfig;

  constructor(config: ExecutionSubagentConfig) {
    this.config = config;
  }

  /**
   * Filter and summarize raw stdout/stderr output down to key lines.
   */
  public summarizeOutput(rawOutput: string): { summary: string; errors: string[] } {
    const lines = rawOutput.split(/\r?\n/);
    const errors: string[] = [];
    const keyLines: string[] = [];

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes("error") || lower.includes("fail") || lower.includes("exception") || lower.includes("fatal")) {
        errors.push(line);
      }
      if (lower.includes("passing") || lower.includes("total") || lower.includes("build") || lower.includes("summary")) {
        keyLines.push(line);
      }
    }

    const maxLines = this.config.maxOutputLines || 50;
    const summaryLines = [...keyLines, ...errors.slice(0, 20)];
    const summary = summaryLines.length > 0
      ? summaryLines.slice(0, maxLines).join("\n")
      : lines.slice(-maxLines).join("\n");

    return { summary, errors };
  }

  /**
   * Format the result into a clean context prompt block for the LLM.
   */
  public static formatPromptBlock(result: ExecutionSubagentResult): string {
    return `
[EXECUTION SUBAGENT RESULT]
Command: ${result.command}
Exit Code: ${result.exitCode} (${result.passed ? "PASSED" : "FAILED"})
Errors Found (${result.errorLines.length}):
${result.errorLines.slice(0, 10).join("\n") || "None"}

Filtered Output Summary:
${result.stdoutSummary}
=======================================
    `.trim();
  }
}
