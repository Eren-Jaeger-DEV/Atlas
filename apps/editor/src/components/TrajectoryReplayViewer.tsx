import React, { useState } from "react";

export interface TrajectoryStep {
  stepIndex: number;
  action: string;
  target: string;
  timestamp: string;
  status: "success" | "error";
}

export function TrajectoryReplayViewer() {
  const steps: TrajectoryStep[] = [
    { stepIndex: 1, action: "view_file", target: "packages/core/src/index.ts", timestamp: "10:42:01", status: "success" },
    { stepIndex: 2, action: "write_to_file", target: "CallGraphVisualizer.tsx", timestamp: "10:42:05", status: "success" },
    { stepIndex: 3, action: "run_command", target: "npx tsc --noEmit", timestamp: "10:42:12", status: "success" },
  ];

  const [currentStepIndex, setCurrentStepIndex] = useState(3);
  const activeStep = steps.find((s) => s.stepIndex === currentStepIndex) || steps[steps.length - 1]!;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleGroup}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #38bdf8)" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          <span style={styles.title}>AUTONOMOUS TRAJECTORY REPLAY</span>
        </div>
        <span style={styles.stepTag}>Step {currentStepIndex} of {steps.length}</span>
      </div>

      <div style={styles.scrubberRow}>
        <input
          type="range"
          min="1"
          max={steps.length}
          value={currentStepIndex}
          onChange={(e) => setCurrentStepIndex(parseInt(e.target.value))}
          style={styles.scrubberInput}
        />
      </div>

      <div style={styles.stepDetailCard}>
        <div style={styles.stepMeta}>
          <span style={styles.actionName}>{activeStep.action}</span>
          <span style={styles.timestamp}>{activeStep.timestamp}</span>
        </div>
        <div style={styles.targetPath}>{activeStep.target}</div>
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
  titleGroup: {
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
  stepTag: {
    fontSize: "10px",
    fontWeight: 600,
    color: "var(--text-muted, #a1a1aa)",
  },
  scrubberRow: {
    padding: "10px 12px",
    backgroundColor: "var(--bg-panel, #18181b)",
    borderBottom: "1px solid var(--border-subtle, #27272a)",
  },
  scrubberInput: {
    width: "100%",
    accentColor: "var(--accent, #38bdf8)",
  },
  stepDetailCard: {
    padding: "10px 12px",
  },
  stepMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  },
  actionName: {
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--accent, #38bdf8)",
    fontFamily: "monospace",
  },
  timestamp: {
    fontSize: "10px",
    color: "var(--text-muted, #a1a1aa)",
  },
  targetPath: {
    fontSize: "11px",
    color: "var(--text-main, #fafafa)",
    fontFamily: "monospace",
  },
};
