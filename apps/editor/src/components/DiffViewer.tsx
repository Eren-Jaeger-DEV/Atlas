interface DiffViewerProps {
  filePath?: string;
  diffText: string;
  onClose: () => void;
}

export function DiffViewer({ filePath, diffText, onClose }: DiffViewerProps) {
  const lines = diffText.split("\n");

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Diff: {filePath}</span>
        <button style={styles.closeButton} onClick={onClose}>
          Close Diff
        </button>
      </div>
      <div style={styles.diffBody}>
        {lines.length === 0 || !diffText.trim() ? (
          <p style={styles.noDiff}>No changes detected in file.</p>
        ) : (
          lines.map((line, idx) => {
            let lineStyle = styles.lineNormal;
            if (line.startsWith("+")) lineStyle = styles.lineAdd;
            else if (line.startsWith("-")) lineStyle = styles.lineDel;
            else if (line.startsWith("@@")) lineStyle = styles.lineHeader;

            return (
              <div key={idx} style={lineStyle}>
                <span style={styles.lineNumber}>{idx + 1}</span>
                <span style={styles.lineContent}>{line}</span>
              </div>
            );
          })
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
    backgroundColor: "var(--bg-base, #09090b)",
    color: "var(--text-main, #fafafa)",
    fontFamily: "'JetBrains Mono', Consolas, monospace",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 14px",
    backgroundColor: "var(--bg-base, #0d0d10)",
    borderBottom: "1px solid #27272a",
  },
  title: {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-main, #fafafa)",
  },
  closeButton: {
    background: "var(--bg-header, #18181b)",
    border: "1px solid #27272a",
    color: "var(--text-main, #fafafa)",
    padding: "4px 10px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "11px",
  },
  diffBody: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 0",
  },
  lineNormal: {
    display: "flex",
    padding: "2px 12px",
    fontSize: "12px",
    color: "var(--text-muted, #a1a1aa)",
  },
  lineAdd: {
    display: "flex",
    padding: "2px 12px",
    fontSize: "12px",
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    color: "#4ade80",
  },
  lineDel: {
    display: "flex",
    padding: "2px 12px",
    fontSize: "12px",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "#f87171",
  },
  lineHeader: {
    display: "flex",
    padding: "2px 12px",
    fontSize: "12px",
    backgroundColor: "var(--bg-header, #18181b)",
    color: "var(--text-main, #e4e4e7)",
  },
  lineNumber: {
    width: "40px",
    color: "var(--text-muted, #71717a)",
    textAlign: "right",
    paddingRight: "14px",
    userSelect: "none",
  },
  lineContent: {
    whiteSpace: "pre-wrap",
  },
  noDiff: {
    padding: "20px",
    color: "var(--text-muted, #71717a)",
    fontSize: "12px",
  },
};
