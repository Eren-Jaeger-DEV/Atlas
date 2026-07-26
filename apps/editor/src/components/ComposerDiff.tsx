import { useRef, useEffect, useState } from "react";
import { DiffEditor, loader } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import * as monaco from "monaco-editor";

loader.config({ monaco });

interface ComposerDiffProps {
  filesBefore: Record<string, string>;
  filesAfter: Record<string, string>;
  language: string;
  width?: number;
  height?: number;
  onAccept?: () => void;
  onReject?: () => void;
}

export function ComposerDiff({
  filesBefore,
  filesAfter,
  language,
  width = 800,
  height = 500,
  onAccept,
  onReject,
}: ComposerDiffProps) {
  const filePaths = Object.keys(filesAfter);
  const [activeFile, setActiveFile] = useState(filePaths[0] || "");
  const [isSideBySide, setIsSideBySide] = useState(true);
  const editorRef = useRef<Monaco.editor.IStandaloneDiffEditor | null>(null);

  const handleMount = (editor: Monaco.editor.IStandaloneDiffEditor, monacoApi: typeof Monaco) => {
    editorRef.current = editor;
  };

  const styles = {
    container: {
      position: "fixed" as const,
      top: "10%",
      left: "50%",
      transform: "translateX(-50%)",
      width: `${width}px`,
      height: `${height}px`,
      backgroundColor: "rgba(9, 9, 11, 0.85)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      borderRadius: "12px",
      boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      display: "flex",
      flexDirection: "column" as const,
      overflow: "hidden",
      zIndex: 1000,
    },
    header: {
      padding: "12px 16px",
      backgroundColor: "transparent",
      color: "var(--text-main, #e4e4e7)",
      fontSize: "13px",
      fontWeight: 500,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    },
    title: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    actions: {
      display: "flex",
      gap: "8px",
    },
    btnAccept: {
      background: "#10b981",
      color: "#fff",
      border: "none",
      padding: "6px 12px",
      borderRadius: "4px",
      fontSize: "12px",
      cursor: "pointer",
      fontWeight: 500,
    },
    btnReject: {
      background: "transparent",
      color: "var(--text-main, #e4e4e7)",
      border: "1px solid #52525b",
      padding: "6px 12px",
      borderRadius: "4px",
      fontSize: "12px",
      cursor: "pointer",
    },
    fileTabs: {
      display: "flex",
      backgroundColor: "transparent",
      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
      overflowX: "auto" as const,
    },
    tab: (isActive: boolean) => ({
      padding: "8px 16px",
      fontSize: "12px",
      color: isActive ? "#fff" : "var(--text-muted, #a1a1aa)",
      backgroundColor: isActive ? "rgba(255, 255, 255, 0.05)" : "transparent",
      borderRight: "1px solid rgba(255, 255, 255, 0.05)",
      cursor: "pointer",
      whiteSpace: "nowrap" as const,
    }),
    editorWrapper: {
      flex: 1,
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+J: Next hunk / file
      if (e.altKey && e.code === "KeyJ") {
        e.preventDefault();
        const currentIdx = filePaths.indexOf(activeFile);
        if (currentIdx < filePaths.length - 1) {
          setActiveFile(filePaths[currentIdx + 1]);
        }
      }
      // Alt+K: Previous hunk / file
      else if (e.altKey && e.code === "KeyK") {
        e.preventDefault();
        const currentIdx = filePaths.indexOf(activeFile);
        if (currentIdx > 0) {
          setActiveFile(filePaths[currentIdx - 1]);
        }
      }
      // Alt+Enter: Accept
      else if (e.altKey && e.code === "Enter") {
        e.preventDefault();
        onAccept?.();
      }
      // Alt+Shift+Backspace: Reject
      else if (e.altKey && e.shiftKey && e.code === "Backspace") {
        e.preventDefault();
        onReject?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeFile, filePaths, onAccept, onReject]);

  return (
    <div style={styles.container} className="anim-scale-in">
      <div style={styles.header}>
        <div style={styles.title}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          AI Composer Review
          <span style={{ fontSize: "11px", color: "var(--text-muted, #a1a1aa)", marginLeft: "8px", fontWeight: "normal" }}>
            (Alt+J/K: Navigate · Alt+Enter: Accept · Alt+Shift+Backspace: Reject)
          </span>
        </div>
        <div style={styles.actions}>
          <button
            onClick={() => setIsSideBySide(!isSideBySide)}
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "#38bdf8",
              border: "1px solid rgba(56,189,248,0.3)",
              padding: "5px 10px",
              borderRadius: "4px",
              fontSize: "11px",
              cursor: "pointer",
              fontWeight: 600,
              fontFamily: "var(--font-mono)",
              marginRight: "4px"
            }}
            title="Toggle Split / Unified View"
          >
            {isSideBySide ? "Split View" : "Inline View"}
          </button>
          <button style={styles.btnReject} onClick={onReject} title="Alt+Shift+Backspace">Reject</button>
          <button style={styles.btnAccept} onClick={onAccept} title="Alt+Enter">Accept All</button>
        </div>
      </div>
      {filePaths.length > 1 && (
        <div style={styles.fileTabs}>
          {filePaths.map((fp) => (
            <div
              key={fp}
              style={styles.tab(fp === activeFile)}
              onClick={() => setActiveFile(fp)}
            >
              {fp.split("/").pop()}
            </div>
          ))}
        </div>
      )}
      <div style={styles.editorWrapper}>
        <DiffEditor
          height="100%"
          language={language}
          theme="vs-dark"
          original={filesBefore[activeFile] || ""}
          modified={filesAfter[activeFile] || ""}
          onMount={handleMount as any}
          options={{
            renderSideBySide: isSideBySide,
            readOnly: true,
            minimap: { enabled: false },
            fontFamily: "JetBrains Mono, 'Courier New', monospace",
            fontSize: 13,
            scrollBeyondLastLine: false,
          }}
        />
      </div>
    </div>
  );
}
