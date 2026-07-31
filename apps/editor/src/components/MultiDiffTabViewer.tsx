import React, { useState, useEffect } from "react";

export interface FileDiffEntry {
  filePath: string;
  originalContent: string;
  modifiedContent: string;
  status: "pending" | "accepted" | "rejected";
  staged?: boolean;
}

interface MultiDiffTabViewerProps {
  diffs?: FileDiffEntry[];
  repoPath?: string;
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
  onAcceptFile?: (path: string) => void;
  onRejectFile?: (path: string) => void;
}

export function MultiDiffTabViewer({
  diffs: initialDiffs,
  repoPath,
  onAcceptAll,
  onRejectAll,
  onAcceptFile,
  onRejectFile,
}: MultiDiffTabViewerProps) {
  const [diffs, setDiffs] = useState<FileDiffEntry[]>(initialDiffs || []);
  const [commitMessage, setCommitMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if ((!initialDiffs || initialDiffs.length === 0) && repoPath) {
      const api = (window as any).atlasAPI;
      if (api && api.gitStatus) {
        api.gitStatus(repoPath).then(async (gitFiles: any[]) => {
          const loaded: FileDiffEntry[] = [];
          for (const item of gitFiles) {
            const rawDiff = await api.gitDiff(repoPath, item.path, item.staged);
            loaded.push({
              filePath: item.path,
              originalContent: "/* Git Base Revision */",
              modifiedContent: rawDiff || `/* File modified: ${item.status} */`,
              status: "pending",
              staged: item.staged,
            });
          }
          setDiffs(loaded);
        }).catch(() => {});
      }
    }
  }, [repoPath, initialDiffs]);

  const handleFileAction = (path: string, action: "accept" | "reject") => {
    setDiffs((prev) =>
      prev.map((d) => (d.filePath === path ? { ...d, status: action === "accept" ? "accepted" : "rejected" } : d))
    );
    if (action === "accept") onAcceptFile?.(path);
    else onRejectFile?.(path);
  };

  const handleToggleStage = async (filePath: string, currentStaged: boolean) => {
    const api = (window as any).atlasAPI;
    if (api && repoPath) {
      try {
        if (currentStaged) {
          await api.gitUnstage(repoPath, filePath);
        } else {
          await api.gitStage(repoPath, filePath);
        }
        setDiffs((prev) =>
          prev.map((d) => (d.filePath === filePath ? { ...d, staged: !currentStaged } : d))
        );
      } catch (err: any) {
        setStatusMessage(`Git stage error: ${err.message}`);
      }
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      setStatusMessage("Commit message cannot be empty.");
      return;
    }
    const api = (window as any).atlasAPI;
    if (api && repoPath) {
      try {
        await api.gitCommit(repoPath, commitMessage);
        setStatusMessage("Changes committed successfully!");
        setCommitMessage("");
        setDiffs([]);
      } catch (err: any) {
        setStatusMessage(`Commit failed: ${err.message}`);
      }
    }
  };

  const pendingCount = diffs.filter((d) => d.status === "pending").length;

  return (
    <div style={styles.container}>
      {/* Header Controls */}
      <div style={styles.header}>
        <div style={styles.titleGroup}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #38bdf8)" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          <span style={styles.title}>MULTI-FILE AGENT & GIT DIFF REVIEW</span>
          <span style={styles.badge}>{pendingCount} Changed Files</span>
        </div>
        <div style={styles.btnGroup}>
          <button style={styles.acceptAllBtn} onClick={onAcceptAll}>
            ✓ Accept All ({diffs.length})
          </button>
          <button style={styles.rejectAllBtn} onClick={onRejectAll}>
            ✕ Reject All
          </button>
        </div>
      </div>

      {/* Commit Bar */}
      <div style={styles.commitBar}>
        <input
          style={styles.commitInput}
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Commit message (e.g. feat: apply agent changes)..."
        />
        <button style={styles.commitBtn} onClick={handleCommit}>
          Commit Staged Changes
        </button>
        {statusMessage && <span style={styles.statusText}>{statusMessage}</span>}
      </div>

      {/* Multi-Diff File Cards List */}
      <div style={styles.cardList}>
        {diffs.length === 0 ? (
          <div style={styles.emptyState}>No pending file changes detected in working tree.</div>
        ) : (
          diffs.map((file) => (
            <div key={file.filePath} style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardHeaderLeft}>
                  <span style={styles.filePath}>{file.filePath}</span>
                  {file.staged !== undefined && (
                    <button
                      style={{
                        ...styles.stageBadge,
                        backgroundColor: file.staged ? "rgba(52, 211, 153, 0.2)" : "rgba(113, 113, 122, 0.2)",
                        color: file.staged ? "#34d399" : "#a1a1aa",
                      }}
                      onClick={() => handleToggleStage(file.filePath, !!file.staged)}
                    >
                      {file.staged ? "Staged" : "Unstaged"}
                    </button>
                  )}
                </div>
                <div style={styles.cardMeta}>
                  <span
                    style={{
                      ...styles.statusTag,
                      color: file.status === "accepted" ? "#34d399" : file.status === "rejected" ? "#f87171" : "#fbbf24",
                    }}
                  >
                    {file.status.toUpperCase()}
                  </span>
                  <button style={styles.cardBtn} onClick={() => handleFileAction(file.filePath, "accept")}>
                    Accept
                  </button>
                  <button style={styles.cardBtn} onClick={() => handleFileAction(file.filePath, "reject")}>
                    Reject
                  </button>
                </div>
              </div>

              {/* Split Diff Blocks */}
              <div style={styles.diffSplit}>
                <div style={styles.diffColumnOriginal}>
                  <div style={styles.colHeader}>Original</div>
                  <pre style={styles.codeText}>{file.originalContent}</pre>
                </div>
                <div style={styles.diffColumnModified}>
                  <div style={styles.colHeader}>Agent / Working Tree Modifications</div>
                  <pre style={styles.codeText}>{file.modifiedContent}</pre>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: "var(--bg-base, #09090b)",
    border: "1px solid var(--border-strong, #27272a)",
    borderRadius: "var(--radius-md, 8px)",
    overflow: "hidden",
    fontFamily: "var(--font-sans, system-ui)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    backgroundColor: "var(--bg-panel, #18181b)",
    borderBottom: "1px solid var(--border-subtle, #27272a)",
  },
  titleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  title: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--accent, #38bdf8)",
    letterSpacing: "0.8px",
  },
  badge: {
    fontSize: "10px",
    fontWeight: 600,
    color: "var(--text-muted, #a1a1aa)",
    backgroundColor: "var(--bg-base, #09090b)",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  btnGroup: {
    display: "flex",
    gap: "6px",
  },
  acceptAllBtn: {
    backgroundColor: "#10b981",
    color: "#ffffff",
    border: "none",
    borderRadius: "4px",
    padding: "4px 8px",
    fontSize: "10px",
    fontWeight: 700,
    cursor: "pointer",
  },
  rejectAllBtn: {
    backgroundColor: "var(--bg-base, #09090b)",
    color: "#f87171",
    border: "1px solid #f87171",
    borderRadius: "4px",
    padding: "4px 8px",
    fontSize: "10px",
    fontWeight: 600,
    cursor: "pointer",
  },
  commitBar: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    backgroundColor: "var(--bg-base, #09090b)",
    borderBottom: "1px solid var(--border-subtle, #27272a)",
  },
  commitInput: {
    flex: 1,
    backgroundColor: "var(--bg-panel, #18181b)",
    border: "1px solid var(--border-subtle, #27272a)",
    color: "var(--text-main, #fafafa)",
    fontSize: "12px",
    padding: "4px 8px",
    borderRadius: "4px",
  },
  commitBtn: {
    backgroundColor: "var(--accent, #38bdf8)",
    color: "#09090b",
    border: "none",
    borderRadius: "4px",
    padding: "4px 10px",
    fontSize: "10px",
    fontWeight: 700,
    cursor: "pointer",
  },
  statusText: {
    fontSize: "10px",
    color: "#34d399",
    fontWeight: 600,
  },
  cardList: {
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    maxHeight: "600px",
    overflow: "auto",
  },
  emptyState: {
    padding: "24px",
    textAlign: "center",
    color: "var(--text-muted, #71717a)",
    fontSize: "12px",
  },
  card: {
    backgroundColor: "var(--bg-panel, #18181b)",
    border: "1px solid var(--border-subtle, #27272a)",
    borderRadius: "6px",
    overflow: "hidden",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 10px",
    backgroundColor: "var(--bg-base, #09090b)",
    borderBottom: "1px solid var(--border-subtle, #27272a)",
  },
  cardHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  stageBadge: {
    border: "none",
    borderRadius: "4px",
    padding: "2px 6px",
    fontSize: "9px",
    fontWeight: 700,
    cursor: "pointer",
  },
  filePath: {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-main, #fafafa)",
  },
  cardMeta: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  statusTag: {
    fontSize: "9px",
    fontWeight: 700,
  },
  cardBtn: {
    backgroundColor: "var(--bg-panel, #18181b)",
    border: "1px solid var(--border-subtle, #27272a)",
    color: "var(--text-main, #fafafa)",
    borderRadius: "4px",
    padding: "2px 6px",
    fontSize: "10px",
    cursor: "pointer",
  },
  diffSplit: {
    display: "flex",
    minHeight: "120px",
  },
  diffColumnOriginal: {
    flex: 1,
    borderRight: "1px solid var(--border-subtle, #27272a)",
    backgroundColor: "rgba(239, 68, 68, 0.05)",
    padding: "8px",
  },
  diffColumnModified: {
    flex: 1,
    backgroundColor: "rgba(16, 185, 129, 0.05)",
    padding: "8px",
  },
  colHeader: {
    fontSize: "10px",
    fontWeight: 700,
    color: "var(--text-muted, #a1a1aa)",
    marginBottom: "4px",
  },
  codeText: {
    margin: 0,
    fontSize: "11px",
    fontFamily: "monospace",
    color: "var(--text-main, #fafafa)",
    whiteSpace: "pre-wrap",
  },
};
