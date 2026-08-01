import React, { useState } from "react";
import { BookOpen, Play, Plus, RefreshCw, CheckCircle2, AlertCircle, Code, Layers } from "lucide-react";
import { reactiveNotebookEngine, type NotebookDocument, type NotebookCell } from "@atlas/core";

export function AtlasCanvasPanel() {
  const [doc, setDoc] = useState<NotebookDocument>(reactiveNotebookEngine.createNotebook("Atlas Reactive Canvas"));
  const [executingId, setExecutingId] = useState<string | null>(null);

  const handleRunCell = (cellId: string) => {
    setExecutingId(cellId);
    setTimeout(() => {
      const updated = reactiveNotebookEngine.executeCell(doc, cellId);
      setDoc(updated);
      setExecutingId(null);
    }, 250);
  };

  const handleAddCell = () => {
    const newCell: NotebookCell = {
      id: `cell-${Date.now()}`,
      language: "typescript",
      code: "// Add reactive logic here\nconst result = processedSum * 2;",
      outputs: [],
      status: "idle",
      readsVariables: ["processedSum"],
      writesVariables: ["result"],
    };

    setDoc((prev) => ({
      ...prev,
      cells: [...prev.cells, newCell],
      updatedAt: new Date().toISOString(),
    }));
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <BookOpen size={16} color="#ec4899" />
          <span style={styles.title}>ATLAS CANVAS — REACTIVE NOTEBOOK (.atlas-nb)</span>
        </div>
        <button style={styles.addBtn} onClick={handleAddCell}>
          <Plus size={12} color="#ffffff" />
          <span>Add Cell</span>
        </button>
      </div>

      {/* Notebook Title Bar */}
      <div style={styles.docBanner}>
        <span style={styles.docTitle}>{doc.title}</span>
        <span style={styles.docMeta}>
          {doc.cells.length} cells • Last updated {new Date(doc.updatedAt).toLocaleTimeString()}
        </span>
      </div>

      {/* Cells Stream */}
      <div style={styles.cellsStream}>
        {doc.cells.map((cell, idx) => (
          <div key={cell.id} style={styles.cellCard}>
            {/* Cell Toolbar Header */}
            <div style={styles.cellHeader}>
              <span style={styles.cellIndex}>[{cell.executionCount || " "}] Cell {idx + 1}</span>
              <span style={styles.langBadge}>{cell.language}</span>

              {/* Variable dependency chips */}
              {cell.writesVariables.length > 0 && (
                <span style={styles.depChip}>
                  <Layers size={10} color="#ec4899" />
                  writes: {cell.writesVariables.join(", ")}
                </span>
              )}

              <button
                style={styles.runCellBtn}
                onClick={() => handleRunCell(cell.id)}
                disabled={executingId === cell.id}
              >
                <Play size={10} className={executingId === cell.id ? "spin" : ""} color="#ffffff" />
                <span>Run</span>
              </button>
            </div>

            {/* Code Box */}
            <pre style={styles.codeEditor}>{cell.code}</pre>

            {/* Cell Outputs */}
            {cell.outputs.length > 0 && (
              <div style={styles.outputBox}>
                <div style={styles.outputHeader}>
                  {cell.status === "success" ? (
                    <CheckCircle2 size={12} color="#34d399" />
                  ) : (
                    <AlertCircle size={12} color="#ef4444" />
                  )}
                  <span>OUTPUT</span>
                </div>
                {cell.outputs.map((out, oIdx) => (
                  <pre key={oIdx} style={styles.outputText}>
                    {out.content}
                  </pre>
                ))}
              </div>
            )}
          </div>
        ))}
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
    color: "#ec4899",
    fontSize: "11px",
  },
  addBtn: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    backgroundColor: "#db2777",
    border: "none",
    borderRadius: "4px",
    color: "#ffffff",
    padding: "4px 8px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
  },
  docBanner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 14px",
    backgroundColor: "#0d0d10",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  docTitle: {
    fontWeight: 700,
    color: "#e4e4e7",
  },
  docMeta: {
    fontSize: "10px",
    color: "#71717a",
  },
  cellsStream: {
    flex: 1,
    overflowY: "auto",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  cellCard: {
    backgroundColor: "#111113",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "6px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  cellHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 10px",
    backgroundColor: "rgba(255,255,255,0.02)",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  cellIndex: {
    fontFamily: "monospace",
    fontSize: "10px",
    color: "#ec4899",
    fontWeight: 700,
  },
  langBadge: {
    fontSize: "9px",
    color: "#a1a1aa",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: "1px 5px",
    borderRadius: "3px",
  },
  depChip: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "9px",
    color: "#ec4899",
    backgroundColor: "rgba(236, 72, 153, 0.1)",
    padding: "1px 6px",
    borderRadius: "3px",
    marginLeft: "auto",
  },
  runCellBtn: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    backgroundColor: "#be185d",
    border: "none",
    borderRadius: "3px",
    color: "#ffffff",
    padding: "3px 8px",
    fontSize: "10px",
    fontWeight: 600,
    cursor: "pointer",
  },
  codeEditor: {
    margin: 0,
    padding: "10px 12px",
    fontFamily: "'JetBrains Mono', Consolas, monospace",
    fontSize: "11px",
    color: "#f4f4f5",
    backgroundColor: "#09090b",
    lineHeight: 1.5,
    overflowX: "auto",
  },
  outputBox: {
    borderTop: "1px solid rgba(255,255,255,0.04)",
    backgroundColor: "#0d0d10",
    padding: "8px 12px",
  },
  outputHeader: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "9px",
    fontWeight: 700,
    color: "#71717a",
    letterSpacing: "0.06em",
    marginBottom: "4px",
  },
  outputText: {
    margin: 0,
    fontFamily: "'JetBrains Mono', Consolas, monospace",
    fontSize: "10px",
    color: "#34d399",
    whiteSpace: "pre-wrap",
  },
};
