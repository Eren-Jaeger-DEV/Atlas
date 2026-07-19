// STUB - This component uses hardcoded explanations and does not actually route requests to the agent runtime.
import { useState } from "react";

interface InlineAiToolProps {
  selectedText?: string;
  onExplain: () => void;
  onGenerateTests: () => void;
  onGenerateDocs: () => void;
  onClose: () => void;
}

export function InlineAiTool({
  selectedText,
  onExplain,
  onGenerateTests,
  onGenerateDocs,
  onClose,
}: InlineAiToolProps) {
  const [explanation, setExplanation] = useState<string | null>(null);

  const handleExplainClick = () => {
    onExplain();
    setExplanation(
      "Explain Code Result:\nThis logic resolves active workspace configuration, verifies permission scopes, and dispatches command events."
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>AI CODE ASSISTANT</span>
        <button style={styles.closeBtn} onClick={onClose}>✕</button>
      </div>

      <div style={styles.actions}>
        <button style={styles.btn} onClick={handleExplainClick}>Explain Code</button>
        <button style={styles.btn} onClick={onGenerateTests}>Generate Tests</button>
        <button style={styles.btn} onClick={onGenerateDocs}>Generate Docs</button>
      </div>

      {explanation && (
        <div style={styles.outputBox}>
          <pre style={styles.pre}>{explanation}</pre>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "absolute",
    top: "10px",
    right: "20px",
    width: "320px",
    backgroundColor: "#141417",
    border: "1px solid #27272a",
    borderRadius: "8px",
    boxShadow: "0 12px 32px rgba(0, 0, 0, 0.6)",
    zIndex: 9999,
    padding: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: "10px",
    fontWeight: 700,
    color: "#38bdf8",
    letterSpacing: "0.8px",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#71717a",
    fontSize: "12px",
    cursor: "pointer",
  },
  actions: {
    display: "flex",
    gap: "6px",
  },
  btn: {
    flex: 1,
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    color: "#fafafa",
    borderRadius: "4px",
    padding: "6px",
    fontSize: "10px",
    fontWeight: 600,
    cursor: "pointer",
  },
  outputBox: {
    backgroundColor: "#09090b",
    border: "1px solid #27272a",
    borderRadius: "4px",
    padding: "8px",
  },
  pre: {
    margin: 0,
    fontSize: "11px",
    color: "#e4e4e7",
    whiteSpace: "pre-wrap",
    lineHeight: "1.4",
  },
};
