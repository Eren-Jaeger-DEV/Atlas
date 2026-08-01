import React, { useEffect, useState, useRef } from "react";

export interface OutputLog {
  timestamp: string;
  source: string;
  message: string;
  level?: "info" | "warn" | "error" | "success";
}

// Global logger shared across the app
const globalLogs: OutputLog[] = [];
const logListeners = new Set<() => void>();

export const logToOutput = (source: string, message: string, level: OutputLog["level"] = "info") => {
  globalLogs.push({
    timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
    source,
    message,
    level,
  });
  if (globalLogs.length > 2000) globalLogs.shift();
  logListeners.forEach((l) => l());
};

const SOURCE_COLORS: Record<string, string> = {
  AI:       "#a78bfa",
  Agent:    "#a78bfa",
  Git:      "#f59e0b",
  LSP:      "#38bdf8",
  Terminal: "#34d399",
  Build:    "#fb923c",
  Error:    "#f87171",
  Warn:     "#fbbf24",
  System:   "#71717a",
};

function getSourceColor(source: string): string {
  for (const [key, color] of Object.entries(SOURCE_COLORS)) {
    if (source.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return "#60a5fa";
}

function getLevelStyle(level?: OutputLog["level"]): React.CSSProperties {
  switch (level) {
    case "error":   return { color: "#fca5a5", backgroundColor: "rgba(239,68,68,0.06)" };
    case "warn":    return { color: "#fde68a", backgroundColor: "rgba(245,158,11,0.06)" };
    case "success": return { color: "#86efac", backgroundColor: "rgba(34,197,94,0.06)" };
    default:        return {};
  }
}

const ALL_SOURCES = "All";

export function OutputPanel() {
  const [logs, setLogs] = useState<OutputLog[]>([...globalLogs]);
  const [filter, setFilter] = useState(ALL_SOURCES);
  const [search, setSearch] = useState("");
  const [sources, setSources] = useState<string[]>([ALL_SOURCES]);
  const endRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    const update = () => {
      const snap = [...globalLogs];
      setLogs(snap);
      // update sources list
      const srcSet = new Set<string>([ALL_SOURCES]);
      snap.forEach(l => srcSet.add(l.source));
      setSources(Array.from(srcSet));
    };
    logListeners.add(update);
    return () => { logListeners.delete(update); };
  }, []);

  useEffect(() => {
    if (autoScroll && endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(atBottom);
  };

  const filtered = logs.filter(l => {
    const matchSrc = filter === ALL_SOURCES || l.source === filter;
    const matchSearch = !search || l.message.toLowerCase().includes(search.toLowerCase()) || l.source.toLowerCase().includes(search.toLowerCase());
    return matchSrc && matchSearch;
  });

  const clearLogs = () => {
    globalLogs.length = 0;
    setLogs([]);
  };

  return (
    <div style={s.container}>
      {/* Header toolbar */}
      <div style={s.header}>
        <div style={s.tabs}>
          <div style={s.tabActive}>Output</div>
        </div>

        <div style={s.controls}>
          {/* Source filter */}
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={s.select}
            title="Filter by source"
          >
            {sources.map(src => (
              <option key={src} value={src}>{src}</option>
            ))}
          </select>

          {/* Search */}
          <div style={s.searchWrap}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2.5" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter output..."
              style={s.searchInput}
            />
            {search && (
              <button style={s.clearSearchBtn} onClick={() => setSearch("")}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>

          {/* Auto-scroll indicator */}
          <button
            style={{ ...s.iconBtn, color: autoScroll ? "#38bdf8" : "#52525b" }}
            title={autoScroll ? "Auto-scroll on" : "Auto-scroll off"}
            onClick={() => { setAutoScroll(!autoScroll); if (!autoScroll) endRef.current?.scrollIntoView({ behavior: "smooth" }); }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>

          {/* Clear */}
          <button style={s.iconBtn} title="Clear output" onClick={clearLogs}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Log area */}
      <div style={s.content} ref={containerRef} onScroll={handleScroll}>
        {filtered.length === 0 ? (
          <div style={s.empty}>
            {logs.length === 0 ? "No output yet." : `No results for "${search || filter}".`}
          </div>
        ) : (
          filtered.slice(-300).map((l, i) => (
            <div key={i} style={{ ...s.logLine, ...getLevelStyle(l.level) }}>
              <span style={s.timestamp}>{l.timestamp}</span>
              <span style={{ ...s.source, color: getSourceColor(l.source) }}>[{l.source}]</span>
              <span style={s.message}>{l.message}</span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* Count bar */}
      <div style={s.countBar}>
        <span style={s.countText}>
          {filtered.length} / {logs.length} lines
          {filter !== ALL_SOURCES && <> &mdash; filtered to <span style={{ color: getSourceColor(filter) }}>{filter}</span></>}
        </span>
        {!autoScroll && (
          <button style={s.scrollToBottomBtn} onClick={() => { setAutoScroll(true); endRef.current?.scrollIntoView({ behavior: "smooth" }); }}>
            Scroll to bottom
          </button>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "var(--bg-base, #0d0d10)",
    color: "var(--text-main, #e4e4e7)",
    fontFamily: "var(--font-mono, 'JetBrains Mono', 'Fira Code', monospace)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    padding: "0 8px 0 12px",
    height: "35px",
    backgroundColor: "var(--bg-panel, rgba(0,0,0,0.3))",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    gap: "8px",
    flexShrink: 0,
  },
  tabs: {
    display: "flex",
    alignItems: "center",
    height: "100%",
    flexShrink: 0,
  },
  tabActive: {
    display: "flex",
    alignItems: "center",
    height: "100%",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-main, #e4e4e7)",
    borderBottom: "2px solid #38bdf8",
    paddingRight: "12px",
    fontFamily: "Inter, system-ui, sans-serif",
    letterSpacing: "0.3px",
    textTransform: "uppercase",
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginLeft: "auto",
  },
  select: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#a1a1aa",
    borderRadius: "4px",
    padding: "2px 6px",
    fontSize: "11px",
    outline: "none",
    cursor: "pointer",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "4px",
    padding: "2px 6px",
  },
  searchInput: {
    background: "none",
    border: "none",
    outline: "none",
    color: "#d4d4d8",
    fontSize: "11px",
    width: "120px",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  clearSearchBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#52525b",
    padding: 0,
    display: "flex",
    alignItems: "center",
  },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#52525b",
    padding: "3px",
    borderRadius: "3px",
    display: "flex",
    alignItems: "center",
    transition: "color 0.1s",
  },
  content: {
    flex: 1,
    overflowY: "auto",
    padding: "6px 0",
  },
  logLine: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0",
    padding: "1px 12px",
    fontSize: "12px",
    lineHeight: "1.5",
    wordBreak: "break-all",
    whiteSpace: "pre-wrap",
    borderRadius: "2px",
    transition: "background 0.05s",
  },
  timestamp: {
    color: "#3f3f46",
    marginRight: "8px",
    flexShrink: 0,
    fontSize: "11px",
    lineHeight: "1.8",
    fontVariantNumeric: "tabular-nums",
  },
  source: {
    marginRight: "8px",
    flexShrink: 0,
    fontWeight: 600,
    fontSize: "11px",
    lineHeight: "1.8",
  },
  message: {
    color: "#a1a1aa",
    flex: 1,
  },
  empty: {
    color: "#3f3f46",
    fontSize: "12px",
    padding: "24px 16px",
    fontStyle: "italic",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  countBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "3px 12px",
    borderTop: "1px solid rgba(255,255,255,0.04)",
    backgroundColor: "rgba(0,0,0,0.2)",
    flexShrink: 0,
  },
  countText: {
    fontSize: "10px",
    color: "#3f3f46",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  scrollToBottomBtn: {
    background: "rgba(56,189,248,0.1)",
    border: "1px solid rgba(56,189,248,0.2)",
    borderRadius: "3px",
    color: "#38bdf8",
    fontSize: "10px",
    padding: "2px 8px",
    cursor: "pointer",
    fontFamily: "Inter, system-ui, sans-serif",
  },
};
