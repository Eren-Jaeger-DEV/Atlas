interface BreadcrumbProps {
  filePath?: string;
  repoPath?: string;
}

export function Breadcrumb({ filePath, repoPath }: BreadcrumbProps) {
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
          {i > 0 && <span style={styles.separator}>&gt;</span>}
          <span style={i === parts.length - 1 ? styles.activePart : styles.part}>{part}</span>
        </span>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    height: "24px",
    padding: "0 12px",
    backgroundColor: "#0d0d10",
    borderBottom: "1px solid #27272a",
    fontSize: "11px",
    color: "#71717a",
    userSelect: "none",
    overflowX: "auto",
  },
  item: {
    display: "flex",
    alignItems: "center",
  },
  separator: {
    margin: "0 6px",
    fontSize: "10px",
    color: "#52525b",
  },
  part: {
    color: "#a1a1aa",
  },
  activePart: {
    color: "#fafafa",
    fontWeight: 600,
  },
};
