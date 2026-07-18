interface PeekOverlayProps {
  symbolName: string;
  filePath?: string;
  codeSnippet?: string;
  onClose: () => void;
}

export function PeekOverlay({
  symbolName,
  filePath = "src/index.ts",
  codeSnippet = "// Symbol definition preview\nexport function example() { return true; }",
  onClose,
}: PeekOverlayProps) {
  return (
    <div style={styles.overlay}>
      <div style={styles.header}>
        <div style={styles.titleGroup}>
          <span style={styles.symbolTag}>PEEK DEFINITION</span>
          <span style={styles.symbolName}>{symbolName}</span>
          <span style={styles.filePath}>{filePath}</span>
        </div>
        <button style={styles.closeBtn} onClick={onClose}>✕</button>
      </div>

      <div style={styles.codeBody}>
        <pre style={styles.pre}>{codeSnippet}</pre>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "absolute",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "80%",
    maxHeight: "220px",
    backgroundColor: "#141417",
    border: "1px solid #3f3f46",
    borderRadius: "6px",
    boxShadow: "0 12px 36px rgba(0,0,0,0.7)",
    zIndex: 999,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 12px",
    backgroundColor: "#18181b",
    borderBottom: "1px solid #27272a",
  },
  titleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "12px",
  },
  symbolTag: {
    fontSize: "10px",
    fontWeight: 700,
    color: "#38bdf8",
    letterSpacing: "0.5px",
  },
  symbolName: {
    fontWeight: 700,
    color: "#fafafa",
  },
  filePath: {
    color: "#71717a",
    fontSize: "11px",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#a1a1aa",
    cursor: "pointer",
    fontSize: "12px",
  },
  codeBody: {
    flex: 1,
    padding: "10px",
    backgroundColor: "#09090b",
    overflow: "auto",
  },
  pre: {
    margin: 0,
    fontFamily: "'JetBrains Mono', Consolas, monospace",
    fontSize: "12px",
    color: "#e4e4e7",
  },
};
