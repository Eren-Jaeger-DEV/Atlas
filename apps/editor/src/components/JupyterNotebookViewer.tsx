import React from "react";

export interface NotebookCell {
  cell_type: "code" | "markdown";
  source: string[];
  execution_count?: number | null;
  outputs?: Array<{ text?: string[]; data?: Record<string, string[]> }>;
}

export interface NotebookContent {
  cells: NotebookCell[];
  metadata?: Record<string, any>;
}

interface JupyterNotebookViewerProps {
  content: NotebookContent;
}

export function JupyterNotebookViewer({ content }: JupyterNotebookViewerProps) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #38bdf8)" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        <span style={styles.title}>JUPYTER NOTEBOOK VIEWER</span>
        <span style={styles.cellBadge}>{content.cells.length} Cells</span>
      </div>

      <div style={styles.body}>
        {content.cells.map((cell, idx) => {
          const sourceText = Array.isArray(cell.source) ? cell.source.join("") : (cell.source as string || "");

          return (
            <div key={idx} style={cell.cell_type === "code" ? styles.codeCell : styles.markdownCell}>
              <div style={styles.cellMeta}>
                <span style={styles.cellTypeLabel}>{cell.cell_type.toUpperCase()}</span>
                {cell.cell_type === "code" && (
                  <span style={styles.execCount}>
                    In [{cell.execution_count ?? " "}]
                  </span>
                )}
              </div>

              {/* Source Code / Text */}
              <pre style={styles.sourceText}>{sourceText}</pre>

              {/* Output Preview */}
              {cell.outputs && cell.outputs.length > 0 && (
                <div style={styles.outputBox}>
                  <div style={styles.outputHeader}>Output:</div>
                  {cell.outputs.map((out, oIdx) => {
                    const text = out.text ? out.text.join("") : JSON.stringify(out.data || {});
                    return (
                      <pre key={oIdx} style={styles.outputText}>
                        {text}
                      </pre>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: "var(--bg-base, #09090b)",
    border: "1px solid var(--border-strong, #27272a)",
    borderRadius: "var(--radius-md, 8px)",
    overflow: "hidden",
    fontFamily: "monospace",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    backgroundColor: "var(--bg-panel, #18181b)",
    borderBottom: "1px solid var(--border-subtle, #27272a)",
  },
  title: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--accent, #38bdf8)",
    letterSpacing: "0.8px",
  },
  cellBadge: {
    marginLeft: "auto",
    fontSize: "10px",
    fontWeight: 600,
    color: "var(--text-muted, #a1a1aa)",
    backgroundColor: "var(--bg-base, #09090b)",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  body: {
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    maxHeight: "600px",
    overflow: "auto",
  },
  codeCell: {
    backgroundColor: "var(--bg-panel, #18181b)",
    border: "1px solid var(--border-subtle, #27272a)",
    borderRadius: "6px",
    padding: "10px",
  },
  markdownCell: {
    backgroundColor: "rgba(39, 39, 42, 0.4)",
    border: "1px stroke var(--border-subtle, #27272a)",
    borderRadius: "6px",
    padding: "10px",
  },
  cellMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px",
  },
  cellTypeLabel: {
    fontSize: "9px",
    fontWeight: 700,
    color: "var(--accent, #38bdf8)",
  },
  execCount: {
    fontSize: "10px",
    color: "var(--text-muted, #a1a1aa)",
  },
  sourceText: {
    margin: 0,
    fontSize: "12px",
    color: "var(--text-main, #fafafa)",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  outputBox: {
    marginTop: "8px",
    padding: "8px",
    backgroundColor: "var(--bg-base, #09090b)",
    border: "1px solid var(--border-subtle, #27272a)",
    borderRadius: "4px",
  },
  outputHeader: {
    fontSize: "10px",
    fontWeight: 600,
    color: "#34d399",
    marginBottom: "4px",
  },
  outputText: {
    margin: 0,
    fontSize: "11px",
    color: "var(--text-muted, #a1a1aa)",
    whiteSpace: "pre-wrap",
  },
};
