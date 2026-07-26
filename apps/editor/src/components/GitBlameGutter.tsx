import React from "react";

export interface GitBlameLineInfo {
  lineNumber: number;
  author: string;
  commitHash: string;
  commitDate: string;
  message: string;
}

interface GitBlameGutterProps {
  blameInfo?: GitBlameLineInfo;
}

export function GitBlameGutter({ blameInfo }: GitBlameGutterProps) {
  if (!blameInfo) return null;

  return (
    <div style={styles.gutterContainer}>
      <span style={styles.authorBadge}>{blameInfo.author}</span>
      <span style={styles.dateBadge}>{blameInfo.commitDate}</span>
      <span style={styles.messageSnippet}>• {blameInfo.message}</span>
      <span style={styles.hashBadge}>[{blameInfo.commitHash.substring(0, 7)}]</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  gutterContainer: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    marginLeft: "24px",
    opacity: 0.5,
    fontSize: "11px",
    fontFamily: "var(--font-sans, system-ui)",
    userSelect: "none",
    pointerEvents: "none",
  },
  authorBadge: {
    fontWeight: 600,
    color: "var(--accent, #38bdf8)",
  },
  dateBadge: {
    color: "var(--text-muted, #a1a1aa)",
  },
  messageSnippet: {
    color: "var(--text-muted, #a1a1aa)",
    fontStyle: "italic",
  },
  hashBadge: {
    fontFamily: "monospace",
    fontSize: "10px",
    color: "var(--text-muted, #a1a1aa)",
  },
};
