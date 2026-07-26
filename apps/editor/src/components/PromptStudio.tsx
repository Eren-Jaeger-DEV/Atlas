import React, { useState } from "react";

export function PromptStudio() {
  const [promptText, setPromptText] = useState(
    "You are Antigravity, a powerful agentic AI coding assistant built by Google DeepMind..."
  );
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(4096);

  const estimatedTokens = Math.round(promptText.length / 4);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleGroup}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #38bdf8)" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          <span style={styles.title}>AI CASCADE PROMPT STUDIO</span>
        </div>
        <span style={styles.tokenBadge}>{estimatedTokens} Tokens</span>
      </div>

      <div style={styles.bodyRow}>
        <div style={styles.editorCol}>
          <textarea
            style={styles.promptArea}
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Type custom system prompt instructions..."
          />
        </div>

        <div style={styles.paramCol}>
          <div style={styles.paramItem}>
            <label style={styles.paramLabel}>Temperature: {temperature}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              style={styles.rangeInput}
            />
          </div>

          <div style={styles.paramItem}>
            <label style={styles.paramLabel}>Max Tokens: {maxTokens}</label>
            <input
              type="range"
              min="1024"
              max="16384"
              step="512"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              style={styles.rangeInput}
            />
          </div>

          <button style={styles.testBtn}>⚡ Run Test Generation</button>
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
  tokenBadge: {
    fontSize: "10px",
    fontWeight: 600,
    color: "var(--text-muted, #a1a1aa)",
    backgroundColor: "var(--bg-base, #09090b)",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  bodyRow: {
    display: "flex",
    minHeight: "180px",
  },
  editorCol: {
    flex: 1,
    borderRight: "1px solid var(--border-subtle, #27272a)",
    padding: "8px",
  },
  promptArea: {
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
    border: "none",
    color: "var(--text-main, #fafafa)",
    fontSize: "12px",
    fontFamily: "monospace",
    resize: "none",
    outline: "none",
  },
  paramCol: {
    width: "200px",
    padding: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    backgroundColor: "var(--bg-panel, #18181b)",
  },
  paramItem: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  paramLabel: {
    fontSize: "10px",
    fontWeight: 600,
    color: "var(--text-muted, #a1a1aa)",
  },
  rangeInput: {
    accentColor: "var(--accent, #38bdf8)",
  },
  testBtn: {
    marginTop: "auto",
    backgroundColor: "var(--accent, #38bdf8)",
    color: "#09090b",
    border: "none",
    borderRadius: "4px",
    padding: "6px",
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer",
  },
};
