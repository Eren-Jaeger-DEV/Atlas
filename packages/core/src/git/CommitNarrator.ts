/**
 * @atlas/core — CommitNarrator (Atlas Chronicle)
 *
 * Semantic Git History Narrator & Conventional Commit Engine.
 *
 * Parses staged diffs or commit patches, classifies changes into conventional commit types,
 * evaluates change risk levels (LOW/MEDIUM/HIGH), extracts impacted symbols, and auto-drafts
 * structured commit messages.
 *
 * Completely original Atlas implementation.
 */

export type ConventionalType = "feat" | "fix" | "refactor" | "security" | "docs" | "style" | "chore" | "test";
export type CommitRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface CommitAnnotation {
  type: ConventionalType;
  scope?: string;
  summary: string;
  narrative: string;
  riskLevel: CommitRiskLevel;
  impactedSymbols: string[];
  suggestedCommitMessage: string;
}

export class CommitNarrator {
  /**
   * Analyzes a raw patch/diff string and generates a semantic CommitAnnotation
   */
  public narrateDiff(filePath: string, diffText: string): CommitAnnotation {
    const lines = diffText.split("\n");
    const addedLines = lines.filter((l) => l.startsWith("+") && !l.startsWith("+++"));
    const removedLines = lines.filter((l) => l.startsWith("-") && !l.startsWith("---"));

    // Extract impacted symbols (functions, classes, exports)
    const impactedSymbols: string[] = [];
    const symbolRegex = /(?:function|class|const|let|var|interface|type)\s+([A-Za-z0-9_]+)/g;
    let match: RegExpExecArray | null;

    while ((match = symbolRegex.exec(diffText)) !== null) {
      if (match[1] && !impactedSymbols.includes(match[1])) {
        impactedSymbols.push(match[1]);
      }
    }

    // Determine Conventional Commit Type
    let type: ConventionalType = "chore";
    if (diffText.includes("sec") || diffText.includes("auth") || diffText.includes("token") || diffText.includes("secret")) {
      type = "security";
    } else if (addedLines.length > removedLines.length * 2) {
      type = "feat";
    } else if (removedLines.length > addedLines.length && diffText.includes("fix")) {
      type = "fix";
    } else if (impactedSymbols.length > 0) {
      type = "refactor";
    }

    // Evaluate Risk Level
    let riskLevel: CommitRiskLevel = "LOW";
    if (type === "security" || impactedSymbols.length > 5 || lines.length > 100) {
      riskLevel = "HIGH";
    } else if (lines.length > 30 || type === "refactor") {
      riskLevel = "MEDIUM";
    }

    // Extract file basename for scope
    const scope = filePath.split("/").pop()?.split(".")[0] || "core";

    const summary = `${type}(${scope}): update ${impactedSymbols.slice(0, 2).join(", ") || scope} implementation`;
    const narrative = `Modified ${lines.length} lines across ${impactedSymbols.length || 1} symbols. Refactored logic to enhance deterministic behavior and reliability.`;
    const suggestedCommitMessage = `${type}(${scope}): ${impactedSymbols.length > 0 ? `update ${impactedSymbols.join(", ")}` : `update ${scope}`}\n\n${narrative}`;

    return {
      type,
      scope,
      summary,
      narrative,
      riskLevel,
      impactedSymbols,
      suggestedCommitMessage,
    };
  }
}

export const commitNarrator = new CommitNarrator();
