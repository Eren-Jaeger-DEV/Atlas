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
          ✕ Close Diff
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
    backgroundColor: "#101014",
    color: "#ccc",
    fontFamily: "Consolas, 'Courier New', monospace",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    backgroundColor: "#16161e",
    borderBottom: "1px solid #282833",
  },
  title: {
    fontSize: "12px",
    fontWeight: "bold",
    color: "#61afef",
  },
  closeButton: {
    background: "#282833",
    border: "none",
    color: "#ccc",
    padding: "4px 8px",
    borderRadius: "3px",
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
    padding: "1px 8px",
    fontSize: "12px",
    color: "#abb2bf",
  },
  lineAdd: {
    display: "flex",
    padding: "1px 8px",
    fontSize: "12px",
    backgroundColor: "#1e3a1e",
    color: "#98c379",
  },
  lineDel: {
    display: "flex",
    padding: "1px 8px",
    fontSize: "12px",
    backgroundColor: "#3a1e1e",
    color: "#e06c75",
  },
  lineHeader: {
    display: "flex",
    padding: "1px 8px",
    fontSize: "12px",
    backgroundColor: "#1e2a3a",
    color: "#61afef",
  },
  lineNumber: {
    width: "40px",
    color: "#5c6370",
    textAlign: "right",
    paddingRight: "12px",
    userSelect: "none",
  },
  lineContent: {
    whiteSpace: "pre-wrap",
  },
  noDiff: {
    padding: "16px",
    color: "#5c6370",
    fontSize: "12px",
  },
};
