import React, { useState, useEffect, useCallback } from "react";
import { History, GitCommit, Sparkles, Copy, Check, ShieldAlert, Code2, Tag } from "lucide-react";
import { commitNarrator, type CommitAnnotation, type CommitRiskLevel } from "@atlas/core";

interface AtlasChroniclePanelProps {
  activeFilePath?: string;
  activeDiffContent?: string;
  onApplyCommitMessage?: (msg: string) => void;
}

const RISK_COLORS: Record<CommitRiskLevel, { color: string; bg: string; border: string }> = {
  LOW:    { color: "#34d399", bg: "rgba(52, 211, 153, 0.12)", border: "rgba(52, 211, 153, 0.3)" },
  MEDIUM: { color: "#fbbf24", bg: "rgba(251, 191, 36, 0.12)", border: "rgba(251, 191, 36, 0.3)" },
  HIGH:   { color: "#f87171", bg: "rgba(248, 113, 113, 0.12)",border: "rgba(248, 113, 113, 0.3)" },
};

export function AtlasChroniclePanel({ activeFilePath, activeDiffContent = "", onApplyCommitMessage }: AtlasChroniclePanelProps) {
  const [annotation, setAnnotation] = useState<CommitAnnotation | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isNarrating, setIsNarrating] = useState<boolean>(false);

  const runNarration = useCallback(() => {
    if (!activeFilePath) return;
    setIsNarrating(true);
    try {
      const res = commitNarrator.narrateDiff(activeFilePath, activeDiffContent);
      setAnnotation(res);
    } finally {
      setIsNarrating(false);
    }
  }, [activeFilePath, activeDiffContent]);

  useEffect(() => {
    runNarration();
  }, [runNarration]);

  const handleCopy = () => {
    if (!annotation) return;
    navigator.clipboard.writeText(annotation.suggestedCommitMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <History size={16} color="#a78bfa" />
          <span style={styles.title}>ATLAS CHRONICLE — COMMIT NARRATOR</span>
        </div>
        <button style={styles.narrateBtn} onClick={runNarration} disabled={isNarrating}>
          <Sparkles size={12} color="#a78bfa" />
          <span>{isNarrating ? "Narrating..." : "Re-Narrate"}</span>
        </button>
      </div>

      {annotation && (
        <div style={styles.contentStream}>
          {/* Metadata Badges Bar */}
          <div style={styles.badgeRow}>
            <span style={styles.typeBadge}>
              <Tag size={10} color="#a78bfa" />
              {annotation.type.toUpperCase()}
            </span>
            <span style={styles.scopeBadge}>({annotation.scope})</span>

            <span
              style={{
                ...styles.riskBadge,
                color: RISK_COLORS[annotation.riskLevel].color,
                backgroundColor: RISK_COLORS[annotation.riskLevel].bg,
                borderColor: RISK_COLORS[annotation.riskLevel].border,
              }}
            >
              <ShieldAlert size={10} color={RISK_COLORS[annotation.riskLevel].color} />
              {annotation.riskLevel} RISK
            </span>
          </div>

          {/* Narrative Summary Box */}
          <div style={styles.narrativeBox}>
            <div style={styles.sectionTitle}>SEMANTIC SUMMARY</div>
            <div style={styles.narrativeText}>{annotation.narrative}</div>
          </div>

          {/* Impacted Symbols Cloud */}
          {annotation.impactedSymbols.length > 0 && (
            <div style={styles.symbolsBox}>
              <div style={styles.sectionTitle}>
                <Code2 size={11} color="#71717a" />
                IMPACTED SYMBOLS ({annotation.impactedSymbols.length})
              </div>
              <div style={styles.symbolsCloud}>
                {annotation.impactedSymbols.map((sym, idx) => (
                  <span key={idx} style={styles.symbolChip}>
                    {sym}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Drafted Commit Message Card */}
          <div style={styles.commitCard}>
            <div style={styles.commitCardHeader}>
              <GitCommit size={14} color="#a78bfa" />
              <span style={{ fontWeight: 600, color: "#e4e4e7" }}>DRAFT CONVENTIONAL COMMIT</span>
            </div>

            <pre style={styles.commitMsgText}>{annotation.suggestedCommitMessage}</pre>

            <div style={styles.actionRow}>
              <button style={styles.copyBtn} onClick={handleCopy}>
                {copied ? <Check size={12} color="#34d399" /> : <Copy size={12} color="#a1a1aa" />}
                <span>{copied ? "Copied!" : "Copy Message"}</span>
              </button>

              {onApplyCommitMessage && (
                <button
                  style={styles.applyBtn}
                  onClick={() => onApplyCommitMessage(annotation.suggestedCommitMessage)}
                >
                  <GitCommit size={12} color="#ffffff" />
                  <span>Apply to Git Commit</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#09090b",
    color: "#f4f4f5",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: "12px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    backgroundColor: "#111113",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  title: {
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "#a78bfa",
    fontSize: "11px",
  },
  narrateBtn: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    backgroundColor: "rgba(167, 139, 250, 0.12)",
    border: "1px solid rgba(167, 139, 250, 0.3)",
    borderRadius: "4px",
    color: "#a78bfa",
    padding: "4px 8px",
    fontSize: "11px",
    cursor: "pointer",
  },
  contentStream: {
    flex: 1,
    overflowY: "auto",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  badgeRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  typeBadge: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    backgroundColor: "rgba(167, 139, 250, 0.15)",
    border: "1px solid rgba(167, 139, 250, 0.3)",
    color: "#a78bfa",
    fontSize: "10px",
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: "4px",
  },
  scopeBadge: {
    color: "#71717a",
    fontFamily: "monospace",
    fontSize: "11px",
  },
  riskBadge: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    marginLeft: "auto",
    fontSize: "9px",
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: "3px",
    border: "1px solid",
  },
  narrativeBox: {
    backgroundColor: "#111113",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "6px",
    padding: "10px 12px",
  },
  sectionTitle: {
    fontSize: "9px",
    fontWeight: 700,
    color: "#71717a",
    letterSpacing: "0.06em",
    marginBottom: "6px",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
  narrativeText: {
    color: "#d4d4d8",
    lineHeight: 1.5,
    fontSize: "11px",
  },
  symbolsBox: {
    backgroundColor: "#111113",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "6px",
    padding: "10px 12px",
  },
  symbolsCloud: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
  },
  symbolChip: {
    backgroundColor: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "4px",
    padding: "2px 6px",
    fontSize: "10px",
    fontFamily: "'JetBrains Mono', Consolas, monospace",
    color: "#a78bfa",
  },
  commitCard: {
    backgroundColor: "#111113",
    border: "1px solid rgba(167, 139, 250, 0.25)",
    borderRadius: "6px",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  commitCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  commitMsgText: {
    margin: 0,
    fontFamily: "'JetBrains Mono', Consolas, monospace",
    fontSize: "11px",
    color: "#f4f4f5",
    backgroundColor: "#09090b",
    border: "1px solid rgba(255,255,255,0.04)",
    borderRadius: "4px",
    padding: "8px 10px",
    whiteSpace: "pre-wrap",
  },
  actionRow: {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
  },
  copyBtn: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    backgroundColor: "#18181b",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "4px",
    color: "#a1a1aa",
    padding: "5px 10px",
    fontSize: "11px",
    cursor: "pointer",
  },
  applyBtn: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    backgroundColor: "#8b5cf6",
    border: "none",
    borderRadius: "4px",
    color: "#ffffff",
    padding: "5px 10px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
  },
};
