import { useState } from "react";

const api = () => (window as any).atlasAPI;

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

  // Group results by file
  const groupedResults = results.reduce((acc: any, curr: any) => {
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
            style={{ ...styles.toggleBtn, backgroundColor: isRegex ? "#38bdf8" : "#27272a", color: isRegex ? "#09090b" : "#a1a1aa" }}
            title="Use Regular Expression"
          >
            .*
          </button>
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

        <button type="submit" disabled={loading} style={styles.submitBtn}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && (
        <div style={styles.errorBox}>
          {error}
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
          Object.entries(groupedResults).map(([file, matches]: [string, any]) => (
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
          ))
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
    color: "#e4e4e7",
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
    color: "#fafafa",
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
    backgroundColor: "#38bdf8",
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
    color: "#fafafa",
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
    color: "#38bdf8",
    width: "24px",
    textAlign: "right",
    flexShrink: 0,
  },
  matchText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
};
