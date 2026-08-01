export interface AstMatch {
  file: string;
  line: number;
  column: number;
  matchedText: string;
  bindings: Record<string, string>;
}

export interface AstPatternPreset {
  id: string;
  name: string;
  pattern: string;
  replacement: string;
  description: string;
}

export const AST_PATTERN_PRESETS: AstPatternPreset[] = [
  {
    id: "unawaited-async",
    name: "Un-awaited Async Calls",
    pattern: "$FUNC($ARGS)",
    replacement: "await $FUNC($ARGS)",
    description: "Finds calls to async routines missing the await keyword",
  },
  {
    id: "console-logs",
    name: "Console Log Cleanup",
    pattern: "console.log($MSG)",
    replacement: "logger.debug($MSG)",
    description: "Finds console log statements for logger migration",
  },
  {
    id: "throw-generic-error",
    name: "Generic Error Throwing",
    pattern: "throw new Error($MSG)",
    replacement: "throw new AppError($MSG)",
    description: "Finds generic Error throws for custom exception handling",
  },
  {
    id: "var-declaration",
    name: "Legacy var Declarations",
    pattern: "var $NAME = $VAL",
    replacement: "const $NAME = $VAL",
    description: "Finds legacy var keyword declarations for const/let refactoring",
  },
];

export class StructuralAstSearch {
  /**
   * Performs structural AST pattern matching on code text
   */
  public matchContent(filePath: string, content: string, pattern: string): AstMatch[] {
    const matches: AstMatch[] = [];
    if (!content || !pattern.trim()) return matches;

    const lines = content.split("\n");
    const patternRegex = this.patternToRegex(pattern);

    lines.forEach((lineText, idx) => {
      const match = patternRegex.exec(lineText);
      if (match) {
        const bindings: Record<string, string> = {};
        if (match.groups) {
          Object.entries(match.groups).forEach(([key, val]) => {
            bindings[key] = val || "";
          });
        }
        matches.push({
          file: filePath,
          line: idx + 1,
          column: match.index + 1,
          matchedText: match[0].trim(),
          bindings,
        });
      }
    });

    return matches;
  }

  /**
   * Converts a structural wildcard pattern (e.g. `console.log($MSG)`) into a regex with named capture groups
   */
  private patternToRegex(pattern: string): RegExp {
    let escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, (m) => (m === "$" ? "$" : `\\${m}`));

    // Replace $NAME placeholders with named capture groups (?<NAME>[a-zA-Z0-9_\s"',.]+)
    escaped = escaped.replace(/\$([a-zA-Z0-9_]+)/g, (_, name) => `(?<${name}>[^;(){\\}\n]+)`);

    return new RegExp(escaped, "g");
  }

  /**
   * Applies structural AST replacement on content
   */
  public replaceContent(content: string, pattern: string, replacement: string): string {
    if (!content || !pattern.trim()) return content;
    const lines = content.split("\n");
    const patternRegex = this.patternToRegex(pattern);

    const updatedLines = lines.map((lineText) => {
      return lineText.replace(patternRegex, (...args) => {
        const groups = args[args.length - 1] || {};
        let rep = replacement;
        Object.entries(groups).forEach(([k, v]) => {
          rep = rep.replace(new RegExp(`\\$${k}`, "g"), String(v));
        });
        return rep;
      });
    });

    return updatedLines.join("\n");
  }
}

export const structuralAstSearch = new StructuralAstSearch();
