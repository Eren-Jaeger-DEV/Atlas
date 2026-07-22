import React from "react";

interface PlanApprovalModalProps {
  reqId: string;
  plan: any;
  onApprove: (reqId: string) => void;
  onReject: (reqId: string) => void;
}

export function PlanApprovalModal({
  reqId,
  plan,
  onApprove,
  onReject,
}: PlanApprovalModalProps) {
  // Try to parse the plan if it's an object or string
  const planGoal = plan?.goal || "Unknown Goal";
  const planReasoning = plan?.planningReasoning || "No reasoning provided.";
  
  // Format the DAG nodes if available
  const tasks = Array.isArray(plan?.dag?.nodes) 
    ? plan.dag.nodes 
    : (Array.isArray(plan?.nodes) ? plan.nodes : []);

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div>
            <span style={styles.tag}>AI ORCHESTRATION</span>
            <h3 style={styles.title}>Execution Plan Approval</h3>
            <p style={styles.subtext}>{planGoal}</p>
          </div>
          <button style={styles.closeBtn} onClick={() => onReject(reqId)}>✕</button>
        </div>

        <div style={styles.contentBox}>
          <p style={styles.sectionHdr}>REASONING</p>
          <pre style={styles.pre}>{planReasoning}</pre>

          {tasks.length > 0 && (
            <>
              <p style={{...styles.sectionHdr, marginTop: "16px"}}>EXECUTION STEPS</p>
              <div style={styles.taskList}>
                {tasks.map((t: any) => (
                  <div key={t.id} style={styles.taskItem}>
                    <span style={styles.taskId}>{t.id}</span>
                    <span style={styles.taskType}>[{t.type}]</span>
                    <span style={styles.taskGoal}>{t.goal || t.prompt}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {tasks.length === 0 && (
            <>
              <p style={{...styles.sectionHdr, marginTop: "16px"}}>RAW PLAN DATA</p>
              <pre style={styles.pre}>{JSON.stringify(plan, null, 2)}</pre>
            </>
          )}
        </div>

        <div style={styles.actions}>
          <button style={styles.rejectBtn} onClick={() => onReject(reqId)}>
            Reject Plan
          </button>
          <button style={styles.approveBtn} onClick={() => onApprove(reqId)}>
            Approve & Execute
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
  },
  modal: {
    backgroundColor: "var(--bg-panel, #141417)",
    border: "1px solid #27272a",
    borderRadius: "10px",
    width: "700px",
    maxWidth: "90vw",
    maxHeight: "80vh",
    boxShadow: "0 24px 72px rgba(0, 0, 0, 0.8)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "16px",
    backgroundColor: "var(--bg-header, #18181b)",
    borderBottom: "1px solid #27272a",
  },
  tag: {
    fontSize: "10px",
    fontWeight: 700,
    color: "#60a5fa",
    letterSpacing: "0.8px",
  },
  title: {
    fontSize: "16px",
    fontWeight: 800,
    margin: "4px 0 2px",
    color: "var(--text-main, #fafafa)",
  },
  subtext: {
    fontSize: "12px",
    color: "var(--text-muted, #a1a1aa)",
    margin: 0,
    fontFamily: "monospace",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted, #a1a1aa)",
    fontSize: "14px",
    cursor: "pointer",
  },
  contentBox: {
    flex: 1,
    padding: "16px",
    backgroundColor: "var(--bg-base, #09090b)",
    overflowY: "auto",
  },
  sectionHdr: {
    fontSize: "10px",
    fontWeight: 700,
    color: "var(--text-muted, #71717a)",
    margin: "0 0 8px",
  },
  pre: {
    margin: 0,
    fontFamily: "'JetBrains Mono', Consolas, monospace",
    fontSize: "12px",
    color: "var(--text-main, #e4e4e7)",
    whiteSpace: "pre-wrap",
    lineHeight: "1.5",
    backgroundColor: "var(--bg-header, #18181b)",
    padding: "12px",
    borderRadius: "6px",
    border: "1px solid #27272a",
  },
  taskList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  taskItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 12px",
    backgroundColor: "var(--bg-header, #18181b)",
    border: "1px solid #27272a",
    borderRadius: "6px",
  },
  taskId: {
    fontFamily: "monospace",
    fontSize: "11px",
    color: "var(--text-muted, #a1a1aa)",
    fontWeight: 600,
    minWidth: "60px",
  },
  taskType: {
    fontSize: "11px",
    color: "var(--accent, #38bdf8)",
    fontWeight: 700,
    minWidth: "80px",
  },
  taskGoal: {
    fontSize: "12px",
    color: "var(--text-main, #e4e4e7)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    padding: "12px 16px",
    backgroundColor: "var(--bg-panel, #141417)",
    borderTop: "1px solid #27272a",
  },
  rejectBtn: {
    backgroundColor: "var(--border-color, #27272a)",
    color: "var(--text-main, #fafafa)",
    border: "none",
    borderRadius: "6px",
    padding: "8px 16px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  approveBtn: {
    backgroundColor: "var(--text-main, #fafafa)",
    color: "var(--bg-base, #09090b)",
    border: "none",
    borderRadius: "6px",
    padding: "8px 16px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
};
