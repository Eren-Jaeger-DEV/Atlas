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
        <button style={styles.refreshButton} onClick={refreshStatus} title="Refresh Status">
          Refresh
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
          {loading ? "Committing..." : "Commit Staged"}
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
        <div style={{ ...styles.sectionHeader, marginTop: "18px" }}>
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
    borderRight: "1px solid #27272a",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    backgroundColor: "#09090b",
    borderBottom: "1px solid #27272a",
  },
  title: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.8px",
    color: "#fafafa",
  },
  refreshButton: {
    background: "#18181b",
    border: "1px solid #27272a",
    color: "#e4e4e7",
    fontSize: "11px",
    borderRadius: "4px",
    padding: "3px 8px",
    cursor: "pointer",
  },
  commitBox: {
    padding: "12px",
    borderBottom: "1px solid #27272a",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  messageInput: {
    width: "100%",
    height: "64px",
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    color: "#fafafa",
    borderRadius: "6px",
    padding: "10px",
    fontSize: "12px",
    resize: "none",
    fontFamily: "inherit",
  },
  commitButton: {
    backgroundColor: "#fafafa",
    color: "#09090b",
    border: "none",
    borderRadius: "6px",
    padding: "8px 14px",
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
    padding: "12px",
  },
  sectionHeader: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#71717a",
    textTransform: "uppercase",
    marginBottom: "8px",
    letterSpacing: "0.5px",
  },
  fileItem: {
    display: "flex",
    alignItems: "center",
    padding: "5px 8px",
    cursor: "pointer",
    borderRadius: "4px",
    gap: "8px",
    marginBottom: "2px",
  },
  statusBadge: {
    color: "#e4e4e7",
    fontWeight: 700,
    fontSize: "11px",
    width: "14px",
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
    borderRadius: "4px",
    width: "22px",
    height: "22px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
  },
  emptyState: {
    padding: "32px 0",
    textAlign: "center",
    color: "#71717a",
    fontSize: "12px",
  },
};
