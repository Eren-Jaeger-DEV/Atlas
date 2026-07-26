import React, { useState } from "react";

export interface WorkflowStep {
  id: string;
  name: string;
  action: string;
  description: string;
  allowedTools: string[];
}

export interface AgentWorkflow {
  title: string;
  description: string;
  triggers: string[];
  steps: WorkflowStep[];
}

interface WorkflowEditorProps {
  workflow?: AgentWorkflow;
  onSave?: (updated: AgentWorkflow) => void;
}

export function WorkflowEditor({ workflow, onSave }: WorkflowEditorProps) {
  const [data, setData] = useState<AgentWorkflow>(
    workflow || {
      title: "New Custom Workflow",
      description: "Automated multi-step agent workflow",
      triggers: ["onPush", "manualTrigger"],
      steps: [
        {
          id: "step-1",
          name: "Run Code Linter",
          action: "run_in_terminal",
          description: "Execute static analysis & type checking",
          allowedTools: ["run_command", "get_errors"],
        },
        {
          id: "step-2",
          name: "Auto-Fix Diagnostics",
          action: "code_edit",
          description: "Apply automatic code patches for linter errors",
          allowedTools: ["replace_file_content", "multi_replace_file_content"],
        },
      ],
    }
  );

  const handleAddStep = () => {
    const newStep: WorkflowStep = {
      id: `step-${data.steps.length + 1}`,
      name: `Step ${data.steps.length + 1}`,
      action: "agent_task",
      description: "Workflow execution step",
      allowedTools: ["read_file", "write_to_file"],
    };
    const updated = { ...data, steps: [...data.steps, newStep] };
    setData(updated);
    onSave?.(updated);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #38bdf8)" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
        <span style={styles.title}>CUSTOM WORKFLOW EDITOR</span>
        <button style={styles.addBtn} onClick={handleAddStep}>
          + Add Step
        </button>
      </div>

      <div style={styles.body}>
        <div style={styles.metaBox}>
          <input
            style={styles.titleInput}
            value={data.title}
            onChange={(e) => setData({ ...data, title: e.target.value })}
            placeholder="Workflow Title"
          />
          <input
            style={styles.descInput}
            value={data.description}
            onChange={(e) => setData({ ...data, description: e.target.value })}
            placeholder="Workflow Description"
          />
        </div>

        {/* Steps Flow Timeline */}
        <div style={styles.stepsFlow}>
          {data.steps.map((step, idx) => (
            <div key={step.id} style={styles.stepCard}>
              <div style={styles.stepMeta}>
                <span style={styles.stepBadge}>STEP {idx + 1}</span>
                <span style={styles.actionTag}>{step.action}</span>
              </div>
              <div style={styles.stepName}>{step.name}</div>
              <div style={styles.stepDesc}>{step.description}</div>
              <div style={styles.toolPills}>
                {step.allowedTools.map((tool) => (
                  <span key={tool} style={styles.toolPill}>
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: "var(--bg-base, #09090b)",
    border: "1px solid var(--border-strong, #27272a)",
    borderRadius: "var(--radius-md, 8px)",
    overflow: "hidden",
    fontFamily: "var(--font-sans, system-ui)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    backgroundColor: "var(--bg-panel, #18181b)",
    borderBottom: "1px solid var(--border-subtle, #27272a)",
  },
  title: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--accent, #38bdf8)",
    letterSpacing: "0.8px",
  },
  addBtn: {
    marginLeft: "auto",
    backgroundColor: "var(--accent, #38bdf8)",
    color: "#09090b",
    border: "none",
    borderRadius: "4px",
    padding: "3px 8px",
    fontSize: "10px",
    fontWeight: 700,
    cursor: "pointer",
  },
  body: {
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  metaBox: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  titleInput: {
    backgroundColor: "var(--bg-panel, #18181b)",
    border: "1px solid var(--border-subtle, #27272a)",
    color: "var(--text-main, #fafafa)",
    fontSize: "13px",
    fontWeight: 600,
    padding: "6px 8px",
    borderRadius: "4px",
  },
  descInput: {
    backgroundColor: "var(--bg-panel, #18181b)",
    border: "1px solid var(--border-subtle, #27272a)",
    color: "var(--text-muted, #a1a1aa)",
    fontSize: "11px",
    padding: "6px 8px",
    borderRadius: "4px",
  },
  stepsFlow: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  stepCard: {
    backgroundColor: "var(--bg-panel, #18181b)",
    border: "1px solid var(--border-subtle, #27272a)",
    borderRadius: "6px",
    padding: "10px",
  },
  stepMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  },
  stepBadge: {
    fontSize: "9px",
    fontWeight: 700,
    color: "var(--accent, #38bdf8)",
  },
  actionTag: {
    fontSize: "9px",
    color: "var(--text-muted, #a1a1aa)",
    backgroundColor: "var(--bg-base, #09090b)",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  stepName: {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-main, #fafafa)",
  },
  stepDesc: {
    fontSize: "11px",
    color: "var(--text-muted, #a1a1aa)",
    marginTop: "2px",
  },
  toolPills: {
    display: "flex",
    gap: "4px",
    marginTop: "6px",
    flexWrap: "wrap",
  },
  toolPill: {
    fontSize: "9px",
    color: "#34d399",
    backgroundColor: "rgba(52, 211, 153, 0.1)",
    border: "1px solid rgba(52, 211, 153, 0.3)",
    padding: "2px 6px",
    borderRadius: "4px",
  },
};
