import React, { useState, useCallback } from "react";
import { GitBranch, Play, CheckCircle, XCircle, Clock, AlertTriangle, ChevronDown, ChevronRight, Terminal, Loader } from "lucide-react";
import { ATLAS_DEFAULT_SHADOW_COMMANDS, type ShadowCommand, type ShadowVerifyResult, type ShadowCommandResult, type ShadowCommandStatus } from "@atlas/agents";

interface ShadowWorktreePanelProps {
  repoPath?: string;
}

const STATUS_CONFIG: Record<ShadowCommandStatus, { icon: React.ReactNode; color: string; label: string }> = {
  pass:    { icon: <CheckCircle size={12} />, color: "#34d399", label: "PASS" },
  fail:    { icon: <XCircle    size={12} />, color: "#f87171", label: "FAIL" },
  skipped: { icon: <Clock      size={12} />, color: "#52525b", label: "SKIP" },
};

function CommandResultRow({ result, expanded, onToggle }: {
  result: ShadowCommandResult;
  expanded: boolean;
  onToggle: () => void;
}) {
  const cfg = STATUS_CONFIG[result.status];
  const hasOutput = !!(result.stdout || result.stderr);
  return (
    <div style={styles.cmdRow}>
      <div style={styles.cmdHeader} onClick={hasOutput ? onToggle : undefined}>
        <span style={{ color: cfg.color, display: "flex", alignItems: "center" }}>{cfg.icon}</span>
        <span style={styles.cmdLabel}>{result.label}</span>
        <span style={styles.cmdDuration}>{result.durationMs > 0 ? `${(result.durationMs / 1000).toFixed(1)}s` : "—"}</span>
        <span style={{ ...styles.cmdBadge, color: cfg.color, borderColor: `${cfg.color}30`, backgroundColor: `${cfg.color}12` }}>
          {cfg.label}
        </span>
        {hasOutput && (
          <span style={{ color: "#52525b", marginLeft: "4px" }}>
            {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </span>
        )}
      </div>

      {expanded && hasOutput && (
        <div style={styles.cmdOutput}>
          {result.stderr && (
            <pre style={{ ...styles.cmdPre, color: result.status === "fail" ? "#f87171" : "#71717a" }}>
              {result.stderr.trim()}
            </pre>
          )}
          {result.stdout && (
            <pre style={{ ...styles.cmdPre, color: "#a1a1aa" }}>
              {result.stdout.trim()}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export function ShadowWorktreePanel({ repoPath }: ShadowWorktreePanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ShadowVerifyResult | null>(null);
  const [expandedCmds, setExpandedCmds] = useState<Set<number>>(new Set());
  const [customBranch, setCustomBranch] = useState("");

  const commands: ShadowCommand[] = ATLAS_DEFAULT_SHADOW_COMMANDS;

  const toggleExpanded = (idx: number) => {
    setExpandedCmds((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const handleRunVerify = useCallback(async () => {
    const root = repoPath;
    if (!root) return;

    setIsRunning(true);
    setResult(null);
    setExpandedCmds(new Set());

    try {
      // ShadowWorktree runs in Node (main process) via the atlas IPC bridge
      const api = window.atlasAPI as any;
      if (!api?.shadowVerify) {
        // Graceful fallback — show a meaningful message if IPC bridge not implemented yet
        const mockResult: ShadowVerifyResult = {
          runId: `shadow-preview-${Date.now()}`,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          totalDurationMs: 0,
          overallPass: false,
          shadowBranch: customBranch || "atlas/shadow/preview",
          worktreePath: "/tmp/atlas-shadow-preview",
          commandResults: commands.map((c) => ({
            label: c.label,
            status: "skipped" as ShadowCommandStatus,
            durationMs: 0,
            stdout: "",
            stderr: "",
            exitCode: null,
          })),
          infrastructureError: "[INFO] Shadow Worktree IPC bridge not yet registered in atlas-main.js. Wire api.shadowVerify() in the Electron main process to enable live runs.",
        };
        setResult(mockResult);
        return;
      }

      const res: ShadowVerifyResult = await api.shadowVerify({
        repoPath: root,
        shadowBranchName: customBranch.trim() || undefined,
        changes: [], // AI changes will be wired in by the orchestrator in future
        commands,
      });
      setResult(res);
    } finally {
      setIsRunning(false);
    }
  }, [repoPath, commands, customBranch]);

  const passCount = result?.commandResults.filter((r) => r.status === "pass").length ?? 0;
  const failCount = result?.commandResults.filter((r) => r.status === "fail").length ?? 0;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <GitBranch size={15} color="#34d399" />
        <span style={styles.title}>SHADOW WORKTREE VERIFY</span>
      </div>

      {/* Config */}
      <div style={styles.section}>
        <label style={styles.label}>Branch Name <span style={{ color: "#52525b", fontWeight: 400 }}>(optional)</span></label>
        <input
          style={styles.codeInput}
          value={customBranch}
          onChange={(e) => setCustomBranch(e.target.value)}
          placeholder="atlas/shadow/my-feature (auto-generated)"
          spellCheck={false}
        />

        <div style={{ ...styles.label, marginTop: "8px", marginBottom: "4px" }}>Validation Pipeline ({commands.length} commands)</div>
        <div style={styles.cmdPipeline}>
          {commands.map((c, i) => (
            <div key={i} style={styles.pipelineChip}>
              <Terminal size={9} color="#71717a" />
              <span>{c.label}</span>
            </div>
          ))}
        </div>

        <button
          style={{ ...styles.runBtn, opacity: isRunning || !repoPath ? 0.6 : 1 }}
          onClick={handleRunVerify}
          disabled={isRunning || !repoPath}
        >
          {isRunning
            ? <><Loader size={12} style={{ animation: "spin 1s linear infinite" }} /><span>Running Shadow Verify...</span></>
            : <><Play size={12} /><span>Run Shadow Verify</span></>
          }
        </button>
        {!repoPath && <span style={{ fontSize: "10px", color: "#52525b", marginTop: "4px" }}>Open a workspace to enable</span>}
      </div>

      {/* Result */}
      {result && (
        <div style={styles.resultArea}>
          {/* Overall Banner */}
          <div style={{
            ...styles.overallBanner,
            borderColor: result.overallPass ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.25)",
            backgroundColor: result.overallPass ? "rgba(52,211,153,0.07)" : "rgba(248,113,113,0.07)",
          }}>
            <span style={{ fontSize: "22px", lineHeight: 1 }}>
              {result.overallPass ? <CheckCircle size={22} color="#34d399" /> : <XCircle size={22} color="#f87171" />}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: "13px", color: result.overallPass ? "#34d399" : "#f87171" }}>
                {result.overallPass ? "All checks passed" : "Verification failed"}
              </div>
              <div style={{ fontSize: "10px", color: "#71717a", marginTop: "2px" }}>
                {passCount} passed · {failCount} failed · {(result.totalDurationMs / 1000).toFixed(1)}s total
              </div>
            </div>
            <div style={{ fontSize: "10px", color: "#3f3f46", fontFamily: "monospace", textAlign: "right" }}>
              <div>{result.shadowBranch}</div>
              <div style={{ marginTop: "2px" }}>{result.runId}</div>
            </div>
          </div>

          {/* Infrastructure error */}
          {result.infrastructureError && (
            <div style={styles.infraError}>
              <AlertTriangle size={12} color="#f59e0b" style={{ flexShrink: 0, marginTop: "2px" }} />
              <span style={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}>{result.infrastructureError}</span>
            </div>
          )}

          {/* Command results */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {result.commandResults.map((r, i) => (
              <CommandResultRow
                key={i}
                result={r}
                expanded={expandedCmds.has(i)}
                onToggle={() => toggleExpanded(i)}
              />
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#09090b",
    color: "#f4f4f5",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "10px 14px",
    backgroundColor: "#111113",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    flexShrink: 0,
  },
  title: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "#d4d4d8",
  },
  section: {
    padding: "10px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  label: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#71717a",
  },
  codeInput: {
    width: "100%",
    backgroundColor: "#0e0e10",
    border: "1px solid rgba(52,211,153,0.18)",
    borderRadius: "4px",
    color: "#34d399",
    fontFamily: "'JetBrains Mono', Consolas, monospace",
    padding: "6px 9px",
    fontSize: "12px",
    outline: "none",
    boxSizing: "border-box",
  },
  cmdPipeline: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  pipelineChip: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "10px",
    fontWeight: 600,
    color: "#52525b",
    backgroundColor: "#111113",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: "3px",
    padding: "4px 7px",
  },
  runBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    backgroundColor: "#34d399",
    color: "#09090b",
    border: "none",
    borderRadius: "4px",
    padding: "7px 12px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: "6px",
  },
  resultArea: {
    flex: 1,
    overflowY: "auto",
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  overallBanner: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    padding: "12px 14px",
    borderRadius: "7px",
    border: "1px solid",
    flexShrink: 0,
  },
  infraError: {
    display: "flex",
    alignItems: "flex-start",
    gap: "7px",
    backgroundColor: "rgba(245,158,11,0.07)",
    border: "1px solid rgba(245,158,11,0.2)",
    borderRadius: "5px",
    padding: "8px 10px",
    fontSize: "11px",
    color: "#a1a1aa",
    flexShrink: 0,
  },
  cmdRow: {
    backgroundColor: "#111113",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: "5px",
    overflow: "hidden",
  },
  cmdHeader: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "8px 10px",
    cursor: "pointer",
  },
  cmdLabel: {
    flex: 1,
    fontSize: "12px",
    fontWeight: 600,
    color: "#d4d4d8",
  },
  cmdDuration: {
    fontSize: "10px",
    color: "#52525b",
    fontFamily: "monospace",
  },
  cmdBadge: {
    fontSize: "9px",
    fontWeight: 700,
    padding: "1px 5px",
    borderRadius: "3px",
    border: "1px solid",
    letterSpacing: "0.04em",
  },
  cmdOutput: {
    borderTop: "1px solid rgba(255,255,255,0.05)",
    padding: "8px 10px",
  },
  cmdPre: {
    margin: 0,
    fontSize: "10px",
    fontFamily: "'JetBrains Mono', Consolas, monospace",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    lineHeight: 1.5,
    maxHeight: "180px",
    overflowY: "auto",
  },
};
