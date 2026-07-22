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
      backgroundColor: "#1e1e1e",
      borderRadius: "8px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
      border: "1px solid #3f3f46",
      display: "flex",
      flexDirection: "column" as const,
      overflow: "hidden",
      zIndex: 1000,
    },
    header: {
      padding: "12px 16px",
      backgroundColor: "var(--border-color, #27272a)",
      color: "var(--text-main, #e4e4e7)",
      fontSize: "13px",
      fontWeight: 500,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: "1px solid #3f3f46",
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
      backgroundColor: "#1e1e1e",
      borderBottom: "1px solid #3f3f46",
      overflowX: "auto" as const,
    },
    tab: (isActive: boolean) => ({
      padding: "8px 16px",
      fontSize: "12px",
      color: isActive ? "#fff" : "var(--text-muted, #a1a1aa)",
      backgroundColor: isActive ? "var(--border-color, #27272a)" : "transparent",
      borderRight: "1px solid #3f3f46",
      cursor: "pointer",
      whiteSpace: "nowrap" as const,
    }),
    editorWrapper: {
      flex: 1,
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          AI Composer Review
        </div>
        <div style={styles.actions}>
          <button style={styles.btnReject} onClick={onReject}>Reject</button>
          <button style={styles.btnAccept} onClick={onAccept}>Accept</button>
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
            renderSideBySide: true,
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
