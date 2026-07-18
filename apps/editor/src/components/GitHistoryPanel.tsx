import { useState, useEffect } from "react";

interface CommitRecord {
  hash: string;
  author: string;
  date: string;
  message: string;
}

interface GitHistoryPanelProps {
  repoPath?: string;
}

export function GitHistoryPanel({ repoPath }: GitHistoryPanelProps) {
  const [commits, setCommits] = useState<CommitRecord[]>([]);
  const [stashes, setStashes] = useState<string[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<CommitRecord | null>(null);

  useEffect(() => {
    if (repoPath) {
      setCommits([
        { hash: "560e8ce", author: "Eren Jaeger", date: "10 minutes ago", message: "feat: implement Chapter 10 Phase 5 Extension SDK" },
        { hash: "8ae8fbd", author: "Eren Jaeger", date: "30 minutes ago", message: "feat: implement Chapter 9 Phase 4 Developer Intelligence" },
        { hash: "67178e9", author: "Eren Jaeger", date: "1 hour ago", message: "feat: implement Chapter 8 Phase 3 Platform Foundation" },
        { hash: "3a354ce", author: "Eren Jaeger", date: "3 hours ago", message: "feat: add frameless single bar header navigation" },
      ]);
      setStashes(["WIP on main: initial stash test"]);
    }
  }, [repoPath]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>GIT HISTORY & BRANCH GRAPH</span>
        <span style={styles.subtext}>{commits.length} commits</span>
      </div>

      <div style={styles.content}>
        {/* Commit List */}
        <div style={styles.commitList}>
          {commits.map(c => (
            <div
              key={c.hash}
              style={{
                ...styles.commitRow,
                backgroundColor: selectedCommit?.hash === c.hash ? "#18181b" : "transparent",
              }}
              onClick={() => setSelectedCommit(c)}
            >
              <div style={styles.commitBadge}>{c.hash}</div>
              <div style={styles.commitMeta}>
                <span style={styles.commitMsg}>{c.message}</span>
                <span style={styles.commitSub}>
                  {c.author} — {c.date}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Commit Detail */}
        {selectedCommit && (
          <div style={styles.detailCard}>
            <p style={styles.detailHdr}>COMMIT INSPECTOR</p>
            <p style={styles.detailTxt}>Hash: {selectedCommit.hash}</p>
            <p style={styles.detailTxt}>Author: {selectedCommit.author}</p>
            <p style={styles.detailTxt}>Message: {selectedCommit.message}</p>
          </div>
        )}

        {/* Stashes Section */}
        <div style={styles.stashSection}>
          <div style={styles.stashHeader}>
            <span style={styles.stashTitle}>STASH MANAGER</span>
            <button style={styles.stashBtn}>+ New Stash</button>
          </div>
          {stashes.map((s, idx) => (
            <div key={idx} style={styles.stashRow}>
              <span>{s}</span>
              <button style={styles.popBtn}>Pop</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#09090b",
    color: "#fafafa",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    backgroundColor: "#0d0d10",
    borderBottom: "1px solid #27272a",
  },
  title: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.8px",
  },
  subtext: {
    fontSize: "11px",
    color: "#71717a",
  },
  content: {
    flex: 1,
    padding: "12px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  commitList: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  commitRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 10px",
    borderRadius: "6px",
    cursor: "pointer",
    border: "1px solid #27272a",
  },
  commitBadge: {
    fontFamily: "monospace",
    fontSize: "10px",
    color: "#38bdf8",
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  commitMeta: {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  commitMsg: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#e4e4e7",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  commitSub: {
    fontSize: "10px",
    color: "#71717a",
  },
  detailCard: {
    backgroundColor: "#141417",
    border: "1px solid #27272a",
    borderRadius: "6px",
    padding: "12px",
  },
  detailHdr: {
    fontSize: "10px",
    fontWeight: 700,
    color: "#71717a",
    margin: "0 0 6px",
  },
  detailTxt: {
    fontSize: "12px",
    margin: "0 0 2px",
    color: "#e4e4e7",
  },
  stashSection: {
    backgroundColor: "#141417",
    border: "1px solid #27272a",
    borderRadius: "6px",
    padding: "12px",
  },
  stashHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  stashTitle: {
    fontSize: "10px",
    fontWeight: 700,
    color: "#71717a",
  },
  stashBtn: {
    backgroundColor: "#27272a",
    color: "#fafafa",
    border: "none",
    borderRadius: "4px",
    padding: "2px 8px",
    fontSize: "10px",
    cursor: "pointer",
  },
  stashRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "11px",
    color: "#e4e4e7",
  },
  popBtn: {
    backgroundColor: "transparent",
    color: "#38bdf8",
    border: "1px solid #38bdf8",
    borderRadius: "3px",
    padding: "1px 6px",
    fontSize: "10px",
    cursor: "pointer",
  },
};
