import React, { useState, useEffect, useCallback } from "react";
import { Flame, RefreshCw, FileCode, CheckCircle2, XCircle, AlertCircle, Lightbulb, Sparkles, ExternalLink } from "lucide-react";
import { mutationTestEngine, type CrucibleReport, type CodeMutant, type MutantStatus } from "@atlas/agents";

interface AtlasCruciblePanelProps {
  activeFilePath?: string;
  activeContent?: string;
  onOpenFile?: (filePath: string, line?: number) => void;
  onGenerateTestPrompt?: (mutant: CodeMutant) => void;
}

const STATUS_CONFIG: Record<MutantStatus, { color: string; bg: string; border: string; label: string }> = {
  killed:   { color: "#34d399", bg: "rgba(52, 211, 153, 0.12)", border: "rgba(52, 211, 153, 0.3)", label: "KILLED" },
  survived: { color: "#f87171", bg: "rgba(248, 113, 113, 0.12)",border: "rgba(248, 113, 113, 0.3)",label: "SURVIVED (WEAK TEST)" },
  timeout:  { color: "#fbbf24", bg: "rgba(251, 191, 36, 0.12)", border: "rgba(251, 191, 36, 0.3)", label: "TIMEOUT" },
  error:    { color: "#a1a1aa", bg: "rgba(161, 161, 170, 0.12)",border: "rgba(161, 161, 170, 0.3)",label: "ERROR" },
};

