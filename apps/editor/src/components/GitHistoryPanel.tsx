import { useState, useEffect } from "react";

const api = () => (window as any).atlasAPI;

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repoPath) return;
    setLoading(true);
    setError(null);

    Promise.all([
      api().gitLog(repoPath, 50),
      api().gitStashList ? api().gitStashList(repoPath) : Promise.resolve([]),
    ])
      .then(([log, stashList]) => {
        setCommits(Array.isArray(log) ? log : []);
        setStashes(Array.isArray(stashList) ? stashList : []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [repoPath]);

  const handleStashSave = async () => {
    if (!repoPath) return;
    await api().gitStashSave(repoPath);
    const updated = api().gitStashList
      ? await api().gitStashList(repoPath)
      : [];
    setStashes(Array.isArray(updated) ? updated : []);
  };

  const handleStashPop = async () => {
    if (!repoPath || stashes.length === 0) return;
    await api().gitStashPop(repoPath);
    const updated = api().gitStashList
      ? await api().gitStashList(repoPath)
      : [];
    setStashes(Array.isArray(updated) ? updated : []);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>GIT HISTORY & BRANCH GRAPH</span>
        <span style={styles.subtext}>
          {loading ? "Loading..." : `${commits.length} commits`}
        </span>
      </div>

      <div style={styles.content}>
        {!repoPath && (
          <p style={styles.emptyMsg}>No workspace open. Open a folder to see git history.</p>
        )}

        {error && (
          <p style={{ ...styles.emptyMsg, color: "#f87171" }}>[FAIL] {error}</p>
        )}

        {/* Commit List */}
        {commits.length > 0 && (
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
                  <span style={styles.commitSub}>{c.author} &mdash; {c.date}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Selected Commit Detail */}
        {selectedCommit && (
          <div style={styles.detailCard}>
            <p style={styles.detailHdr}>COMMIT INSPECTOR</p>
            <p style={styles.detailTxt}>Hash: <span style={{ color: "#38bdf8", fontFamily: "monospace" }}>{selectedCommit.hash}</span></p>
            <p style={styles.detailTxt}>Author: {selectedCommit.author}</p>
            <p style={styles.detailTxt}>Date: {selectedCommit.date}</p>
            <p style={styles.detailTxt}>Message: {selectedCommit.message}</p>
          </div>
        )}

        {/* Stashes Section */}
        <div style={styles.stashSection}>
          <div style={styles.stashHeader}>
            <span style={styles.stashTitle}>STASH MANAGER ({stashes.length})</span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button style={styles.stashBtn} onClick={handleStashSave} disabled={!repoPath}>
                + Stash
              </button>
              <button style={{ ...styles.stashBtn, color: "#38bdf8" }} onClick={handleStashPop} disabled={stashes.length === 0}>
                Pop
              </button>
            </div>
          </div>
          {stashes.length === 0 ? (
            <p style={styles.emptyMsg}>No stashes.</p>
          ) : (
            stashes.map((s, idx) => (
              <div key={idx} style={styles.stashRow}>
                <span>{s}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex", flexDirection: "column", height: "100%",
    backgroundColor: "#09090b", color: "#fafafa",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "8px 12px", backgroundColor: "#0d0d10", borderBottom: "1px solid #27272a",
  },
  title: { fontSize: "11px", fontWeight: 700, letterSpacing: "0.8px" },
  subtext: { fontSize: "11px", color: "#71717a" },
  content: {
    flex: 1, padding: "12px", overflowY: "auto",
    display: "flex", flexDirection: "column", gap: "12px",
  },
  emptyMsg: { fontSize: "11px", color: "#52525b", margin: 0 },
  commitList: { display: "flex", flexDirection: "column", gap: "4px" },
  commitRow: {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "8px 10px", borderRadius: "6px", cursor: "pointer",
    border: "1px solid #27272a",
  },
  commitBadge: {
    fontFamily: "monospace", fontSize: "10px", color: "#38bdf8",
    backgroundColor: "rgba(56,189,248,0.1)", padding: "2px 6px", borderRadius: "4px",
    whiteSpace: "nowrap", flexShrink: 0,
  },
  commitMeta: { display: "flex", flexDirection: "column", overflow: "hidden" },
  commitMsg: {
    fontSize: "12px", fontWeight: 600, color: "#e4e4e7",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  commitSub: { fontSize: "10px", color: "#71717a" },
  detailCard: {
    backgroundColor: "#141417", border: "1px solid #27272a",
    borderRadius: "6px", padding: "12px",
  },
  detailHdr: { fontSize: "10px", fontWeight: 700, color: "#71717a", margin: "0 0 6px" },
  detailTxt: { fontSize: "12px", margin: "0 0 2px", color: "#e4e4e7" },
  stashSection: {
    backgroundColor: "#141417", border: "1px solid #27272a",
    borderRadius: "6px", padding: "12px",
  },
  stashHeader: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: "8px",
  },
  stashTitle: { fontSize: "10px", fontWeight: 700, color: "#71717a" },
  stashBtn: {
    backgroundColor: "#27272a", color: "#fafafa", border: "none",
    borderRadius: "4px", padding: "2px 8px", fontSize: "10px", cursor: "pointer",
  },
  stashRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    fontSize: "11px", color: "#e4e4e7", padding: "3px 0",
    borderBottom: "1px solid #27272a",
  },
};
