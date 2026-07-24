interface BreadcrumbProps {
  filePath?: string;
  repoPath?: string;
  cursorSymbol?: string;
}

export function Breadcrumb({ filePath, repoPath, cursorSymbol }: BreadcrumbProps) {
  if (!filePath) return null;

  let relPath = filePath;
  if (repoPath && filePath.startsWith(repoPath)) {
    relPath = filePath.substring(repoPath.length).replace(/^[/\\]+/, "");
  }

  const parts = relPath.split(/[/\\]/);

  return (
    <div style={styles.container}>
      {parts.map((part, i) => (
        <span key={i} style={styles.item}>
          {i > 0 && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2" style={styles.separatorSvg}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
          <span style={(i === parts.length - 1 && !cursorSymbol) ? styles.activePart : styles.part}>{part}</span>
        </span>
      ))}
      
      {cursorSymbol && (
        <span style={styles.item}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" style={styles.separatorSvg}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span style={styles.symbolPart}>{cursorSymbol}</span>
        </span>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    height: "26px",
    padding: "0 12px",
    backgroundColor: "transparent",
    borderBottom: "1px solid var(--border-subtle)",
    fontSize: "11.5px",
    fontFamily: "var(--font-mono, monospace)",
    color: "var(--text-faint)",
    userSelect: "none",
    overflowX: "auto",
    whiteSpace: "nowrap",
  },
  item: {
    display: "flex",
    alignItems: "center",
  },
  separatorSvg: {
    margin: "0 4px",
    opacity: 0.6,
  },
  part: {
    cursor: "pointer",
    transition: "color 0.1s",
    color: "var(--text-muted)",
  },
  activePart: {
    color: "var(--text-main)",
    fontWeight: 500,
  },
  symbolPart: {
    color: "var(--accent)",
    fontWeight: 500,
  },
};
