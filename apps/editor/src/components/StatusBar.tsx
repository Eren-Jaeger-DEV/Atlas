import React, { useState } from "react";

interface StatusBarProps {
  repoPath?: string;
  activeLanguage?: string;
  cursorSymbol?: string;
  cursorLine?: number;
  cursorCol?: number;
  lsStatus?: "loading" | "ready" | "error";
  healthScore?: number | null;
}

export function StatusBar({ repoPath, activeLanguage, cursorSymbol, cursorLine = 1, cursorCol = 1, lsStatus = "ready", healthScore }: StatusBarProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const StatusItem = ({ id, children, isBlue, noPad, leftPad, rightPad }: { id: string; children: React.ReactNode; isBlue?: boolean, noPad?: boolean, leftPad?: string, rightPad?: string }) => {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: "100%",
          padding: noPad ? "0" : `0 ${rightPad || '8px'} 0 ${leftPad || '8px'}`,
          backgroundColor: isBlue 
            ? (hovered === id ? "#0284c7" : "#0ea5e9") 
            : (hovered === id ? "rgba(255,255,255,0.12)" : "transparent"),
          color: isBlue ? "#ffffff" : "#e4e4e7",
          cursor: "pointer",
          transition: "background-color 0.1s",
          gap: "4px"
        }}
        onMouseEnter={() => setHovered(id)}
        onMouseLeave={() => setHovered(null)}
      >
        {children}
      </div>
    );
  };

  const branchName = repoPath ? "main*" : "main";

  return (
    <footer style={styles.statusBar}>
      <div style={styles.leftGroup}>
        <StatusItem id="remote" isBlue noPad>
          <div style={{ padding: "0 12px", display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: "bold", fontFamily: "monospace", letterSpacing: "-1px" }}>&gt;&lt;</span>
          </div>
        </StatusItem>
        
        <StatusItem id="branch">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="3" x2="6" y2="15"></line>
            <circle cx="18" cy="6" r="3"></circle>
            <circle cx="6" cy="18" r="3"></circle>
            <path d="M18 9a9 9 0 0 1-9 9"></path>
          </svg>
          <span style={{ fontSize: "11px", marginTop: "1px" }}>{branchName}</span>
        </StatusItem>

        <StatusItem id="sync">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M2.13 15.57a9 9 0 1 0 3.84-10.36L2 8"></path>
          </svg>
          <span style={{ fontSize: "11px", marginTop: "1px", marginLeft: "2px" }}>0</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "2px" }}>
            <line x1="12" y1="19" x2="12" y2="5"></line>
            <polyline points="5 12 12 19 19 12"></polyline>
          </svg>
          <span style={{ fontSize: "11px", marginTop: "1px", marginLeft: "2px" }}>1</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "2px" }}>
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <polyline points="19 12 12 5 5 12"></polyline>
          </svg>
        </StatusItem>

        <StatusItem id="problems">
          <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <span style={{ fontSize: "11px", marginTop: "1px", marginRight: "4px" }}>0</span>
            
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span style={{ fontSize: "11px", marginTop: "1px" }}>0</span>
          </div>
        </StatusItem>
      </div>

      <div style={styles.rightGroup}>
        {cursorSymbol && (
          <StatusItem id="symbol">
            <span style={{ fontSize: "11px", marginTop: "1px" }}>{cursorSymbol}</span>
          </StatusItem>
        )}
        <StatusItem id="cursor">
          <span style={{ fontSize: "11px", marginTop: "1px" }}>Ln {cursorLine}, Col {cursorCol}</span>
        </StatusItem>
        
        <StatusItem id="spaces">
          <span style={{ fontSize: "11px", marginTop: "1px" }}>Spaces: 2</span>
        </StatusItem>
        
        <StatusItem id="encoding">
          <span style={{ fontSize: "11px", marginTop: "1px" }}>UTF-8</span>
        </StatusItem>
        
        <StatusItem id="lf">
          <span style={{ fontSize: "11px", marginTop: "1px" }}>LF</span>
        </StatusItem>
        
        <StatusItem id="language">
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "12px", fontWeight: "bold", fontFamily: "monospace" }}>{"{}"}</span>
            <span style={{ fontSize: "11px", marginTop: "1px" }}>{activeLanguage ? activeLanguage.toUpperCase() : "TYPESCRIPT JSX"}</span>
            {lsStatus === "ready" && <div className="status-live-indicator" style={{ marginLeft: "4px" }} title="Language Server Ready" />}
            {lsStatus === "loading" && <div className="status-warn-indicator" style={{ marginLeft: "4px", backgroundColor: "#38bdf8" }} title="Language Server Loading..." />}
            {lsStatus === "error" && <div className="status-warn-indicator" style={{ marginLeft: "4px", backgroundColor: "#f87171" }} title="Language Server Error" />}
          </div>
        </StatusItem>

        {healthScore !== undefined && (
          <StatusItem id="health">
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
              <span style={{ fontSize: "11px", marginTop: "1px" }}>
                {healthScore !== null ? `Health: ${healthScore}%` : "Health: --"}
              </span>
            </div>
          </StatusItem>
        )}

        <StatusItem id="prettier">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </StatusItem>

        <StatusItem id="atlas">
          <span style={{ fontSize: "11px", marginTop: "1px" }}>Atlas Studio</span>
        </StatusItem>

        <StatusItem id="bell">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        </StatusItem>
      </div>
    </footer>
  );
}

const styles: Record<string, React.CSSProperties> = {
  statusBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: "22px",
    backgroundColor: "#000000",
    borderTop: "1px solid #38bdf8",
    color: "#e4e4e7",
    userSelect: "none",
  },
  leftGroup: {
    display: "flex",
    alignItems: "center",
    height: "100%",
  },
  rightGroup: {
    display: "flex",
    alignItems: "center",
    height: "100%",
  }
};
