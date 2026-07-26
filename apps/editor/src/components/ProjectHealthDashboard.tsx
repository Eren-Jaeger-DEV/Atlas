import React from "react";

export function ProjectHealthDashboard() {
  const metrics = [
    { label: "Overall Health Score", value: "98%", status: "excellent", color: "#34d399" },
    { label: "Code Coverage", value: "92.4%", status: "good", color: "#34d399" },
    { label: "Cyclomatic Complexity", value: "Low (1.2)", status: "optimal", color: "#38bdf8" },
    { label: "Circular Dependencies", value: "0 Detected", status: "clean", color: "#34d399" },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #38bdf8)" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        <span style={styles.title}>PROJECT HEALTH & TECHNICAL DEBT</span>
      </div>

      <div style={styles.grid}>
        {metrics.map((m) => (
          <div key={m.label} style={styles.card}>
            <div style={styles.cardLabel}>{m.label}</div>
            <div style={{ ...styles.cardValue, color: m.color }}>{m.value}</div>
            <div style={styles.cardStatus}>{m.status.toUpperCase()}</div>
          </div>
        ))}
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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "8px",
    padding: "10px",
  },
  card: {
    backgroundColor: "var(--bg-panel, #18181b)",
    border: "1px solid var(--border-subtle, #27272a)",
    borderRadius: "6px",
    padding: "10px",
  },
  cardLabel: {
    fontSize: "10px",
    fontWeight: 600,
    color: "var(--text-muted, #a1a1aa)",
    marginBottom: "4px",
  },
  cardValue: {
    fontSize: "18px",
    fontWeight: 700,
    marginBottom: "2px",
  },
  cardStatus: {
    fontSize: "9px",
    fontWeight: 700,
    color: "var(--text-muted, #a1a1aa)",
  },
};
