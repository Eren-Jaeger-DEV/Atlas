import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface InlineAiToolProps {
  selectedText?: string;
  position?: { top?: number; left?: number; right?: number };
  onExplain: () => void;
  onGenerateTests: () => void;
  onGenerateDocs: () => void;
  onClose: () => void;
}

const api = () => window.atlasAPI;

export function InlineAiTool({
  selectedText,
  position,
  onExplain,
  onGenerateTests,
  onGenerateDocs,
  onClose,
}: InlineAiToolProps) {
  const [prompt, setPrompt] = useState("");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCustomSubmit = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setExplanation("Generating edit...");
    try {
      if (api()?.inlineAgentAction) {
        const res = await api().inlineAgentAction(prompt.trim(), selectedText || "");
        setExplanation(res);
      } else {
        setExplanation(`Generated edit for: "${prompt}"`);
      }
    } catch (e) {
      setExplanation(`Error: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, callback: () => void) => {
    callback();
    if (!api()?.inlineAgentAction) return;
    setLoading(true);
    setExplanation("Thinking...");
    try {
      const res = await api().inlineAgentAction(action, selectedText || "");
      setExplanation(res);
    } catch (e) {
      setExplanation(`Error: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    ...styles.container,
    ...(position ? { top: `${position.top ?? 10}px`, right: position.right !== undefined ? `${position.right}px` : "20px", left: position.left !== undefined ? `${position.left}px` : undefined } : {}),
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -8 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        style={containerStyle}
      >
        <div style={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={styles.badge}>Ctrl+K</span>
            <span style={styles.title}>INLINE AI ASSISTANT</span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Custom Edit Prompt Input (Cursor Ctrl+K parity) */}
        <div style={styles.inputContainer}>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCustomSubmit();
              if (e.key === "Escape") onClose();
            }}
            placeholder="Edit or generate code (e.g. 'Refactor to async', 'Fix bugs')..."
            style={styles.input}
            disabled={loading}
          />
          <button style={styles.submitBtn} onClick={handleCustomSubmit} disabled={loading || !prompt.trim()}>
            Generate
          </button>
        </div>

        <div style={styles.actions}>
          <button style={styles.btn} disabled={loading} onClick={() => handleAction("explain", onExplain)}>Explain</button>
          <button style={styles.btn} disabled={loading} onClick={() => handleAction("test", onGenerateTests)}>Tests</button>
          <button style={styles.btn} disabled={loading} onClick={() => handleAction("docs", onGenerateDocs)}>Docs</button>
        </div>

        {explanation && (
          <div style={styles.outputBox}>
            <pre style={styles.pre}>{explanation}</pre>
            <div style={styles.actionRow}>
              <button style={styles.acceptBtn} onClick={onClose}>Accept (Ctrl+Enter)</button>
              <button style={styles.rejectBtn} onClick={() => setExplanation(null)}>Reject (Esc)</button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "absolute",
    top: "10px",
    right: "20px",
    width: "360px",
    backgroundColor: "var(--bg-glass-strong, rgba(14, 14, 18, 0.95))",
    backdropFilter: "blur(20px) saturate(1.5)",
    WebkitBackdropFilter: "blur(20px) saturate(1.5)",
    border: "1px solid var(--border-strong, #27272a)",
    borderRadius: "var(--radius-lg, 10px)",
    boxShadow: "var(--shadow-lg), 0 20px 40px rgba(0, 0, 0, 0.6)",
    zIndex: 9999,
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    fontSize: "9px",
    fontWeight: 700,
    backgroundColor: "var(--accent-glow, rgba(56, 189, 248, 0.15))",
    color: "var(--accent, #38bdf8)",
    padding: "2px 5px",
    borderRadius: "4px",
    fontFamily: "var(--font-mono)",
  },
  title: {
    fontSize: "10px",
    fontWeight: 700,
    color: "var(--text-muted, #a1a1aa)",
    letterSpacing: "0.8px",
    textTransform: "uppercase",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted, #71717a)",
    fontSize: "12px",
    cursor: "pointer",
  },
  inputContainer: {
    display: "flex",
    gap: "6px",
  },
  input: {
    flex: 1,
    backgroundColor: "var(--bg-base, #09090b)",
    border: "1px solid var(--border-strong, #27272a)",
    borderRadius: "6px",
    padding: "6px 10px",
    fontSize: "12px",
    color: "var(--text-main, #fafafa)",
    outline: "none",
  },
  submitBtn: {
    backgroundColor: "var(--accent, #38bdf8)",
    border: "none",
    color: "#000000",
    fontWeight: 700,
    fontSize: "11px",
    borderRadius: "6px",
    padding: "0 10px",
    cursor: "pointer",
  },
  actions: {
    display: "flex",
    gap: "6px",
  },
  btn: {
    flex: 1,
    backgroundColor: "var(--bg-panel, #18181b)",
    border: "1px solid var(--border-subtle, #27272a)",
    color: "var(--text-main, #fafafa)",
    borderRadius: "6px",
    padding: "5px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.12s ease",
  },
  outputBox: {
    backgroundColor: "var(--bg-base, #09090b)",
    border: "1px solid var(--border-strong, #27272a)",
    borderRadius: "6px",
    padding: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  pre: {
    margin: 0,
    fontSize: "11.5px",
    color: "var(--text-main, #e4e4e7)",
    whiteSpace: "pre-wrap",
    lineHeight: "1.45",
  },
  actionRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "6px",
  },
  acceptBtn: {
    backgroundColor: "#22c55e",
    border: "none",
    color: "#000",
    fontWeight: 700,
    fontSize: "11px",
    padding: "4px 8px",
    borderRadius: "4px",
    cursor: "pointer",
  },
  rejectBtn: {
    backgroundColor: "transparent",
    border: "1px solid #ef4444",
    color: "#ef4444",
    fontWeight: 600,
    fontSize: "11px",
    padding: "4px 8px",
    borderRadius: "4px",
    cursor: "pointer",
  },
};
