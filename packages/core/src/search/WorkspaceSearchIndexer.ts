/**
 * @atlas/core — WorkspaceSearchIndexer
 *
 * High-speed text search indexer matching VS Code (`findTextInFiles2`) (Chapter 7).
 * Supports regex pattern matching, case sensitivity toggles, and glob pattern filtering (`includePattern`/`excludePattern`).
 */

export interface SearchMatch {
  filePath: string;
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchEnd: number;
}

export interface SearchOptions {
  query: string;
  isRegex?: boolean;
  isCaseSensitive?: boolean;
  includePattern?: string;
  excludePattern?: string;
  maxResults?: number;
}

export class WorkspaceSearchIndexer {
  /**
   * Search within a collection of file paths and content buffers.
   */
  public searchInFiles(files: Array<{ path: string; content: string }>, options: SearchOptions): SearchMatch[] {
    const matches: SearchMatch[] = [];
    const maxResults = options.maxResults || 200;

    let flags = "g";
    if (!options.isCaseSensitive) flags += "i";

    let patternRegexp: RegExp;
    try {
      patternRegexp = options.isRegex
        ? new RegExp(options.query, flags)
        : new RegExp(options.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
    } catch {
      return [];
    }

    const matchGlob = (filePath: string, pattern: string): boolean => {
      if (!pattern) return true;
      try {
        const reStr = pattern
          .replace(/[.+^${}()|[\]\\]/g, "\\$&")
          .replace(/\*\*/g, ".*")
          .replace(/\*/g, "[^/]*")
          .replace(/\?/g, ".");
        return new RegExp(reStr, "i").test(filePath);
      } catch {
        return filePath.includes(pattern);
      }
    };

    for (const file of files) {
      if (matches.length >= maxResults) break;

      // Filter file paths by exclude/include pattern using glob matching
      if (options.excludePattern && matchGlob(file.path, options.excludePattern)) continue;
      if (options.includePattern && !matchGlob(file.path, options.includePattern)) continue;

      const lines = file.content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        if (matches.length >= maxResults) break;

        const line = lines[i]!;
        patternRegexp.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = patternRegexp.exec(line)) !== null) {
          matches.push({
            filePath: file.path,
            lineNumber: i + 1,
            lineContent: line,
            matchStart: match.index,
            matchEnd: match.index + match[0].length,
          });

          if (!patternRegexp.global) break;
        }
      }
    }

    return matches;
  }
}
