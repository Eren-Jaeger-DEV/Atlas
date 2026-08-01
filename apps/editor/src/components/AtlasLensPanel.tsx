import React, { useState, useEffect, useCallback } from "react";
import { Search, Database, Zap, RefreshCw, FileCode, ExternalLink, Clock } from "lucide-react";
import { atlasLens, type LensMatch, type LensStats } from "@atlas/graph";

interface AtlasLensPanelProps {
  workspaceRoot?: string;
  onOpenFile?: (filePath: string, line?: number, col?: number) => void;
}

export function AtlasLensPanel({ workspaceRoot, onOpenFile }: AtlasLensPanelProps) {
  const [query, setQuery] = useState<string>("");
  const [matches, setMatches] = useState<LensMatch[]>([]);
  const [stats, setStats] = useState<LensStats | null>(null);
  const [isIndexing, setIsIndexing] = useState<boolean>(false);

  const rebuildIndex = useCallback(async () => {
    if (!workspaceRoot) return;
    setIsIndexing(true);
    try {
      const res = await atlasLens.buildIndex(workspaceRoot);
      setStats(res);
    } finally {
      setIsIndexing(false);
    }
  }, [workspaceRoot]);

  useEffect(() => {
    rebuildIndex();
  }, [rebuildIndex]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (!val || val.length < 2) {
      setMatches([]);
      return;
    }
    const res = atlasLens.query(val);
    setMatches(res);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Zap size={16} color="#38bdf8" />
          <span style={styles.title}>ATLAS LENS — TRIGRAM INDEX SEARCH</span>
        </div>
        <button style={styles.refreshBtn} onClick={rebuildIndex} disabled={isIndexing}>
          <RefreshCw size={12} className={isIndexing ? "spin" : ""} color="#a1a1aa" />
        </button>
      </div>

      {/* Index HUD Bar */}
      {stats && (
        <div style={styles.hudBar}>
          <div style={styles.hudChip}>
            <Database size={11} color="#38bdf8" />
            <span>{stats.indexedFiles} Files</span>
          </div>
          <div style={styles.hudChip}>
            <span>{stats.totalTrigrams.toLocaleString()} Trigrams</span>
          </div>
          <div style={styles.hudChip}>
            <Clock size={11} color="#a1a1aa" />
            <span>{stats.indexDurationMs.toFixed(0)}ms</span>
          </div>
        </div>
      )}

      {/* Search Input Box */}
      <div style={styles.searchBox}>
        <Search size={14} color="#71717a" style={{ flexShrink: 0 }} />
        <input
          style={styles.input}
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Instant trigram regex/substring search..."
          spellCheck={false}
        />
      </div>

      {/* Results Stream */}
      <div style={styles.resultsStream}>
        {query.length > 0 && matches.length === 0 ? (
          <div style={styles.emptyState}>No matches found in trigram index for "{query}"</div>
        ) : (
          matches.map((match, idx) => (
            <div
              key={idx}
              style={styles.matchCard}
              onClick={() => onOpenFile?.(match.filePath, match.lineNumber, match.column)}
            >
              <div style={styles.matchHeader}>
                <FileCode size={12} color="#38bdf8" />
                <span style={styles.fileName}>{match.filePath.split("/").pop()}</span>
                <span style={styles.lineLoc}>
                  L{match.lineNumber}:{match.column}
                </span>
                <ExternalLink size={10} color="#71717a" style={{ marginLeft: "auto" }} />
              </div>
              <div style={styles.matchPath}>{match.filePath}</div>
              <pre style={styles.codeSnippet}>{match.lineContent}</pre>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#09090b",
    color: "#f4f4f5",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: "12px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    backgroundColor: "#111113",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  title: {
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "#38bdf8",
    fontSize: "11px",
  },
  refreshBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
  },
  hudBar: {
    display: "flex",
    gap: "8px",
    padding: "8px 14px",
    backgroundColor: "#0d0d10",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  hudChip: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "3px 8px",
    backgroundColor: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "4px",
    fontSize: "11px",
    color: "#a1a1aa",
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    margin: "10px 12px 6px 12px",
    padding: "6px 10px",
    backgroundColor: "#111113",
    border: "1px solid rgba(56, 189, 248, 0.25)",
    borderRadius: "6px",
  },
  input: {
    width: "100%",
    background: "none",
    border: "none",
    color: "#f4f4f5",
    fontSize: "12px",
    fontFamily: "'JetBrains Mono', Consolas, monospace",
    outline: "none",
  },
  resultsStream: {
    flex: 1,
    overflowY: "auto",
    padding: "6px 12px 12px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  emptyState: {
    padding: "30px 16px",
    textAlign: "center",
    color: "#52525b",
  },
  matchCard: {
    backgroundColor: "#111113",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: "5px",
    padding: "8px 10px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  matchHeader: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  fileName: {
    fontWeight: 600,
    color: "#e4e4e7",
  },
  lineLoc: {
    color: "#38bdf8",
    fontFamily: "monospace",
    fontSize: "10px",
  },
  matchPath: {
    color: "#52525b",
    fontSize: "10px",
    fontFamily: "monospace",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  codeSnippet: {
    margin: 0,
    fontFamily: "'JetBrains Mono', Consolas, monospace",
    fontSize: "11px",
    color: "#a1a1aa",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    backgroundColor: "#09090b",
    padding: "4px 6px",
    borderRadius: "3px",
  },
};
