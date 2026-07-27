import React, { useState, useEffect, useRef, useCallback } from "react";
import { ParallelDAGViewer } from "./ParallelDAGViewer.js";
import { ConflictResolverModal } from "./ConflictResolverModal.js";
import { useQuickInput } from "./QuickInputProvider.js";

export type ParallelWorkerStatus =
  | "pending"
  | "planning"
  | "coding"
  | "testing"
  | "reviewing"
  | "done"
  | "error"
  | "cancelled";

export interface ParallelSubTask {
  id: string;
  title: string;
  goal: string;
  estimatedFiles: string[];
  deps: string[];
}

export interface WorkerState {
  id: string;
  task: ParallelSubTask;
  status: ParallelWorkerStatus;
  log: string[];
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  output?: any;
}

const api = () => window.atlasAPI as any;

interface ParallelAgentsDashboardProps {
  repoPath?: string;
}

const STATUS_COLOR: Record<ParallelWorkerStatus, string> = {
  pending:   "#71717a",
  planning:  "#38bdf8",
  coding:    "#a78bfa",
  testing:   "#fbbf24",
  reviewing: "#34d399",
  done:      "#22c55e",
  error:     "#f87171",
  cancelled: "#52525b"
};

const STATUS_LABEL: Record<ParallelWorkerStatus, string> = {
  pending:   "Pending",
  planning:  "Planning",
  coding:    "Coding",
  testing:   "Testing",
  reviewing: "Reviewing",
  done:      "Done",
  error:     "Error",
  cancelled: "Cancelled"
};

function PulsingDot({ color }: { color: string }) {
  return (
    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", backgroundColor: color, flexShrink: 0, boxShadow: `0 0 6px ${color}` }} />
  );
}

function WorkerCard({ worker, onCancel }: { worker: WorkerState; onCancel: (id: string) => void }) {
  const logRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expanded && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [worker.log, expanded]);

  const isActive = ["pending", "planning", "coding", "testing", "reviewing"].includes(worker.status);
  const color = STATUS_COLOR[worker.status] || "#71717a";

  const elapsed = worker.startedAt
    ? worker.finishedAt
      ? Math.round((new Date(worker.finishedAt).getTime() - new Date(worker.startedAt).getTime()) / 1000)
      : Math.round((Date.now() - new Date(worker.startedAt).getTime()) / 1000)
    : null;

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
      border: `1px solid ${isActive ? color + "40" : "rgba(255,255,255,0.06)"}`,
      borderRadius: 8,
      margin: "8px 0",
      overflow: "hidden",
      transition: "border-color 0.3s"
    }}>
      {/* Header */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", cursor: "pointer" }}
        onClick={() => setExpanded(e => !e)}
      >
        <PulsingDot color={color} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-main, #e4e4e7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {worker.task.title}
          </div>
          <div style={{ fontSize: 11, color, marginTop: 2, fontWeight: 500 }}>
            {STATUS_LABEL[worker.status]}
            {elapsed !== null && <span style={{ color: "#71717a", marginLeft: 8 }}>{elapsed}s</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {isActive && (
            <button
              style={{ background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 4, color: "#f87171", fontSize: 10, padding: "2px 8px", cursor: "pointer" }}
              onClick={e => { e.stopPropagation(); onCancel(worker.id); }}
            >
              Cancel
            </button>
          )}
          <span style={{ fontSize: 10, color: "#52525b" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Expanded log */}
      {expanded && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ padding: "6px 12px 4px", fontSize: 10, color: "#52525b", fontFamily: "monospace", fontWeight: 700 }}>
            TASK: {worker.task.goal.slice(0, 120)}{worker.task.goal.length > 120 ? "..." : ""}
          </div>
          {worker.error && (
            <div style={{ padding: "4px 12px", fontSize: 11, color: "#f87171", background: "rgba(248,113,113,0.08)" }}>
              [ERROR] {worker.error}
            </div>
          )}
          <div
            ref={logRef}
            style={{ height: 160, overflowY: "auto", padding: "6px 12px", fontFamily: "monospace", fontSize: 11, color: "#a1a1aa", lineHeight: 1.5 }}
          >
            {worker.log.length === 0
              ? <span style={{ color: "#52525b" }}>Waiting for output...</span>
              : worker.log.slice(-200).map((line: string, i: number) => <div key={i}>{line}</div>)
            }
          </div>
        </div>
      )}
    </div>
  );
}

