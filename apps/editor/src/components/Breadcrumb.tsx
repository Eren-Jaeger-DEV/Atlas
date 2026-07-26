interface BreadcrumbProps {
  filePath?: string;
  repoPath?: string;
  cursorSymbol?: string;
  language?: string;
  onFormat?: () => void;
  onFind?: () => void;
}

export function Breadcrumb({ filePath, repoPath, cursorSymbol, language, onFormat, onFind }: BreadcrumbProps) {
  if (!filePath) return null;

  let relPath = filePath;
  if (repoPath && filePath.startsWith(repoPath)) {
    relPath = filePath.substring(repoPath.length).replace(/^[/\\]+/, "");
  }

  const parts = relPath.split(/[/\\]/);

  return (
    <div style={styles.container}>
      <div style={styles.leftGroup}>
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

      <div style={styles.rightGroup}>
        {language && <span style={styles.langBadge}>{language}</span>}
        {onFormat && (
          <button className="hover-scale" style={styles.ctrlBtn} title="Format Document (Alt+Shift+F)" onClick={onFormat}>
            Format
          </button>
        )}
        {onFind && (
          <button className="hover-scale" style={styles.ctrlBtn} title="Find & Replace (Ctrl+F)" onClick={onFind}>
            Find
          </button>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: "26px",
    padding: "0 12px",
    backgroundColor: "var(--bg-base, #09090b)",
    borderBottom: "1px solid var(--border-subtle, #27272a)",
    fontSize: "11.5px",
    fontFamily: "var(--font-mono, monospace)",
    color: "var(--text-faint, #71717a)",
    userSelect: "none",
    overflowX: "auto",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  leftGroup: {
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
  },
  rightGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
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
    color: "var(--text-muted, #a1a1aa)",
  },
  activePart: {
    color: "var(--text-main, #fafafa)",
    fontWeight: 500,
  },
  symbolPart: {
    color: "var(--accent, #38bdf8)",
    fontWeight: 500,
  },
  langBadge: {
    fontSize: "9px",
    fontWeight: 700,
    color: "var(--accent, #38bdf8)",
    backgroundColor: "rgba(56,189,248,0.08)",
    padding: "1px 6px",
    borderRadius: "3px",
    fontFamily: "monospace",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  ctrlBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted, #a1a1aa)",
    fontSize: "11px",
    cursor: "pointer",
    padding: "2px 6px",
    borderRadius: "4px",
    transition: "color 0.1s, background-color 0.1s",
  },
};
