import React, { useEffect, useState } from "react";
import * as monaco from "monaco-editor";

interface Problem {
  marker: monaco.editor.IMarker;
}

export function ProblemsPanel({
  onJump,
}: {
  onJump?: (path: string, line: number, column: number) => void;
}) {
  const [problems, setProblems] = useState<Problem[]>([]);

  useEffect(() => {
    const update = () => {
      const markers = monaco.editor.getModelMarkers({});
      setProblems(markers.map((m) => ({ marker: m })));
    };
    update();
    const sub = monaco.editor.onDidChangeMarkers(update);
    return () => sub.dispose();
  }, []);

  const grouped = problems.reduce((acc, p) => {
    const path = p.marker.resource.path.replace(/^\/([a-zA-Z]:\/)/, "$1").replace(/\//g, "\\");
    if (!acc[path]) acc[path] = [];
    acc[path].push(p);
    return acc;
  }, {} as Record<string, Problem[]>);

  const errorsCount = problems.filter(
    (p) => p.marker.severity === monaco.MarkerSeverity.Error
  ).length;
  const warningsCount = problems.filter(
    (p) => p.marker.severity === monaco.MarkerSeverity.Warning
  ).length;

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.tabActive}>
          Problems <span style={s.badge}>{problems.length}</span>
        </div>
        <div style={s.summary}>
          {errorsCount > 0 && <span style={s.errorTxt}>âœ˜ {errorsCount}</span>}
          {warningsCount > 0 && <span style={s.warnTxt}>âš  {warningsCount}</span>}
        </div>
      </div>
      <div style={s.content}>
        {problems.length === 0 ? (
          <div style={s.empty}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom: "12px", opacity: 0.8}}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <div>No problems have been detected in the workspace.</div>
            <div style={{fontSize: "11px", color: "#64748b", marginTop: "8px"}}>All clear!</div>
          </div>
        ) : (
          Object.entries(grouped).map(([path, fileProblems]) => (
            <div key={path} style={s.fileGroup}>
              <div style={s.filePath}>
                <span style={s.fileIcon}>ðŸ“„</span>
                {path}
                <span style={s.fileBadge}>{fileProblems.length}</span>
              </div>
              {fileProblems.map((p, i) => (
                <div
                  key={i}
                  style={s.problemRow}
                  onClick={() =>
                    onJump && onJump(path, p.marker.startLineNumber, p.marker.startColumn)
                  }
                >
                  <span
                    style={{
                      ...s.severityIcon,
                      color:
                        p.marker.severity === monaco.MarkerSeverity.Error
                          ? "#f87171"
                          : p.marker.severity === monaco.MarkerSeverity.Warning
                          ? "#fbbf24"
                          : "#60a5fa",
                    }}
                  >
                    {p.marker.severity === monaco.MarkerSeverity.Error
                      ? "âœ˜"
                      : p.marker.severity === monaco.MarkerSeverity.Warning
                      ? "âš "
                      : "â„¹"}
                  </span>
                  <span style={s.problemMsg}>{p.marker.message}</span>
                  <span style={s.problemSource}>
                    {p.marker.source ? `[${p.marker.source}]` : ""}
                  </span>
                  <span style={s.problemLocation}>
                    Ln {p.marker.startLineNumber}, Col {p.marker.startColumn}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const s = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#000000",
    color: "#e4e4e7",
    fontFamily: "Inter, sans-serif",
  } as React.CSSProperties,
  header: {
    display: "flex",
    alignItems: "center",
    padding: "0 12px",
    height: "35px",
    backgroundColor: "#000000",
    borderBottom: "1px solid #38bdf8",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    fontWeight: 600,
  } as React.CSSProperties,
  tabActive: {
    display: "flex",
    alignItems: "center",
    height: "100%",
    color: "#e4e4e7",
    borderBottom: "2px solid #38bdf8",
    marginRight: "16px",
  } as React.CSSProperties,
  badge: {
    backgroundColor: "#050505",
    padding: "2px 6px",
    borderRadius: "10px",
    marginLeft: "6px",
    fontSize: "10px",
    color: "#94a3b8",
  } as React.CSSProperties,
  summary: {
    display: "flex",
    gap: "12px",
    marginLeft: "auto",
    fontSize: "12px",
  } as React.CSSProperties,
  errorTxt: {
    color: "#f87171",
  } as React.CSSProperties,
  warnTxt: {
    color: "#fbbf24",
  } as React.CSSProperties,
  content: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 0",
  } as React.CSSProperties,
  empty: {
    padding: "40px 20px",
    color: "#94a3b8",
    textAlign: "center",
    fontSize: "13px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  } as React.CSSProperties,
  fileGroup: {
    marginBottom: "12px",
  } as React.CSSProperties,
  filePath: {
    display: "flex",
    alignItems: "center",
    padding: "4px 12px",
    fontSize: "12px",
    fontWeight: 600,
    color: "#e4e4e7",
    backgroundColor: "#050505",
  } as React.CSSProperties,
  fileIcon: {
    marginRight: "6px",
    fontSize: "14px",
  } as React.CSSProperties,
  fileBadge: {
    backgroundColor: "#000000",
    color: "#fff",
    padding: "2px 6px",
    borderRadius: "10px",
    fontSize: "10px",
    marginLeft: "8px",
  } as React.CSSProperties,
  problemRow: {
    display: "flex",
    alignItems: "center",
    padding: "6px 12px 6px 28px",
    fontSize: "12px",
    cursor: "pointer",
    borderBottom: "1px solid #38bdf8",
    transition: "background-color 0.15s",
  } as React.CSSProperties,
  severityIcon: {
    marginRight: "8px",
    fontSize: "14px",
  } as React.CSSProperties,
  problemMsg: {
    flex: 1,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    marginRight: "12px",
  } as React.CSSProperties,
  problemSource: {
    color: "#64748b",
    marginRight: "12px",
    fontSize: "11px",
  } as React.CSSProperties,
  problemLocation: {
    color: "#64748b",
    fontSize: "11px",
    minWidth: "70px",
    textAlign: "right",
  } as React.CSSProperties,
};
