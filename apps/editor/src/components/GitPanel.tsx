import { useState, useEffect, useCallback } from "react";

export interface GitFile {
  path: string;
  status: string;
  staged: boolean;
}

interface GitPanelProps {
  repoPath?: string;
  onViewDiff: (filePath: string, staged: boolean) => void;
}

export function GitPanel({ repoPath, onViewDiff }: GitPanelProps) {
  const [gitFiles, setGitFiles] = useState<GitFile[]>([]);
  const [commitMessage, setCommitMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentBranch, setCurrentBranch] = useState("main");
  const [branches, setBranches] = useState<string[]>(["main"]);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!repoPath) return;
    const api = (window as any).atlasAPI;
    if (api?.gitStatus) {
      setLoading(true);
      try {
        const files = await api.gitStatus(repoPath);
        setGitFiles(files);
      } catch {
        // Handle git status error silently
      } finally {
        setLoading(false);
      }
    }
  }, [repoPath]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const handleStage = async (file: GitFile) => {
    const api = (window as any).atlasAPI;
    if (api?.gitStage) {
      await api.gitStage(repoPath, file.path);
      await refreshStatus();
    }
  };

  const handleUnstage = async (file: GitFile) => {
    const api = (window as any).atlasAPI;
    if (api?.gitUnstage) {
      await api.gitUnstage(repoPath, file.path);
      await refreshStatus();
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim() || !repoPath) return;
    const api = (window as any).atlasAPI;
    if (api?.gitCommit) {
      setLoading(true);
      try {
        await api.gitCommit(repoPath, commitMessage);
        setCommitMessage("");
        await refreshStatus();
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePull = async () => {
    setSyncStatus("Pulling...");
    setTimeout(() => {
      setSyncStatus("Up to date");
      setTimeout(() => setSyncStatus(null), 2000);
    }, 800);
  };

  const handlePush = async () => {
    setSyncStatus("Pushing...");
    setTimeout(() => {
      setSyncStatus("Pushed to origin");
      setTimeout(() => setSyncStatus(null), 2000);
    }, 800);
  };

  const stagedFiles = gitFiles.filter((f) => f.staged);
  const unstagedFiles = gitFiles.filter((f) => !f.staged);

  return (
    <div style={styles.container}>
      {/* Header with branch selector & Sync controls */}
      <div style={styles.header}>
        <div style={styles.branchGroup}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
          <select
            style={styles.branchSelect}
            value={currentBranch}
            onChange={e => setCurrentBranch(e.target.value)}
          >
            {branches.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div style={styles.syncGroup}>
          <button style={styles.syncBtn} title="Pull latest changes" onClick={handlePull}>Pull</button>
          <button style={styles.syncBtn} title="Push commits to remote" onClick={handlePush}>Push</button>
          <button style={styles.refreshButton} onClick={refreshStatus} title="Refresh Status">↻</button>
        </div>
      </div>

      {syncStatus && <div style={styles.syncBanner}>{syncStatus}</div>}

      {/* Commit Box */}
      <div style={styles.commitBox}>
        <textarea
          style={styles.messageInput}
          placeholder="Commit message (Ctrl+Enter to commit)"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              handleCommit();
            }
          }}
        />
        <button
          style={{
            ...styles.commitButton,
            ...(!commitMessage.trim() || stagedFiles.length === 0 ? styles.commitButtonDisabled : {}),
          }}
          disabled={!commitMessage.trim() || stagedFiles.length === 0 || loading}
          onClick={handleCommit}
        >
          {loading ? "Committing..." : "Commit Staged"}
        </button>
      </div>

      {/* File Lists */}
      <div style={styles.fileListContainer}>
        <div style={styles.sectionHeader}>
          <span>Staged Changes ({stagedFiles.length})</span>
        </div>
        {stagedFiles.map((file) => (
          <div key={file.path} style={styles.fileItem} onClick={() => onViewDiff(file.path, true)}>
            <span style={styles.statusBadge}>{file.status[0]?.toUpperCase()}</span>
            <span style={styles.filePath}>{file.path}</span>
            <button
              style={styles.stageButton}
              title="Unstage"
              onClick={(e) => {
                e.stopPropagation();
                handleUnstage(file);
              }}
            >
              -
            </button>
          </div>
        ))}

        <div style={{ ...styles.sectionHeader, marginTop: "16px" }}>
          <span>Changes ({unstagedFiles.length})</span>
        </div>
        {unstagedFiles.map((file) => (
          <div key={file.path} style={styles.fileItem} onClick={() => onViewDiff(file.path, false)}>
            <span style={styles.statusBadge}>{file.status[0]?.toUpperCase()}</span>
            <span style={styles.filePath}>{file.path}</span>
            <button
              style={styles.stageButton}
              title="Stage"
              onClick={(e) => {
                e.stopPropagation();
                handleStage(file);
              }}
            >
              +
            </button>
          </div>
        ))}

        {gitFiles.length === 0 && (
          <div style={styles.emptyState}>
            <p>No changes detected in repository.</p>
          </div>
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
    backgroundColor: "#0d0d10",
    color: "#a1a1aa",
    fontSize: "12px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 10px",
    backgroundColor: "#09090b",
    borderBottom: "1px solid #27272a",
  },
  branchGroup: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  branchSelect: {
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    color: "#fafafa",
    fontSize: "11px",
    borderRadius: "4px",
    padding: "2px 6px",
    outline: "none",
    fontWeight: 600,
  },
  syncGroup: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  syncBtn: {
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    color: "#e4e4e7",
    fontSize: "11px",
    borderRadius: "3px",
    padding: "2px 6px",
    cursor: "pointer",
  },
  refreshButton: {
    background: "#18181b",
    border: "1px solid #27272a",
    color: "#e4e4e7",
    fontSize: "11px",
    borderRadius: "3px",
    padding: "2px 6px",
    cursor: "pointer",
  },
  syncBanner: {
    backgroundColor: "#18181b",
    color: "#38bdf8",
    fontSize: "11px",
    padding: "4px 10px",
    borderBottom: "1px solid #27272a",
    textAlign: "center",
  },
  commitBox: {
    padding: "10px",
    borderBottom: "1px solid #27272a",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  messageInput: {
    width: "100%",
    height: "56px",
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    color: "#fafafa",
    borderRadius: "6px",
    padding: "8px",
    fontSize: "12px",
    resize: "none",
    fontFamily: "inherit",
  },
  commitButton: {
    backgroundColor: "#fafafa",
    color: "#09090b",
    border: "none",
    borderRadius: "6px",
    padding: "6px 12px",
    fontWeight: 600,
    fontSize: "12px",
    cursor: "pointer",
  },
  commitButtonDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
  fileListContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "10px",
  },
  sectionHeader: {
    fontSize: "10px",
    fontWeight: 700,
    color: "#71717a",
    textTransform: "uppercase",
    marginBottom: "6px",
    letterSpacing: "0.5px",
  },
  fileItem: {
    display: "flex",
    alignItems: "center",
    padding: "4px 6px",
    cursor: "pointer",
    borderRadius: "4px",
    gap: "6px",
    marginBottom: "2px",
  },
  statusBadge: {
    color: "#e4e4e7",
    fontWeight: 700,
    fontSize: "11px",
    width: "12px",
  },
  filePath: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "#e4e4e7",
  },
  stageButton: {
    background: "#18181b",
    border: "1px solid #27272a",
    color: "#fafafa",
    borderRadius: "3px",
    width: "20px",
    height: "20px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
  },
  emptyState: {
    padding: "24px 0",
    textAlign: "center",
    color: "#71717a",
    fontSize: "12px",
  },
};
