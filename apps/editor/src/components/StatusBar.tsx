interface StatusBarProps {
  repoPath?: string;
  activeLanguage?: string;
  cursorSymbol?: string;
}

export function StatusBar({ repoPath, activeLanguage, cursorSymbol }: StatusBarProps) {
  return (
    <footer style={styles.statusBar}>
      <div style={styles.leftGroup}>
        <span style={styles.statusItem}>
          <span style={styles.icon}>main</span>
        </span>
        {repoPath && (
          <span style={styles.statusItem}>
            {repoPath.split(/[/\\]/).pop()}
          </span>
        )}
        {cursorSymbol && (
          <span style={styles.statusItem}>
            Symbol: {cursorSymbol}
          </span>
        )}
      </div>

      <div style={styles.rightGroup}>
        <span style={styles.statusItem}>Ln 1, Col 1</span>
        <span style={styles.statusItem}>Spaces: 2</span>
        <span style={styles.statusItem}>UTF-8</span>
        <span style={styles.statusItem}>{activeLanguage ? activeLanguage.toUpperCase() : "PLAINTEXT"}</span>
        <span style={styles.statusBadge}>ATLAS AI</span>
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
    padding: "0 12px",
    backgroundColor: "#09090b",
    borderTop: "1px solid #27272a",
    fontSize: "11px",
    color: "#71717a",
    userSelect: "none",
  },
  leftGroup: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  rightGroup: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  statusItem: {
    color: "#a1a1aa",
    display: "flex",
    alignItems: "center",
  },
  icon: {
    color: "#fafafa",
    fontWeight: 600,
  },
  statusBadge: {
    color: "#fafafa",
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    padding: "1px 6px",
    borderRadius: "3px",
    fontSize: "10px",
    fontWeight: 700,
  },
};
