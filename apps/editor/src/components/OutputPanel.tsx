import React, { useEffect, useState, useRef } from "react";

export interface OutputLog {
  timestamp: string;
  source: string;
  message: string;
}

// Global logger to be used by other parts of the app
const globalLogs: OutputLog[] = [];
const logListeners = new Set<() => void>();

export const logToOutput = (source: string, message: string) => {
  globalLogs.push({
    timestamp: new Date().toLocaleTimeString(),
    source,
    message,
  });
  if (globalLogs.length > 1000) globalLogs.shift();
  logListeners.forEach((l) => l());
};

export function OutputPanel() {
  const [logs, setLogs] = useState<OutputLog[]>(globalLogs);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => setLogs([...globalLogs]);
    logListeners.add(update);
    return () => {
      logListeners.delete(update);
    };
  }, []);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.tabActive}>Output</div>
        <button style={s.clearBtn} onClick={() => { globalLogs.length = 0; setLogs([]); }}>
          Clear
        </button>
      </div>
      <div style={s.content}>
        {logs.length === 0 ? (
          <div style={s.empty}>No output generated yet.</div>
        ) : (
          logs.map((l, i) => (
            <div key={i} style={s.logLine}>
              <span style={s.timestamp}>[{l.timestamp}]</span>
              <span style={s.source}>[{l.source}]</span>
              <span style={s.message}>{l.message}</span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

const s = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "var(--bg-base, #0d0d10)",
    color: "var(--text-main, #e4e4e7)",
    fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
  } as React.CSSProperties,
  header: {
    display: "flex",
    alignItems: "center",
    padding: "0 12px",
    height: "35px",
    backgroundColor: "var(--bg-panel, #141417)",
    borderBottom: "1px solid #27272a",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    fontWeight: 600,
    fontFamily: "Inter, sans-serif",
  } as React.CSSProperties,
  tabActive: {
    display: "flex",
    alignItems: "center",
    height: "100%",
    color: "var(--text-main, #e4e4e7)",
    borderBottom: "2px solid #e4e4e7",
    marginRight: "16px",
  } as React.CSSProperties,
  clearBtn: {
    marginLeft: "auto",
    background: "none",
    border: "none",
    color: "var(--text-muted, #71717a)",
    cursor: "pointer",
    fontSize: "11px",
  } as React.CSSProperties,
  content: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 12px",
  } as React.CSSProperties,
  empty: {
    color: "var(--text-muted, #71717a)",
    fontSize: "12px",
    fontFamily: "Inter, sans-serif",
  } as React.CSSProperties,
  logLine: {
    fontSize: "12px",
    marginBottom: "4px",
    wordBreak: "break-all",
    whiteSpace: "pre-wrap",
    lineHeight: 1.4,
  } as React.CSSProperties,
  timestamp: {
    color: "var(--text-muted, #71717a)",
    marginRight: "8px",
  } as React.CSSProperties,
  source: {
    color: "#60a5fa",
    marginRight: "8px",
  } as React.CSSProperties,
  message: {
    color: "#d4d4d8",
  } as React.CSSProperties,
};
