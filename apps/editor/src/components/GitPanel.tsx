import { useState, useEffect, useCallback, useRef } from "react";

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
  const [generating, setGenerating] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const timerRefs = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    return () => {
      timerRefs.current.forEach(clearTimeout);
    };
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!repoPath) return;
    const api = window.atlasAPI;
    if (api?.gitStatus) {
      setLoading(true);
      try {
        const files = await api.gitStatus(repoPath);
        setGitFiles(files);
      } catch (err) {
        console.error("Failed to refresh git status:", err);
      } finally {
        setLoading(false);
      }
    }
  }, [repoPath]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const handleStage = async (file: GitFile) => {
    const api = window.atlasAPI;
    if (api?.gitStage && repoPath && file?.path) {
      await api.gitStage(repoPath, file.path);
      await refreshStatus();
    }
  };

  const handleUnstage = async (file: GitFile) => {
    const api = window.atlasAPI;
    if (api?.gitUnstage && repoPath && file?.path) {
      await api.gitUnstage(repoPath, file.path);
      await refreshStatus();
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim() || !repoPath) return;
    const api = window.atlasAPI;
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

  const handleGenerateMessage = async () => {
    const api = window.atlasAPI;
    if (!api?.inlineAgentAction || stagedFiles.length === 0) return;

    setGenerating(true);
    try {
      // Build a context string from staged files
      const filesSummary = stagedFiles
        .map((f) => `${f.status.toUpperCase()}: ${f.path}`)
        .join("\n");

      const context = `Generate a concise, conventional-commit style git commit message (max 72 chars) for these staged changes:\n${filesSummary}\n\nRespond with ONLY the commit message text, no explanation.`;

      const result = await api.inlineAgentAction("generate-commit-message", context);
      if (result && result.trim()) {
        setCommitMessage(result.trim().replace(/^["']|["']$/g, ""));
      }
    } catch (err) {
      console.error("Failed to generate commit message:", err);
    } finally {
      setGenerating(false);
    }
  };

  const stagedFiles = gitFiles.filter((f) => f.staged);
  const unstagedFiles = gitFiles.filter((f) => !f.staged);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleGroup}>
          <span style={styles.title}>SOURCE CONTROL</span>
        </div>
        <div style={styles.syncGroup}>
          <button style={styles.refreshButton} onClick={refreshStatus} title="Refresh Status">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
        </div>
      </div>

      {syncStatus && <div style={styles.syncBanner}>{syncStatus}</div>}

      {/* Commit Box */}
      <div style={styles.commitBox}>
        <div style={styles.textareaWrapper}>
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
          {/* AI Generate button — sparkle icon in top-right of textarea */}
          <button
            style={{
              ...styles.aiGenerateBtn,
              ...(generating ? styles.aiGeneratingBtn : {}),
              ...(stagedFiles.length === 0 ? styles.aiGenerateBtnDisabled : {}),
            }}
            disabled={generating || stagedFiles.length === 0}
            onClick={handleGenerateMessage}
            title="Generate commit message with AI"
          >
            {generating ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L9.09 8.26 2 9.27l5 4.87-1.18 6.88L12 17.77l6.18 3.25L17 14.14l5-4.87-7.09-1.01L12 2z"/>
              </svg>
            )}
          </button>
        </div>

        <div style={styles.commitActions}>
          <button
            style={{
              ...styles.commitButton,
              ...(!commitMessage.trim() || stagedFiles.length === 0 ? styles.commitButtonDisabled : {}),
            }}
            disabled={!commitMessage.trim() || stagedFiles.length === 0 || loading}
            onClick={handleCommit}
          >
            {loading ? "Committing..." : `Commit Staged (${stagedFiles.length})`}
          </button>
        </div>
      </div>

      {/* File Lists */}
      <div style={styles.fileListContainer}>
        <div style={styles.sectionHeader}>
          <span>Staged Changes ({stagedFiles.length})</span>
          {stagedFiles.length > 0 && (
            <button
              className="hover-scale"
              style={styles.sectionAction}
              title="Unstage all"
              onClick={async () => {
                for (const f of stagedFiles) await handleUnstage(f);
              }}
            >
              Unstage All
            </button>
          )}
        </div>
        {stagedFiles.length === 0 && (
          <div style={styles.emptySection}>No staged changes</div>
        )}
        {stagedFiles.map((file, i) => (
          <div key={file.path} className={`sidebar-list-item anim-slide-right stagger-${Math.min(i + 1, 15)}`} style={styles.fileItem} onClick={() => onViewDiff(file.path, true)}>
            <span style={{ ...styles.statusBadge, color: getStatusColor(file.status) }}>{file.status[0]?.toUpperCase()}</span>
            <span style={styles.filePath}>{file.path}</span>
            <button
              className="hover-scale"
              style={styles.stageButton}
              title="Unstage"
              onClick={(e) => { e.stopPropagation(); handleUnstage(file); }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        ))}

        <div style={{ ...styles.sectionHeader, marginTop: "14px" }}>
          <span>Changes ({unstagedFiles.length})</span>
          {unstagedFiles.length > 0 && (
            <button
              className="hover-scale"
              style={styles.sectionAction}
              title="Stage all"
              onClick={async () => {
                for (const f of unstagedFiles) await handleStage(f);
              }}
            >
              Stage All
            </button>
          )}
        </div>
        {unstagedFiles.length === 0 && (
          <div style={styles.emptySection}>No unstaged changes</div>
        )}
        {unstagedFiles.map((file, i) => (
          <div key={file.path} className={`sidebar-list-item anim-slide-right stagger-${Math.min(i + 1, 15)}`} style={styles.fileItem} onClick={() => onViewDiff(file.path, false)}>
            <span style={{ ...styles.statusBadge, color: getStatusColor(file.status) }}>{file.status[0]?.toUpperCase()}</span>
            <span style={styles.filePath}>{file.path}</span>
            <button
              className="hover-scale"
              style={styles.stageButton}
              title="Stage"
              onClick={(e) => { e.stopPropagation(); handleStage(file); }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        ))}

        {gitFiles.length === 0 && (
          <div style={styles.emptyState}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" style={{ marginBottom: 10, opacity: 0.7 }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <p>No changes detected.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("m") || s === "modified") return "#fbbf24";
  if (s.includes("a") || s === "added") return "#34d399";
  if (s.includes("d") || s === "deleted") return "#f87171";
  if (s.includes("r") || s === "renamed") return "#60a5fa";
  if (s.includes("?") || s === "untracked") return "#a78bfa";
  return "#e4e4e7";
}

import React from "react";
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "transparent",
    color: "var(--text-main)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 8px 0 12px",
    height: "36px",
    backgroundColor: "transparent",
    borderBottom: "1px solid var(--border-subtle)",
  },
  headerTitle: {
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.8px",
    textTransform: "uppercase",
    color: "var(--text-muted)",
  },
  refreshBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    transition: "color 0.15s, background-color 0.15s",
  },
  syncBanner: {
    backgroundColor: "rgba(56, 189, 248, 0.05)",
    color: "var(--accent)",
    fontSize: "11px",
    padding: "6px 10px",
    borderBottom: "1px solid var(--border-subtle)",
    textAlign: "center",
    fontWeight: 500,
  },
  commitBox: {
    padding: "12px",
    borderBottom: "1px solid var(--border-subtle)",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    backgroundColor: "transparent",
  },
  textareaWrapper: {
    position: "relative",
  },
  messageInput: {
    width: "100%",
    height: "64px",
    backgroundColor: "rgba(0,0,0,0.2)",
    border: "1px solid var(--border-color)",
    color: "var(--text-main)",
    borderRadius: "6px",
    padding: "8px 34px 8px 10px",
    fontSize: "12.5px",
    resize: "none",
    fontFamily: "var(--font-ui)",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  aiGenerateBtn: {
    position: "absolute",
    top: "6px",
    right: "6px",
    background: "rgba(139,92,246,0.15)",
    border: "1px solid rgba(139,92,246,0.3)",
    borderRadius: "4px",
    color: "#a78bfa",
    cursor: "pointer",
    width: "24px",
    height: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s",
  },
  aiGeneratingBtn: {
    background: "rgba(139,92,246,0.25)",
    color: "#c4b5fd",
  },
  aiGenerateBtnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
  commitActions: {
    display: "flex",
    gap: "8px",
  },
  commitButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    color: "var(--text-main)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "6px",
    padding: "6px 12px",
    fontWeight: 500,
    fontSize: "12px",
    cursor: "pointer",
    transition: "background 0.15s, color 0.15s",
  },
  commitButtonDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
  fileListContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "8px",
  },
  sectionHeader: {
    fontSize: "10px",
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    marginBottom: "6px",
    letterSpacing: "0.5px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionAction: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    fontSize: "10px",
    padding: "2px 4px",
    borderRadius: "3px",
    transition: "background 0.1s, color 0.1s",
    textTransform: "none",
    letterSpacing: 0,
    fontWeight: 500,
  },
  emptySection: {
    fontSize: "11px",
    color: "var(--text-faint)",
    padding: "4px 2px 8px",
    fontStyle: "italic",
  },
  fileItem: {
    display: "flex",
    alignItems: "center",
    padding: "4px 8px",
    cursor: "pointer",
    borderRadius: "4px",
    gap: "6px",
    marginBottom: "2px",
    transition: "background 0.1s",
  },
  statusBadge: {
    fontWeight: 700,
    fontSize: "10px",
    width: "16px",
    flexShrink: 0,
    fontFamily: "var(--font-mono, monospace)",
  },
  filePath: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "var(--text-main)",
    fontSize: "12.5px",
  },
  stageButton: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "var(--text-muted)",
    borderRadius: "4px",
    width: "20px",
    height: "20px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    opacity: 0,
    transition: "opacity 0.1s",
  },
  emptyState: {
    padding: "32px 0",
    textAlign: "center",
    color: "var(--text-muted, #52525b)",
    fontSize: "12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
};
