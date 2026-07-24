import React, { useEffect, useState } from "react";
import { dapClient, DAPEvent } from "../dap/DAPClient.js";

export function DebugPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [callStack, setCallStack] = useState<any[]>([]);
  const [variables, setVariables] = useState<any[]>([]);
  const [activeFrame, setActiveFrame] = useState(0);

  useEffect(() => {
    const unsub = dapClient.onEvent(async (e: DAPEvent) => {
      if (e.event === "stopped") {
        setIsPaused(true);
        setIsRunning(true);
        const stackRes = await dapClient.sendRequest("stackTrace", { threadId: 1 });
        setCallStack(stackRes?.stackFrames || []);
        setActiveFrame(0);

        if (stackRes?.stackFrames?.length > 0) {
          const scopeRes = await dapClient.sendRequest("scopes", { frameId: 0 });
          const scope = scopeRes?.scopes?.[0];
          if (scope) {
            const varRes = await dapClient.sendRequest("variables", { variablesReference: scope.variablesReference });
            setVariables(varRes?.variables || []);
          }
        }
      } else if (e.event === "continued") {
        setIsPaused(false);
        setCallStack([]);
        setVariables([]);
      } else if (e.event === "terminated") {
        setIsRunning(false);
        setIsPaused(false);
        setCallStack([]);
        setVariables([]);
      }
    });
    return () => { unsub(); };
  }, []);

  const doAction = (cmd: string) => dapClient.sendRequest(cmd);

  const loadFrameVars = async (frameId: number, idx: number) => {
    setActiveFrame(idx);
    const scopeRes = await dapClient.sendRequest("scopes", { frameId });
    const scope = scopeRes?.scopes?.[0];
    if (scope) {
      const varRes = await dapClient.sendRequest("variables", { variablesReference: scope.variablesReference });
      setVariables(varRes?.variables || []);
    }
  };

  return (
    <div style={s.panel}>
      {/* Header */}
      <div style={s.header}>
        <span style={s.headerTitle}>DEBUGGER</span>
        <span style={{
          ...s.statusPill,
          backgroundColor: isPaused ? "rgba(251,191,36,0.15)" : isRunning ? "rgba(34,197,94,0.15)" : "rgba(113,113,122,0.15)",
          color: isPaused ? "#fbbf24" : isRunning ? "#22c55e" : "#71717a",
          borderColor: isPaused ? "rgba(251,191,36,0.3)" : isRunning ? "rgba(34,197,94,0.3)" : "rgba(113,113,122,0.3)",
        }}>
          {isPaused ? "Paused" : isRunning ? "Running" : "Idle"}
        </span>
      </div>

      {/* Toolbar */}
      <div style={s.toolbar}>
        <ToolBtn icon="continue" title="Continue (F5)" disabled={!isPaused} onClick={() => doAction("continue")} />
        <ToolBtn icon="step-over" title="Step Over (F10)" disabled={!isPaused} onClick={() => doAction("next")} />
        <ToolBtn icon="step-into" title="Step Into (F11)" disabled={!isPaused} onClick={() => doAction("stepIn")} />
        <ToolBtn icon="step-out" title="Step Out (Shift+F11)" disabled={!isPaused} onClick={() => doAction("stepOut")} />
        <div style={s.toolbarSep} />
        <ToolBtn icon="stop" title="Stop (Shift+F5)" disabled={!isRunning} onClick={() => doAction("disconnect")} danger />
      </div>

      {/* Variables */}
      <SectionBox title="VARIABLES" defaultOpen>
        {variables.length === 0 ? (
          <div style={s.emptyMsg}>{isPaused ? "No variables in scope" : "Not paused"}</div>
        ) : (
          <div style={s.varList}>
            {variables.map((v, i) => (
              <div key={i} style={s.varRow}>
                <span style={s.varName}>{v.name}</span>
                <span style={s.varColon}> = </span>
                <span style={s.varValue}>{v.value}</span>
                {v.type && <span style={s.varType}> {v.type}</span>}
              </div>
            ))}
          </div>
        )}
      </SectionBox>

      {/* Call Stack */}
      <SectionBox title="CALL STACK" defaultOpen>
        {callStack.length === 0 ? (
          <div style={s.emptyMsg}>Not paused</div>
        ) : (
          <div style={s.varList}>
            {callStack.map((f, i) => (
              <div
                key={i}
                style={{
                  ...s.stackFrame,
                  backgroundColor: activeFrame === i ? "rgba(56,189,248,0.1)" : "transparent",
                  color: activeFrame === i ? "#38bdf8" : "#a1a1aa",
                }}
                onClick={() => loadFrameVars(f.id, i)}
              >
                <span style={s.frameIdx}>{i}</span>
                <span style={s.frameName}>{f.name}</span>
                {f.source?.name && (
                  <span style={s.frameLoc}>{f.source.name}:{f.line}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionBox>

      {/* Empty state when idle */}
      {!isRunning && callStack.length === 0 && (
        <div style={s.idleState}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(113,113,122,0.4)" strokeWidth="1.5" style={{ marginBottom: 10 }}>
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          <div style={{ fontSize: 12, color: "#52525b" }}>No debug session</div>
          <div style={{ fontSize: 11, color: "#3f3f46", marginTop: 4 }}>Run a debug configuration to start</div>
        </div>
      )}
    </div>
  );
}

function SectionBox({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "5px 12px", cursor: "pointer",
          backgroundColor: "rgba(0,0,0,0.2)", userSelect: "none",
        }}
        onClick={() => setOpen(!open)}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2.5"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", color: "#52525b", textTransform: "uppercase" as const }}>{title}</span>
      </div>
      {open && <div style={{ padding: "4px 0 6px" }}>{children}</div>}
    </div>
  );
}

function ToolBtn({ icon, title, disabled, onClick, danger }: { icon: string; title: string; disabled: boolean; onClick: () => void; danger?: boolean }) {
  const [hov, setHov] = useState(false);
  const color = disabled ? "var(--text-faint)" : danger ? (hov ? "#f87171" : "#ef4444") : (hov ? "var(--text-main)" : "var(--text-muted)");
  return (
    <button
      className="hover-scale"
      style={{ background: hov && !disabled ? "rgba(255,255,255,0.06)" : "none", border: "none", cursor: disabled ? "not-allowed" : "pointer", padding: "5px", borderRadius: 4, display: "flex", alignItems: "center", color, transition: "all 0.1s" }}
      disabled={disabled}
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <BtnIcon name={icon} />
    </button>
  );
}

function BtnIcon({ name }: { name: string }) {
  const p = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 as const };
  switch (name) {
    case "continue":  return <svg {...p}><polygon points="5 3 19 12 5 21 5 3"/></svg>;
    case "step-over": return <svg {...p}><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>;
    case "step-into": return <svg {...p}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>;
    case "step-out":  return <svg {...p}><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>;
    case "stop":      return <svg {...p} fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>;
    default: return null;
  }
}

const s: Record<string, React.CSSProperties> = {
  panel: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "var(--bg-base, #0d0d10)",
    color: "var(--text-main, #e4e4e7)",
    fontFamily: "var(--font-ui, Inter, system-ui, sans-serif)",
    overflow: "hidden",
  },
  header: {
    padding: "0 12px",
    height: 35,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid var(--border-subtle)",
    backgroundColor: "transparent",
  },
  headerTitle: {
    fontSize: 11, fontWeight: 700, letterSpacing: "0.8px", color: "var(--text-muted)", textTransform: "uppercase",
  },
  statusPill: {
    fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
    border: "1px solid", letterSpacing: "0.3px",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    padding: "4px 8px",
    borderBottom: "1px solid var(--border-subtle)",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  toolbarSep: {
    width: 1, height: 16, backgroundColor: "rgba(255,255,255,0.08)", margin: "0 4px",
  },
  varList: { padding: "0 8px" },
  varRow: {
    display: "flex",
    alignItems: "baseline",
    padding: "3px 4px",
    borderRadius: 3,
    fontSize: 12,
    fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  varName: { color: "#93c5fd", flexShrink: 0 },
  varColon: { color: "var(--text-faint)", flexShrink: 0 },
  varValue: { color: "var(--text-main)", flex: 1, overflow: "hidden", textOverflow: "ellipsis" },
  varType: { color: "var(--text-faint)", fontSize: 11, flexShrink: 0 },
  stackFrame: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "3px 8px",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
    transition: "all 0.1s",
  },
  frameIdx: { color: "#3f3f46", fontSize: 10, minWidth: 16, textAlign: "center" },
  frameName: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  frameLoc: { color: "#52525b", fontSize: 11, flexShrink: 0 },
  emptyMsg: { fontSize: 12, color: "#3f3f46", fontStyle: "italic", padding: "6px 12px" },
  idleState: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
};
