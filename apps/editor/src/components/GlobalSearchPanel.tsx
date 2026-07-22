import { useState } from "react";

const api = () => window.atlasAPI;

export interface GlobalSearchPanelProps {
  workspaceRoot: string;
  onFileSelect: (filePath: string, line: number) => void;
}

export function GlobalSearchPanel({ workspaceRoot, onFileSelect }: GlobalSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [isRegex, setIsRegex] = useState(false);
  const [includeGlob, setIncludeGlob] = useState("");
  const [excludeGlob, setExcludeGlob] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replaceText, setReplaceText] = useState("");
  const [replaceLoading, setReplaceLoading] = useState(false);
  const [replaceSuccessMsg, setReplaceSuccessMsg] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query) return;

    setLoading(true);
    setError(null);

    try {
      if (api()?.globalSearch) {
        const res = await api().globalSearch(workspaceRoot, query, {
          isRegex,
          include: includeGlob || undefined,
          exclude: excludeGlob || undefined,
        });
        setResults(res);
      } else {
        setError("globalSearch API not available");
      }
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleReplaceAll = async () => {
    if (!query) return;
    
    setReplaceLoading(true);
    setError(null);
    setReplaceSuccessMsg(null);

    try {
      if (api()?.globalReplace) {
        const res = await api().globalReplace(workspaceRoot, query, replaceText, {
          isRegex,
          include: includeGlob || undefined,
          exclude: excludeGlob || undefined,
        });
        setReplaceSuccessMsg(`Replaced ${res.occurrences} occurrences across ${res.filesUpdated} files.`);
        // Refresh search results
        handleSearch();
      } else {
        setError("globalReplace API not available");
      }
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setReplaceLoading(false);
    }
  };

  const [displayLimit, setDisplayLimit] = useState(100);

  const displayedResults = results.slice(0, displayLimit);

  // Group results by file
  const groupedResults = displayedResults.reduce((acc: any, curr: any) => {
    if (!acc[curr.file]) acc[curr.file] = [];
    acc[curr.file].push(curr);
    return acc;
  }, {});

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>SEARCH</span>
      </div>
      
      <form onSubmit={handleSearch} style={styles.form}>
        <div style={styles.inputGroup}>
          <input 
            type="text" 
            placeholder="Search" 
            value={query} 
            onChange={e => setQuery(e.target.value)}
            style={styles.input}
          />
          <button 
            type="button"
            onClick={() => setIsRegex(!isRegex)}
            style={{ ...styles.toggleBtn, backgroundColor: isRegex ? "var(--accent, #38bdf8)" : "var(--border-color, #27272a)", color: isRegex ? "var(--bg-base, #09090b)" : "var(--text-muted, #a1a1aa)" }}
            title="Use Regular Expression"
          >
            .*
          </button>
        </div>

        <div style={styles.inputGroup}>
          <input 
            type="text" 
            placeholder="Replace with..." 
            value={replaceText} 
            onChange={e => setReplaceText(e.target.value)}
            style={styles.input}
          />
        </div>
        
        <input 
          type="text" 
          placeholder="files to include (e.g. *.ts)" 
          value={includeGlob} 
          onChange={e => setIncludeGlob(e.target.value)}
          style={styles.input}
        />
        
        <input 
          type="text" 
          placeholder="files to exclude" 
          value={excludeGlob} 
          onChange={e => setExcludeGlob(e.target.value)}
          style={styles.input}
        />

        <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
          <button type="submit" disabled={loading || replaceLoading} style={{ ...styles.submitBtn, flex: 1 }}>
            {loading ? "..." : "Search"}
          </button>
          <button 
            type="button" 
            onClick={handleReplaceAll} 
            disabled={loading || replaceLoading || !query} 
            style={{ ...styles.submitBtn, flex: 1, backgroundColor: "#10b981", color: "#022c22" }}
            title="Replace All across Workspace"
          >
            {replaceLoading ? "..." : "Replace All"}
          </button>
        </div>
      </form>

      {error && (
        <div style={styles.errorBox}>
          {error}
        </div>
      )}

      {replaceSuccessMsg && (
        <div style={{ ...styles.errorBox, color: "#10b981", backgroundColor: "#022c22", borderBottom: "1px solid #065f46" }}>
          {replaceSuccessMsg}
        </div>
      )}

      <div style={styles.resultsArea}>
        {results.length === 0 && !loading && !error ? (
          <div style={styles.emptyState}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom: "16px"}}>
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <div>Search across your workspace</div>
            <div style={{fontSize: "11px", color: "#64748b", marginTop: "8px"}}>Find text, regex, or specific file types.</div>
          </div>
        ) : (
          <>
            {Object.entries(groupedResults).map(([file, matches]: [string, any]) => (
              <div key={file} style={styles.fileGroup}>
                <div style={styles.fileName} title={file}>
                  📄 {file.split(/[/\\]/).pop()}
                  <span style={styles.matchCount}>{matches.length}</span>
                </div>
                {matches.map((match: any, idx: number) => (
                  <div 
                    key={`${file}-${match.line}-${idx}`} 
                    style={styles.matchItem}
                    onClick={() => onFileSelect(file, match.line)}
                  >
                    <span style={styles.matchLineNum}>{match.line}</span>
                    <span style={styles.matchText}>{match.matchText}</span>
                  </div>
                ))}
              </div>
            ))}
            {results.length > displayLimit && (
              <button
                style={{ margin: "12px", padding: "6px 12px", backgroundColor: "var(--border-color, #27272a)", color: "var(--text-main, #fafafa)", border: "none", borderRadius: "4px", cursor: "pointer" }}
                onClick={() => setDisplayLimit(prev => prev + 100)}
              >
                Show More ({results.length - displayLimit} remaining)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#000000",
    color: "var(--text-main, #e4e4e7)",
  },
  header: {
    padding: "4px 8px",
    borderBottom: "1px solid #38bdf8",
    backgroundColor: "#050505",
  },
  headerTop: {
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.8px",
    color: "#94a3b8",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "12px",
    borderBottom: "1px solid #1e293b",
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#050505",
    border: "1px solid #38bdf8",
    borderRadius: "4px",
    padding: "4px 8px",
  },
  input: {
    flex: 1,
    backgroundColor: "transparent",
    border: "none",
    color: "var(--text-main, #fafafa)",
    padding: "6px 8px",
    fontSize: "12px",
    outline: "none",
  },
  toggleBtn: {
    border: "none",
    borderRadius: "4px",
    padding: "0 8px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  submitBtn: {
    backgroundColor: "var(--accent, #38bdf8)",
    color: "#0f111a",
    border: "none",
    padding: "6px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: "4px",
    transition: "all 0.2s",
  },
  errorBox: {
    padding: "8px 12px",
    color: "#f87171",
    fontSize: "11px",
    backgroundColor: "#450a0a",
    borderBottom: "1px solid #7f1d1d",
  },
  resultsArea: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 0",
    position: "relative",
  },
  emptyState: {
    padding: "40px 20px",
    color: "#94a3b8",
    textAlign: "center",
    fontSize: "13px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  fileGroup: {
    marginBottom: "8px",
  },
  fileName: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 12px",
    fontSize: "12px",
    fontWeight: 600,
    backgroundColor: "#161b22",
    color: "var(--text-main, #fafafa)",
  },
  matchCount: {
    backgroundColor: "#1e293b",
    color: "#94a3b8",
    fontSize: "10px",
    padding: "2px 6px",
    borderRadius: "10px",
    marginLeft: "auto",
  },
  matchItem: {
    display: "flex",
    gap: "8px",
    padding: "4px 12px 4px 24px",
    fontSize: "12px",
    color: "#94a3b8",
    cursor: "pointer",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    transition: "background-color 0.15s",
  },
  matchLineNum: {
    color: "var(--accent, #38bdf8)",
    width: "24px",
    textAlign: "right",
    flexShrink: 0,
  },
  matchText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
};
