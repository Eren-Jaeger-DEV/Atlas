import React, { useState } from "react";

export interface WorkflowStep {
  id: string;
  name: string;
  action: "planner" | "coder" | "tester" | "reviewer" | "custom_task";
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
  repoPath?: string;
  onSave?: (updated: AgentWorkflow) => void;
}

const AVAILABLE_TOOLS = [
  "run_command",
  "read_file",
  "write_to_file",
  "replace_file_content",
  "multi_replace_file_content",
  "query_memory",
  "search_symbol",
  "verify_ast",
];

const ACTION_TYPES = [
  { value: "planner", label: "[PLAN] Architecture Planner" },
  { value: "coder", label: "[CODE] Implementation Coder" },
  { value: "tester", label: "[TEST] Verification Tester" },
  { value: "reviewer", label: "[REVIEW] Risk Reviewer" },
  { value: "custom_task", label: "[TASK] Custom Task Execution" },
];

export function WorkflowEditor({ workflow, repoPath, onSave }: WorkflowEditorProps) {
  const [data, setData] = useState<AgentWorkflow>(
    workflow || {
      title: "New Custom Workflow",
      description: "Automated multi-step agent DAG workflow",
      triggers: ["manualTrigger"],
      steps: [
        {
          id: "step-1",
          name: "Plan Task Architecture",
          action: "planner",
          description: "Analyze requirement and produce execution DAG",
          allowedTools: ["query_memory", "search_symbol"],
        },
        {
          id: "step-2",
          name: "Execute Code Modifications",
          action: "coder",
          description: "Write code and apply file replacements",
          allowedTools: ["replace_file_content", "multi_replace_file_content", "write_to_file"],
        },
        {
          id: "step-3",
          name: "Run Test Verification",
          action: "tester",
          description: "Run automated test suites and verify AST",
          allowedTools: ["run_command", "verify_ast"],
        },
      ],
    }
  );

  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleAddStep = () => {
    const nextIdx = data.steps.length + 1;
    const newStep: WorkflowStep = {
      id: `step-${nextIdx}`,
      name: `Custom Step ${nextIdx}`,
      action: "custom_task",
      description: "Custom workflow step description",
      allowedTools: ["read_file", "write_to_file"],
    };
    const updated = { ...data, steps: [...data.steps, newStep] };
    setData(updated);
    onSave?.(updated);
  };

  const handleRemoveStep = (idx: number) => {
    const updatedSteps = data.steps.filter((_, i) => i !== idx);
    const updated = { ...data, steps: updatedSteps };
    setData(updated);
    onSave?.(updated);
  };

  const handleMoveStep = (idx: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= data.steps.length) return;

    const newSteps = [...data.steps];
    const temp = newSteps[idx]!;
    newSteps[idx] = newSteps[targetIdx]!;
    newSteps[targetIdx] = temp;

    const updated = { ...data, steps: newSteps };
    setData(updated);
    onSave?.(updated);
  };

  const handleUpdateStep = (idx: number, patch: Partial<WorkflowStep>) => {
    const newSteps = [...data.steps];
    newSteps[idx] = { ...newSteps[idx]!, ...patch };
    const updated = { ...data, steps: newSteps };
    setData(updated);
    onSave?.(updated);
  };

  const handleToggleTool = (stepIdx: number, toolName: string) => {
    const step = data.steps[stepIdx]!;
    const tools = step.allowedTools.includes(toolName)
      ? step.allowedTools.filter((t) => t !== toolName)
      : [...step.allowedTools, toolName];

    handleUpdateStep(stepIdx, { allowedTools: tools });
  };

  const handleSaveWorkflow = async () => {
    try {
      setSaveStatus("Saving...");
      const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "custom-workflow";
      const api = (window as any).atlasAPI;

      if (api && api.writeFile && repoPath) {
        const filePath = `${repoPath}/.atlas/workflows/${slug}.json`;
        await api.writeFile(filePath, JSON.stringify(data, null, 2));
        setSaveStatus(`Saved to .atlas/workflows/${slug}.json`);
      } else {
        setSaveStatus("Workflow configuration valid.");
      }
      onSave?.(data);
    } catch (e: any) {
      setSaveStatus(`Error saving: ${e.message}`);
    } finally {
      setTimeout(() => setSaveStatus(null), 4000);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTitleGroup}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #38bdf8)" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
          <span style={styles.title}>INTERACTIVE WORKFLOW DAG BUILDER</span>
        </div>
        <div style={styles.headerBtnGroup}>
          {saveStatus && <span style={styles.statusText}>{saveStatus}</span>}
          <button style={styles.saveBtn} onClick={handleSaveWorkflow}>
            Save Workflow
          </button>
          <button style={styles.addBtn} onClick={handleAddStep}>
            + Add Step
          </button>
        </div>
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
            <React.Fragment key={step.id}>
              {idx > 0 && (
                <div style={styles.connectorContainer}>
                  <svg width="24" height="20" viewBox="0 0 24 20" fill="none" stroke="var(--accent, #38bdf8)" strokeWidth="2">
                    <line x1="12" y1="0" x2="12" y2="14" strokeDasharray="3 3" />
                    <polygon points="8,12 12,18 16,12" fill="var(--accent, #38bdf8)" />
                  </svg>
                </div>
              )}

              <div style={styles.stepCard}>
                <div style={styles.stepHeader}>
                  <div style={styles.stepHeaderLeft}>
                    <span style={styles.stepBadge}>STEP {idx + 1}</span>
                    <select
                      style={styles.actionSelect}
                      value={step.action}
                      onChange={(e) => handleUpdateStep(idx, { action: e.target.value as any })}
                    >
                      {ACTION_TYPES.map((act) => (
                        <option key={act.value} value={act.value}>
                          {act.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.stepHeaderRight}>
                    <button
                      style={styles.iconBtn}
                      disabled={idx === 0}
                      onClick={() => handleMoveStep(idx, "up")}
                      title="Move Up"
                    >
                      ↑
                    </button>
                    <button
                      style={styles.iconBtn}
                      disabled={idx === data.steps.length - 1}
                      onClick={() => handleMoveStep(idx, "down")}
                      title="Move Down"
                    >
                      ↓
                    </button>
                    <button
                      style={{ ...styles.iconBtn, color: "#f87171" }}
                      onClick={() => handleRemoveStep(idx)}
                      title="Remove Step"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <input
                  style={styles.stepNameInput}
                  value={step.name}
                  onChange={(e) => handleUpdateStep(idx, { name: e.target.value })}
                  placeholder="Step Name"
                />
                <input
                  style={styles.stepDescInput}
                  value={step.description}
                  onChange={(e) => handleUpdateStep(idx, { description: e.target.value })}
                  placeholder="Step Description"
                />

                <div style={styles.toolSection}>
                  <span style={styles.toolSectionTitle}>ALLOWED TOOLS:</span>
                  <div style={styles.toolPills}>
                    {AVAILABLE_TOOLS.map((tool) => {
                      const isSelected = step.allowedTools.includes(tool);
                      return (
                        <button
                          key={tool}
                          style={{
                            ...styles.toolPillToggle,
                            ...(isSelected ? styles.toolPillActive : styles.toolPillInactive),
                          }}
                          onClick={() => handleToggleTool(idx, tool)}
                        >
                          {isSelected ? "✓ " : "+ "}{tool}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </React.Fragment>
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
    justifyContent: "space-between",
    padding: "8px 12px",
    backgroundColor: "var(--bg-panel, #18181b)",
    borderBottom: "1px solid var(--border-subtle, #27272a)",
  },
  headerTitleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  title: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--accent, #38bdf8)",
    letterSpacing: "0.8px",
  },
  headerBtnGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  statusText: {
    fontSize: "10px",
    color: "#34d399",
    fontWeight: 600,
  },
  saveBtn: {
    backgroundColor: "#22c55e",
    color: "#ffffff",
    border: "none",
    borderRadius: "4px",
    padding: "3px 10px",
    fontSize: "10px",
    fontWeight: 700,
    cursor: "pointer",
  },
  addBtn: {
    backgroundColor: "var(--accent, #38bdf8)",
    color: "#09090b",
    border: "none",
    borderRadius: "4px",
    padding: "3px 10px",
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
    gap: "4px",
  },
  connectorContainer: {
    display: "flex",
    justifyContent: "center",
    margin: "2px 0",
  },
  stepCard: {
    backgroundColor: "var(--bg-panel, #18181b)",
    border: "1px solid var(--border-subtle, #27272a)",
    borderRadius: "6px",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  stepHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stepHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  stepBadge: {
    fontSize: "9px",
    fontWeight: 700,
    color: "var(--accent, #38bdf8)",
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  actionSelect: {
    backgroundColor: "var(--bg-base, #09090b)",
    border: "1px solid #27272a",
    color: "#fafafa",
    fontSize: "10px",
    fontWeight: 600,
    borderRadius: "4px",
    padding: "2px 6px",
    outline: "none",
  },
  stepHeaderRight: {
    display: "flex",
    gap: "4px",
  },
  iconBtn: {
    background: "transparent",
    border: "1px solid #27272a",
    color: "#a1a1aa",
    borderRadius: "4px",
    padding: "2px 6px",
    fontSize: "11px",
    cursor: "pointer",
  },
  stepNameInput: {
    backgroundColor: "var(--bg-base, #09090b)",
    border: "1px solid #27272a",
    color: "#fafafa",
    fontSize: "12px",
    fontWeight: 600,
    padding: "6px 8px",
    borderRadius: "4px",
  },
  stepDescInput: {
    backgroundColor: "var(--bg-base, #09090b)",
    border: "1px solid #27272a",
    color: "#a1a1aa",
    fontSize: "11px",
    padding: "4px 8px",
    borderRadius: "4px",
  },
  toolSection: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    marginTop: "4px",
  },
  toolSectionTitle: {
    fontSize: "9px",
    fontWeight: 700,
    color: "#71717a",
    letterSpacing: "0.5px",
  },
  toolPills: {
    display: "flex",
    gap: "4px",
    flexWrap: "wrap",
  },
  toolPillToggle: {
    fontSize: "9px",
    fontWeight: 600,
    borderRadius: "4px",
    padding: "3px 7px",
    cursor: "pointer",
    border: "none",
  },
  toolPillActive: {
    color: "#34d399",
    backgroundColor: "rgba(52, 211, 153, 0.15)",
    border: "1px solid rgba(52, 211, 153, 0.4)",
  },
  toolPillInactive: {
    color: "#71717a",
    backgroundColor: "var(--bg-base, #09090b)",
    border: "1px solid #27272a",
  },
};