export function AtlasCruciblePanel({ activeFilePath, activeContent = "", onOpenFile, onGenerateTestPrompt }: AtlasCruciblePanelProps) {
  const [report, setReport] = useState<CrucibleReport | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const runAnalysis = useCallback(() => {
    if (!activeFilePath) return;
    setIsAnalyzing(true);
    try {
      const res = mutationTestEngine.analyzeFile(activeFilePath, activeContent);
      setReport(res);
    } finally {
      setIsAnalyzing(false);
    }
  }, [activeFilePath, activeContent]);

  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  const filteredMutants = report?.mutants.filter((m) => {
    if (filterStatus === "all") return true;
    return m.status === filterStatus;
  }) ?? [];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Flame size={16} color="#f97316" />
          <span style={styles.title}>ATLAS CRUCIBLE — MUTATION TESTING SCORE</span>
        </div>
        <button style={styles.refreshBtn} onClick={runAnalysis} disabled={isAnalyzing}>
          <RefreshCw size={12} className={isAnalyzing ? "spin" : ""} color="#a1a1aa" />
        </button>
      </div>

      {/* Score Gauge Banner */}
      {report && (
        <div style={styles.scoreBanner}>
          <div style={styles.gaugeBox}>
            <span
              style={{
                ...styles.gaugeValue,
                color: report.mutationScore >= 80 ? "#34d399" : report.mutationScore >= 50 ? "#fbbf24" : "#f87171",
              }}
            >
              {report.mutationScore}%
            </span>
            <span style={styles.gaugeLabel}>MUTATION SCORE</span>
          </div>

          <div style={styles.scoreDetails}>
            <div style={styles.detailRow}>
              <CheckCircle2 size={12} color="#34d399" />
              <span>{report.killedCount} Mutants Killed</span>
            </div>
            <div style={styles.detailRow}>
              <XCircle size={12} color="#f87171" />
              <span style={{ color: "#f87171", fontWeight: 600 }}>{report.survivedCount} Mutants Survived</span>
            </div>
            <div style={styles.detailRow}>
              <AlertCircle size={12} color="#a1a1aa" />
              <span>{report.totalMutants} Total AST Mutations</span>
            </div>
          </div>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div style={styles.filterBar}>
        {["all", "survived", "killed"].map((st) => (
          <button
            key={st}
            style={{
              ...styles.filterTab,
              backgroundColor: filterStatus === st ? "rgba(249, 115, 22, 0.15)" : "transparent",
              color: filterStatus === st ? "#f97316" : "#71717a",
              borderColor: filterStatus === st ? "rgba(249, 115, 22, 0.3)" : "rgba(255,255,255,0.06)",
            }}
            onClick={() => setFilterStatus(st)}
          >
            {st.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Mutants Stream */}
      <div style={styles.mutantsStream}>
        {filteredMutants.length === 0 ? (
          <div style={styles.emptyState}>No mutants matching current status filter</div>
        ) : (
          filteredMutants.map((mutant) => {
            const cfg = STATUS_CONFIG[mutant.status];
            return (
              <div key={mutant.id} style={{ ...styles.mutantCard, borderColor: cfg.border }}>
                <div style={styles.mutantHeader}>
                  <span style={{ ...styles.statusBadge, backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                    {cfg.label}
                  </span>
                  <span style={styles.typeBadge}>{mutant.type}</span>
                  <span style={styles.lineLoc} onClick={() => onOpenFile?.(mutant.filePath, mutant.line)}>
                    L{mutant.line} <ExternalLink size={10} color="#71717a" />
                  </span>
                </div>

                <div style={styles.diffBox}>
                  <div style={styles.diffOld}>
                    <span>-</span> <code>{mutant.originalSnippet}</code>
                  </div>
                  <div style={styles.diffNew}>
                    <span>+</span> <code>{mutatedSnippet(mutant)}</code>
                  </div>
                </div>

                <div style={styles.hintBox}>
                  <Lightbulb size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: "1px" }} />
                  <span>{mutant.remediationHint}</span>
                </div>

                {mutant.status === "survived" && (
                  <button
                    style={styles.aiButton}
                    onClick={() => onGenerateTestPrompt?.(mutant)}
                  >
                    <Sparkles size={12} color="#f97316" />
                    <span>Generate Test to Kill Mutant</span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

function mutatedSnippet(mutant: CodeMutant): string {
  return mutant.mutatedSnippet;
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
    color: "#f97316",
    fontSize: "11px",
  },
  refreshBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
  },
  scoreBanner: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "12px 14px",
    backgroundColor: "#0d0d10",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  gaugeBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    padding: "8px 12px",
    borderRadius: "6px",
    minWidth: "70px",
  },
  gaugeValue: {
    fontSize: "20px",
    fontWeight: 800,
    fontFamily: "monospace",
  },
  gaugeLabel: {
    fontSize: "8px",
    color: "#71717a",
    letterSpacing: "0.05em",
    marginTop: "2px",
  },
  scoreDetails: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontSize: "11px",
  },
  detailRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#a1a1aa",
  },
  filterBar: {
    display: "flex",
    gap: "6px",
    padding: "8px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  filterTab: {
    fontSize: "10px",
    fontWeight: 600,
    padding: "3px 8px",
    borderRadius: "4px",
    border: "1px solid",
    cursor: "pointer",
  },
  mutantsStream: {
    flex: 1,
    overflowY: "auto",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  emptyState: {
    padding: "30px 16px",
    textAlign: "center",
    color: "#52525b",
  },
  mutantCard: {
    backgroundColor: "#111113",
    border: "1px solid",
    borderRadius: "6px",
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  mutantHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  statusBadge: {
    fontSize: "9px",
    fontWeight: 700,
    padding: "2px 5px",
    borderRadius: "3px",
    border: "1px solid",
    letterSpacing: "0.05em",
  },
  typeBadge: {
    fontSize: "10px",
    color: "#a1a1aa",
    fontFamily: "monospace",
  },
  lineLoc: {
    color: "#71717a",
    fontSize: "10px",
    fontFamily: "monospace",
    marginLeft: "auto",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  diffBox: {
    backgroundColor: "#09090b",
    border: "1px solid rgba(255,255,255,0.04)",
    borderRadius: "4px",
    padding: "6px 8px",
    fontFamily: "'JetBrains Mono', Consolas, monospace",
    fontSize: "11px",
  },
  diffOld: {
    color: "#f87171",
    marginBottom: "2px",
  },
  diffNew: {
    color: "#34d399",
  },
  hintBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "6px",
    color: "#fbbf24",
    fontSize: "11px",
    backgroundColor: "rgba(251, 191, 36, 0.06)",
    padding: "6px 8px",
    borderRadius: "4px",
  },
  aiButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    backgroundColor: "rgba(249, 115, 22, 0.12)",
    border: "1px solid rgba(249, 115, 22, 0.3)",
    borderRadius: "4px",
    color: "#f97316",
    padding: "5px 8px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: "2px",
  },
};
