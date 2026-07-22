import React, { useMemo } from "react";

interface SynapseDashboardProps {
  events: any[];
}

export function SynapseDashboard({ events }: SynapseDashboardProps) {
  // Compute DAG state from event stream
  const tasks = useMemo(() => {
    const taskMap = new Map<string, any>();
    
    events.forEach(ev => {
      // In a real implementation, we'd listen for explicit DAG updates
      // Here we parse from streamEvents or rely on orchestrator state
      if (ev.type === "state_change" || ev.type === "step_start" || ev.type === "plan_ready") {
        // Fallback for generic events
      }
      // If we have detailed DAG events
      if (ev.type === "dag_update") {
         if (ev.nodes && Array.isArray(ev.nodes)) {
           ev.nodes.forEach((node: any) => taskMap.set(node.id, node));
         } else if (ev.taskId) {
           taskMap.set(ev.taskId, { ...taskMap.get(ev.taskId), ...ev.data });
         }
      }
    });

    // No fallback mock DAG! We only show real events.
    return Array.from(taskMap.values());
  }, [events]);

  return (
    <div style={styles.container}>
      <h4 style={styles.title}>Synapse Flight Deck</h4>
      <div style={styles.dagView}>
        {tasks.map(task => (
          <div key={task.id} style={{ ...styles.node, ...styles[`status_${task.status}`] }}>
            <div style={styles.nodeHeader}>
              <span style={styles.nodeType}>{task.type}</span>
              <span style={styles.nodeStatus}>{task.status}</span>
            </div>
            <div style={styles.nodeId}>{task.id}</div>
          </div>
        ))}
      </div>
      <div style={styles.logs}>
        <h5 style={styles.logsTitle}>Surface Verification Logs</h5>
        <div style={styles.logBox}>
          {events.length > 0 ? events.map((ev, i) => (
            <div key={i} style={styles.logEntry}>[{new Date().toLocaleTimeString()}] {ev.type}</div>
          )) : "Waiting for verification telemetry..."}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    height: "100%",
    overflow: "auto"
  },
  title: {
    color: "var(--text-main, #e4e4e7)",
    fontSize: "14px",
    fontWeight: 600,
    margin: 0,
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  dagView: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "12px",
    backgroundColor: "var(--bg-base, #09090b)",
    borderRadius: "8px",
    border: "1px solid #27272a"
  },
  node: {
    padding: "8px 12px",
    borderRadius: "6px",
    borderLeft: "4px solid #52525b",
    backgroundColor: "var(--bg-header, #18181b)",
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  status_PENDING: { borderLeftColor: "var(--text-muted, #71717a)" },
  status_RUNNING: { borderLeftColor: "#3b82f6" },
  status_COMPLETED: { borderLeftColor: "#22c55e" },
  status_FAILED: { borderLeftColor: "#ef4444" },
  nodeHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  nodeType: {
    color: "var(--text-main, #e4e4e7)",
    fontSize: "12px",
    fontWeight: 600
  },
  nodeStatus: {
    fontSize: "10px",
    color: "var(--text-muted, #a1a1aa)",
    textTransform: "uppercase"
  },
  nodeId: {
    fontSize: "11px",
    color: "var(--text-muted, #71717a)",
    fontFamily: "monospace"
  },
  logs: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    flex: 1
  },
  logsTitle: {
    color: "var(--text-muted, #a1a1aa)",
    fontSize: "12px",
    fontWeight: 500,
    margin: 0
  },
  logBox: {
    backgroundColor: "#000000",
    padding: "12px",
    borderRadius: "6px",
    border: "1px solid #27272a",
    color: "var(--text-muted, #a1a1aa)",
    fontSize: "11px",
    fontFamily: "monospace",
    flex: 1,
    overflowY: "auto"
  },
  logEntry: {
    marginBottom: "4px"
  }
};
