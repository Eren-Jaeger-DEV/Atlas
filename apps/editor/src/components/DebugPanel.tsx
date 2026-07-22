import React, { useEffect, useState } from "react";
import { dapClient, DAPEvent } from "../dap/DAPClient.js";

export function DebugPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [callStack, setCallStack] = useState<any[]>([]);
  const [variables, setVariables] = useState<any[]>([]);

  useEffect(() => {
    const unsub = dapClient.onEvent(async (e: DAPEvent) => {
      if (e.event === "stopped") {
        setIsPaused(true);
        setIsRunning(true);
        const stackRes = await dapClient.sendRequest("stackTrace", { threadId: 1 });
        setCallStack(stackRes?.stackFrames || []);
        
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

  return (
    <div style={s.panel}>
      <div style={s.header}>DEBUGGER</div>
      
      <div style={s.toolbar}>
        <button style={s.btn} disabled={!isPaused} onClick={() => doAction("continue")} title="Continue">▶️</button>
        <button style={s.btn} disabled={!isPaused} onClick={() => doAction("next")} title="Step Over">⏭️</button>
        <button style={s.btn} disabled={!isPaused} onClick={() => doAction("stepIn")} title="Step Into">⬇️</button>
        <button style={s.btn} disabled={!isPaused} onClick={() => doAction("stepOut")} title="Step Out">⬆️</button>
        <button style={s.btn} disabled={!isRunning} onClick={() => doAction("disconnect")} title="Stop">⏹️</button>
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>VARIABLES</div>
        <div style={s.content}>
          {variables.length === 0 ? <div style={s.empty}>No variables</div> : variables.map((v, i) => (
             <div key={i} style={s.row}>
               <span style={s.varName}>{v.name}</span>: <span style={s.varValue}>{v.value}</span>
             </div>
          ))}
        </div>
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>CALL STACK</div>
        <div style={s.content}>
          {callStack.length === 0 ? <div style={s.empty}>Not paused</div> : callStack.map((f, i) => (
             <div key={i} style={s.row}>
               {f.name} <span style={s.fileLoc}>({f.source?.name}:{f.line})</span>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const s = {
  panel: {
    display: "flex", flexDirection: "column", height: "100%", backgroundColor: "var(--bg-base, #0d0d10)",
    color: "var(--text-main, #e4e4e7)", fontFamily: "Inter, sans-serif"
  } as React.CSSProperties,
  header: {
    padding: "10px 12px", fontSize: "11px", fontWeight: 700, letterSpacing: "1px",
    color: "var(--text-muted, #71717a)", textTransform: "uppercase", borderBottom: "1px solid #27272a"
  } as React.CSSProperties,
  toolbar: {
    display: "flex", gap: "8px", padding: "8px 12px", borderBottom: "1px solid #27272a", backgroundColor: "var(--bg-panel, #141417)"
  } as React.CSSProperties,
  btn: {
    background: "none", border: "none", cursor: "pointer", fontSize: "14px", opacity: 1, padding: "4px"
  } as React.CSSProperties,
  section: {
    display: "flex", flexDirection: "column", borderBottom: "1px solid #27272a"
  } as React.CSSProperties,
  sectionTitle: {
    padding: "6px 12px", fontSize: "10px", fontWeight: 600, backgroundColor: "var(--bg-header, #18181b)", color: "var(--text-muted, #a1a1aa)"
  } as React.CSSProperties,
  content: {
    padding: "8px 12px", maxHeight: "300px", overflowY: "auto", fontSize: "12px"
  } as React.CSSProperties,
  row: {
    marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
  } as React.CSSProperties,
  empty: {
    color: "#52525b", fontStyle: "italic"
  } as React.CSSProperties,
  varName: { color: "#93c5fd" } as React.CSSProperties,
  varValue: { color: "#d4d4d8" } as React.CSSProperties,
  fileLoc: { color: "var(--text-muted, #71717a)", fontSize: "11px", marginLeft: "6px" } as React.CSSProperties,
};
