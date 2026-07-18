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

  const refreshStatus = useCallback(async () => {
    if (!repoPath) return;
    const api = (window as any).atlasAPI;
    if (api?.gitStatus) {
      setLoading(true);
      try {
        const files = await api.gitStatus(repoPath);
        setGitFiles(files);
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

  const stagedFiles = gitFiles.filter((f) => f.staged);
  const unstagedFiles = gitFiles.filter((f) => !f.staged);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>SOURCE CONTROL</span>
        <button style={styles.refreshButton} onClick={refreshStatus} title="Refresh Git Status">
          🔄
        </button>
      </div>

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
          {loading ? "Committing..." : "✓ Commit Staged"}
        </button>
      </div>

      <div style={styles.fileListContainer}>
        {/* Staged Section */}
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

        {/* Changes Section */}
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
    backgroundColor: "#16161e",
    color: "#a9b1d6",
    fontSize: "13px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    backgroundColor: "#1f2335",
    borderBottom: "1px solid #292e42",
  },
  title: {
    fontSize: "11px",
    fontWeight: "bold",
    letterSpacing: "0.5px",
    color: "#7aa2f7",
  },
  refreshButton: {
    background: "none",
    border: "none",
    color: "#7aa2f7",
    cursor: "pointer",
    fontSize: "12px",
  },
  commitBox: {
    padding: "12px",
    borderBottom: "1px solid #292e42",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  messageInput: {
    width: "100%",
    height: "60px",
    backgroundColor: "#1f2335",
    border: "1px solid #3b4261",
    color: "#c0caf5",
    borderRadius: "4px",
    padding: "8px",
    fontSize: "12px",
    resize: "none",
    fontFamily: "inherit",
  },
  commitButton: {
    backgroundColor: "#7aa2f7",
    color: "#15161e",
    border: "none",
    borderRadius: "4px",
    padding: "6px 12px",
    fontWeight: "bold",
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
    padding: "8px 12px",
  },
  sectionHeader: {
    fontSize: "11px",
    fontWeight: "bold",
    color: "#565f89",
    textTransform: "uppercase",
    marginBottom: "6px",
  },
  fileItem: {
    display: "flex",
    alignItems: "center",
    padding: "4px 6px",
    cursor: "pointer",
    borderRadius: "3px",
    gap: "8px",
  },
  statusBadge: {
    color: "#e0af68",
    fontWeight: "bold",
    fontSize: "11px",
    width: "14px",
  },
  filePath: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  stageButton: {
    background: "#292e42",
    border: "1px solid #3b4261",
    color: "#c0caf5",
    borderRadius: "3px",
    width: "20px",
    height: "20px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    padding: "24px 0",
    textAlign: "center",
    color: "#565f89",
    fontSize: "12px",
  },
};
