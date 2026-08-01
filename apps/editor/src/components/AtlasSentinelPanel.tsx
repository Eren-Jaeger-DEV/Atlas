import React, { useState, useEffect, useCallback } from "react";
import { ShieldAlert, AlertTriangle, ShieldCheck, RefreshCw, FileCode, CheckCircle, ExternalLink, Lightbulb } from "lucide-react";
import { liveSecurityScanner, type ScanReport, type SecurityFinding, type SentinelSeverity } from "@atlas/agents";

interface AtlasSentinelPanelProps {
  activeFilePath?: string;
  activeContent?: string;
  onOpenFile?: (filePath: string, line?: number) => void;
}

const SEVERITY_CONFIG: Record<SentinelSeverity, { color: string; bg: string; border: string; label: string }> = {
  critical: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)",  border: "rgba(239, 68, 68, 0.3)",  label: "CRITICAL" },
  high:     { color: "#f97316", bg: "rgba(249, 115, 22, 0.12)", border: "rgba(249, 115, 22, 0.3)", label: "HIGH" },
  medium:   { color: "#eab308", bg: "rgba(234, 179, 8, 0.12)",  border: "rgba(234, 179, 8, 0.3)",  label: "MEDIUM" },
  low:      { color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)", border: "rgba(59, 130, 246, 0.3)", label: "LOW" },
};

export function AtlasSentinelPanel({ activeFilePath, activeContent = "", onOpenFile }: AtlasSentinelPanelProps) {
  const [report, setReport] = useState<ScanReport | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [isScanning, setIsScanning] = useState<boolean>(false);

  const runScan = useCallback(() => {
    if (!activeFilePath) return;
    setIsScanning(true);
    try {
      const res = liveSecurityScanner.scanContent(activeFilePath, activeContent);
      setReport(res);
    } finally {
      setIsScanning(false);
    }
  }, [activeFilePath, activeContent]);

  useEffect(() => {
    runScan();
  }, [runScan]);

  const filteredFindings = report?.findings.filter((f) => {
    if (selectedSeverity === "all") return true;
    return f.severity === selectedSeverity;
  }) ?? [];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ShieldAlert size={16} color="#ef4444" />
          <span style={styles.title}>ATLAS SENTINEL — SECURITY RADAR</span>
        </div>
        <button style={styles.refreshBtn} onClick={runScan} disabled={isScanning}>
          <RefreshCw size={12} className={isScanning ? "spin" : ""} color="#a1a1aa" />
        </button>
      </div>

      {/* Overview Banner */}
      {report && (
        <div style={styles.banner}>
          <div style={styles.bannerLeft}>
            {report.totalFindings > 0 ? (
              <AlertTriangle size={24} color="#ef4444" />
            ) : (
              <ShieldCheck size={24} color="#10b981" />
            )}
            <div>
              <div style={styles.bannerTitle}>
                {report.totalFindings > 0 ? `${report.totalFindings} Security Risks Detected` : "No Security Risks Found"}
              </div>
              <div style={styles.bannerSubtitle}>
                {activeFilePath ? activeFilePath.split("/").pop() : "No file selected"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Severity Counters */}
      {report && (
        <div style={styles.countsRow}>
          {(["critical", "high", "medium", "low"] as SentinelSeverity[]).map((sev) => {
            const cfg = SEVERITY_CONFIG[sev];
            const count = report.severityCounts[sev];
            const isSelected = selectedSeverity === sev;
            return (
              <button
                key={sev}
                style={{
                  ...styles.countChip,
                  borderColor: isSelected ? cfg.color : "rgba(255,255,255,0.06)",
                  backgroundColor: isSelected ? cfg.bg : "rgba(255,255,255,0.02)",
                }}
                onClick={() => setSelectedSeverity(isSelected ? "all" : sev)}
              >
                <span style={{ color: cfg.color, fontWeight: 700 }}>{count}</span>
                <span style={{ color: "#71717a", fontSize: "10px" }}>{cfg.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Findings Stream */}
      <div style={styles.findingsStream}>
        {filteredFindings.length === 0 ? (
          <div style={styles.emptyState}>
            <CheckCircle size={32} color="#10b981" style={{ marginBottom: "8px" }} />
            <div>Workspace file clean of AST security vulnerabilities</div>
          </div>
        ) : (
          filteredFindings.map((finding, idx) => {
            const cfg = SEVERITY_CONFIG[finding.severity];
            return (
              <div key={idx} style={{ ...styles.findingCard, borderColor: cfg.border }}>
                <div style={styles.findingHeader}>
                  <span style={{ ...styles.sevBadge, backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                    {cfg.label}
                  </span>
                  <span style={styles.cweTag}>{finding.cweId}</span>
                  <span style={styles.ruleTitle}>{finding.title}</span>
                </div>

                <div style={styles.findingDescription}>{finding.description}</div>

                <div
                  style={styles.snippetBox}
                  onClick={() => onOpenFile?.(finding.filePath, finding.line)}
                >
                  <FileCode size={12} color="#71717a" />
                  <span style={{ color: "#a1a1aa", fontFamily: "monospace" }}>Line {finding.line}:</span>
                  <code style={styles.codeText}>{finding.snippet}</code>
                  <ExternalLink size={10} color="#71717a" style={{ marginLeft: "auto" }} />
                </div>

                <div style={styles.hintBox}>
                  <Lightbulb size={12} color="#eab308" style={{ flexShrink: 0, marginTop: "1px" }} />
                  <span>{finding.remediationHint}</span>
                </div>
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
    color: "#ef4444",
    fontSize: "11px",
  },
  refreshBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
  },
  banner: {
    padding: "12px 14px",
    backgroundColor: "#0d0d10",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  bannerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  bannerTitle: {
    fontWeight: 700,
    fontSize: "13px",
  },
  bannerSubtitle: {
    color: "#71717a",
    fontSize: "11px",
    marginTop: "2px",
  },
  countsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "6px",
    padding: "8px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  countChip: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "6px 4px",
    borderRadius: "4px",
    border: "1px solid",
    cursor: "pointer",
    background: "none",
  },
  findingsStream: {
    flex: 1,
    overflowY: "auto",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 16px",
    color: "#71717a",
    textAlign: "center",
  },
  findingCard: {
    backgroundColor: "#111113",
    border: "1px solid",
    borderRadius: "6px",
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  findingHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  sevBadge: {
    fontSize: "9px",
    fontWeight: 700,
    padding: "2px 5px",
    borderRadius: "3px",
    border: "1px solid",
    letterSpacing: "0.05em",
  },
  cweTag: {
    fontSize: "10px",
    color: "#71717a",
    fontFamily: "monospace",
  },
  ruleTitle: {
    fontWeight: 600,
    color: "#e4e4e7",
  },
  findingDescription: {
    color: "#a1a1aa",
    fontSize: "11px",
    lineHeight: 1.4,
  },
  snippetBox: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#09090b",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "4px",
    padding: "6px 8px",
    cursor: "pointer",
    fontSize: "11px",
  },
  codeText: {
    color: "#ef4444",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  hintBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "6px",
    color: "#eab308",
    fontSize: "11px",
    backgroundColor: "rgba(234, 179, 8, 0.06)",
    padding: "6px 8px",
    borderRadius: "4px",
  },
};