export function ParallelAgentsDashboard({ repoPath }: ParallelAgentsDashboardProps) {
  const { showInputBox } = useQuickInput();
  const [workers, setWorkers] = useState<WorkerState[]>([]);
  const [goalInput, setGoalInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "dag">("cards");
  const [conflictFile, setConflictFile] = useState<string | null>(null);
  const [skillSuccessMsg, setSkillSuccessMsg] = useState<string | null>(null);

  // Subscribe to worker events from main process
  useEffect(() => {
    const a = api();
    if (!a?.onParallelEvent) return;

    const unsub = a.onParallelEvent((event: any) => {
      setWorkers(prev => {
        const idx = prev.findIndex(w => w.id === event.workerId);
        if (idx < 0) {
          // New worker
          const newWorker: WorkerState = {
            id: event.workerId ?? "worker-1",
            task: event.task ?? { id: event.workerId ?? "worker-1", title: "Worker", goal: "", estimatedFiles: [], deps: [] },
            status: event.status ?? "pending",
            log: event.message ? [event.message] : []
          };
          return [...prev, newWorker];
        }
        const updated = [...prev];
        const item = updated[idx];
        if (!item) return prev;
        const existingLog = item.log ?? [];
        const w: WorkerState = {
          ...item,
          id: item.id,
          task: item.task,
          status: event.status ?? item.status,
          log: event.message ? [...existingLog, event.message].slice(-500) : existingLog,
          finishedAt: event.type === "done" || event.type === "error" ? new Date().toISOString() : item.finishedAt,
          error: event.type === "error" ? (event.message ?? "Error") : item.error
        };
        updated[idx] = w;
        return updated;
      });
    });

    // Load existing workers
    a.parallelList?.().then((list: WorkerState[]) => setWorkers(list ?? [])).catch(() => {});

    return () => unsub?.();
  }, []);

  const handleSpawn = useCallback(async () => {
    if (!goalInput.trim() || !repoPath) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const a = api();
      if (!a?.parallelSpawn) {
        setError("Parallel agents not available. Ensure the main process is running.");
        return;
      }
      await a.parallelSpawn({ goal: goalInput.trim(), repoPath });
      setGoalInput("");
    } catch (err: any) {
      setError(err?.message ?? "Failed to spawn worker");
    } finally {
      setIsSubmitting(false);
    }
  }, [goalInput, repoPath]);

  const handleCancel = useCallback(async (workerId: string) => {
    try {
      await api()?.parallelCancel?.(workerId);
      setWorkers(prev => prev.map(w => w.id === workerId ? { ...w, status: "cancelled" } : w));
    } catch {}
  }, []);

  const handleClearDone = () => {
    setWorkers(prev => prev.filter(w => !["done", "error", "cancelled"].includes(w.status)));
  };

  const activeCount = workers.filter(w => ["pending", "planning", "coding", "testing", "reviewing"].includes(w.status)).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#050505", color: "var(--text-main, #e4e4e7)", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "12px 14px 8px", borderBottom: "1px solid #27272a", background: "#000" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.8px", color: "#fafafa" }}>PARALLEL AGENTS</div>
            <div style={{ fontSize: 11, color: "#52525b", marginTop: 2 }}>
              {activeCount > 0
                ? <span style={{ color: "#38bdf8", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span className="pulsing-dot" style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#38bdf8" }} />
                    {activeCount} agent{activeCount !== 1 ? "s" : ""} running
                  </span>
                : <span>No active agents</span>
              }
              {workers.length > 0 && <span> &middot; {workers.length} total</span>}
            </div>
          </div>
          {workers.some(w => ["done", "error", "cancelled"].includes(w.status)) && (
            <button
              style={{ fontSize: 10, background: "none", border: "1px solid #3f3f46", borderRadius: 4, color: "#71717a", padding: "3px 8px", cursor: "pointer" }}
              onClick={handleClearDone}
            >
              Clear Done
            </button>
          )}
        </div>

        {/* Goal input */}
        <div style={{ display: "flex", gap: 6 }}>
          <textarea
            value={goalInput}
            onChange={e => setGoalInput(e.target.value)}
            placeholder="Describe a goal to run in parallel (e.g. 'Add unit tests for all utils, and refactor the API module')..."
            rows={2}
            style={{
              flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid #27272a",
              borderRadius: 6, color: "var(--text-main, #e4e4e7)", fontSize: 12,
              padding: "8px 10px", resize: "none", outline: "none", fontFamily: "inherit",
              lineHeight: 1.5
            }}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSpawn(); } }}
          />
          <button
            onClick={handleSpawn}
            disabled={isSubmitting || !goalInput.trim() || !repoPath}
            style={{
              background: isSubmitting || !goalInput.trim() ? "rgba(56,189,248,0.15)" : "var(--accent, #38bdf8)",
              border: "none", borderRadius: 6, color: isSubmitting || !goalInput.trim() ? "#38bdf8" : "#000",
              fontSize: 12, fontWeight: 600, padding: "0 14px", cursor: isSubmitting ? "wait" : "pointer",
              alignSelf: "stretch", whiteSpace: "nowrap", transition: "background 0.2s"
            }}
          >
            {isSubmitting ? "Spawning..." : "Run"}
          </button>
        </div>
        {error && <div style={{ fontSize: 11, color: "#f87171", marginTop: 6 }}>[ERROR] {error}</div>}
        {/* View Switcher & Skill Package */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 6, borderTop: "1px solid #1f1f23" }}>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              style={{
                fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, border: "none", cursor: "pointer",
                backgroundColor: viewMode === "cards" ? "var(--accent, #38bdf8)" : "#18181b",
                color: viewMode === "cards" ? "#000" : "#a1a1aa"
              }}
              onClick={() => setViewMode("cards")}
            >
              Cards View
            </button>
            <button
              style={{
                fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, border: "none", cursor: "pointer",
                backgroundColor: viewMode === "dag" ? "var(--accent, #38bdf8)" : "#18181b",
                color: viewMode === "dag" ? "#000" : "#a1a1aa"
              }}
              onClick={() => setViewMode("dag")}
            >
              DAG Graph View
            </button>
          </div>

          {workers.some(w => w.status === "done") && (
            <button
              style={{ fontSize: 10, background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 4, color: "#22c55e", padding: "2px 8px", cursor: "pointer" }}
              onClick={async () => {
                const api = (window as any).atlasAPI;
                const name = await showInputBox({ prompt: "Enter custom skill name (e.g. refactor-and-test):", placeholder: "refactor-and-test" });
                if (name && api?.packageSkill) {
                  await api.packageSkill({ name, repoPath });
                  setSkillSuccessMsg(`Skill saved to .agents/skills/${name}/SKILL.md`);
                  setTimeout(() => setSkillSuccessMsg(null), 4000);
                }
              }}
            >
              + Save as Skill
            </button>
          )}
        </div>
        {skillSuccessMsg && <div style={{ fontSize: 11, color: "#22c55e", marginTop: 4 }}>{skillSuccessMsg}</div>}
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 12px 12px" }}>
        {viewMode === "dag" ? (
          <ParallelDAGViewer workers={workers} />
        ) : workers.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 12, opacity: 0.3 }}>&#9707;</div>
            <div style={{ fontSize: 13, color: "#52525b" }}>No parallel agents yet</div>
            <div style={{ fontSize: 11, color: "#3f3f46", marginTop: 6 }}>
              Describe a goal above and press Run (or Ctrl+Enter)
            </div>
          </div>
        ) : (
          <>
            {/* Active first */}
            {workers.filter(w => ["pending","planning","coding","testing","reviewing"].includes(w.status)).map(w => (
              <WorkerCard key={w.id} worker={w} onCancel={handleCancel} />
            ))}
            {/* Then finished */}
            {workers.filter(w => ["done","error","cancelled"].includes(w.status)).map(w => (
              <WorkerCard key={w.id} worker={w} onCancel={handleCancel} />
            ))}
          </>
        )}
      </div>

      {/* Footer note */}
      <div style={{ padding: "6px 14px", borderTop: "1px solid #1a1a1a", fontSize: 10, color: "#3f3f46" }}>
        AtlasParallel &mdash; Multi-agent concurrent workflow &mdash; Ctrl+Enter to submit
      </div>

      {/* Conflict Resolution Modal */}
      {conflictFile && (
        <ConflictResolverModal
          conflictFilePath={conflictFile}
          onClose={() => setConflictFile(null)}
          onResolved={() => setConflictFile(null)}
        />
      )}
    </div>
  );
}
