import React, { useState, useCallback } from "react";
import { Activity, AlertTriangle, FileCode, Shield, Zap, ChevronRight, TriangleAlert } from "lucide-react";
import type { ImpactResult, AffectedFile, RiskLevel } from "@atlas/core";

interface ImpactRadarPanelProps {
  activeFilePath?: string;
  workspaceRoot?: string;
  onOpenFile?: (filePath: string, line?: number) => void;
}

const RISK_CONFIG: Record<RiskLevel, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  low:      { color: "#34d399", bg: "rgba(52,211,153,0.10)", label: "LOW RISK",      icon: <Shield size={13} color="#34d399" /> },
  medium:   { color: "#f59e0b", bg: "rgba(245,158,11,0.10)", label: "MEDIUM RISK",   icon: <Activity size={13} color="#f59e0b" /> },
  high:     { color: "#f87171", bg: "rgba(248,113,113,0.10)", label: "HIGH RISK",    icon: <AlertTriangle size={13} color="#f87171" /> },
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.13)", label: "CRITICAL RISK", icon: <TriangleAlert size={13} color="#ef4444" /> },
};

function HopDistancePip({ distance }: { distance: number }) {
  const hue = Math.max(0, 120 - distance * 30); // green -> red as hops increase
  return (
    <span
      title={`${distance} hop${distance !== 1 ? "s" : ""} from changed symbol`}
      style={{
        fontSize: "9px",
        fontWeight: 700,
        color: `hsl(${hue}, 80%, 60%)`,
        backgroundColor: `hsl(${hue}, 80%, 60%, 0.12)`,
        border: `1px solid hsl(${hue}, 80%, 60%, 0.25)`,
        padding: "1px 5px",
        borderRadius: "3px",
        flexShrink: 0,
      }}
    >
      {distance}h
    </span>
  );
}

function AffectedFileRow({ file, label, onOpenFile }: { file: AffectedFile; label?: string; onOpenFile?: (fp: string) => void }) {
  const basename = file.filePath.split(/[/\\]/).slice(-2).join("/");
  return (
    <div
      style={styles.fileRow}
      onClick={() => onOpenFile?.(file.filePath)}
      title={file.reason}
    >
      <FileCode size={11} color="#71717a" style={{ flexShrink: 0 }} />
      <span style={styles.fileRowName}>{basename}</span>
      {label && <span style={styles.fileLabel}>{label}</span>}
      <HopDistancePip distance={file.distance} />
      <ChevronRight size={10} color="#3f3f46" style={{ flexShrink: 0, marginLeft: "auto" }} />
    </div>
  );
}

export function ImpactRadarPanel({ activeFilePath, workspaceRoot: _workspaceRoot, onOpenFile }: ImpactRadarPanelProps) {
  const [symbolInput, setSymbolInput] = useState<string>("");
  const [result, setResult] = useState<ImpactResult | null>(null);
  const [isComputing, setIsComputing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompute = useCallback(async () => {
    const targetFile = activeFilePath;
    if (!targetFile) {
      setError("No file open — open a file in the editor first.");
      return;
    }

    setIsComputing(true);
    setError(null);
    setResult(null);

    try {
      const api = window.atlasAPI;
      if (!api?.impact) {
        setError("Atlas Impact API not available. Make sure Atlas graph is initialized (atlas init).");
        return;
      }

      const impactResult = await api.impact(targetFile, symbolInput.trim() || undefined);
      setResult(impactResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impact computation failed.");
    } finally {
      setIsComputing(false);
    }
  }, [activeFilePath, symbolInput]);

  const riskCfg = result ? RISK_CONFIG[result.riskLevel] : null;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <Activity size={15} color="#f59e0b" />
        <span style={styles.title}>IMPACT RADAR</span>
        <span style={styles.subtitle}>Downstream blast radius</span>
      </div>

      {/* Input Form */}
      <div style={styles.section}>
        <label style={styles.label}>Target File</label>
        <div style={styles.fileDisplay}>
          {activeFilePath
            ? <><FileCode size={11} color="#38bdf8" /><span>{activeFilePath.split(/[/\\]/).slice(-2).join("/")}</span></>
            : <span style={{ color: "#3f3f46" }}>No file open in editor</span>
          }
        </div>

        <label style={{ ...styles.label, marginTop: "8px" }}>Symbol Name <span style={{ color: "#52525b", fontWeight: 400 }}>(optional)</span></label>
        <input
          style={styles.codeInput}
          value={symbolInput}
          onChange={(e) => setSymbolInput(e.target.value)}
          placeholder="e.g. computeImpact, ProviderRouter"
          spellCheck={false}
          onKeyDown={(e) => { if (e.key === "Enter") handleCompute(); }}
        />

        <button
          style={{ ...styles.computeBtn, opacity: isComputing || !activeFilePath ? 0.6 : 1 }}
          onClick={handleCompute}
          disabled={isComputing || !activeFilePath}
        >
          <Zap size={12} />
          <span>{isComputing ? "Computing..." : "Compute Impact"}</span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={styles.errorBox}>
          <AlertTriangle size={12} color="#f87171" />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {result && riskCfg && (
        <div style={styles.resultArea}>
          {/* Risk Banner */}
          <div style={{ ...styles.riskBanner, backgroundColor: riskCfg.bg, borderColor: `${riskCfg.color}35` }}>
            {riskCfg.icon}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "12px", fontWeight: 800, color: riskCfg.color }}>{riskCfg.label}</div>
              <div style={{ fontSize: "11px", color: "#a1a1aa", marginTop: "2px" }}>{result.riskRationale}</div>
            </div>
          </div>

          {/* Stats Row */}
          <div style={styles.statsRow}>
            {[
              { label: "Files", value: result.affectedFiles.length, color: "#f4f4f5" },
              { label: "Tests", value: result.affectedTestFiles.length, color: "#34d399" },
              { label: "API Surfaces", value: result.affectedApiEndpoints.length, color: "#f87171" },
              { label: "Time", value: `${result.computedInMs.toFixed(1)}ms`, color: "#38bdf8" },
            ].map((s) => (
              <div key={s.label} style={styles.statCard}>
                <span style={{ fontSize: "15px", fontWeight: 800, color: s.color }}>{s.value}</span>
                <span style={{ fontSize: "9px", color: "#52525b", fontWeight: 600 }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* API Endpoints (highest priority) */}
          {result.affectedApiEndpoints.length > 0 && (
            <div style={styles.group}>
              <div style={styles.groupHeader}>
                <AlertTriangle size={11} color="#f87171" />
                <span style={{ color: "#f87171" }}>API SURFACES ({result.affectedApiEndpoints.length})</span>
              </div>
              {result.affectedApiEndpoints.map((f, i) => (
                <AffectedFileRow key={i} file={f} label="API" onOpenFile={onOpenFile} />
              ))}
            </div>
          )}

          {/* Test files */}
          {result.affectedTestFiles.length > 0 && (
            <div style={styles.group}>
              <div style={styles.groupHeader}>
                <Shield size={11} color="#34d399" />
                <span style={{ color: "#34d399" }}>TEST COVERAGE ({result.affectedTestFiles.length})</span>
              </div>
              {result.affectedTestFiles.map((f, i) => (
                <AffectedFileRow key={i} file={f} label="TEST" onOpenFile={onOpenFile} />
              ))}
            </div>
          )}

          {/* All affected files */}
          {result.affectedFiles.length > 0 && (
            <div style={styles.group}>
              <div style={styles.groupHeader}>
                <FileCode size={11} color="#71717a" />
                <span style={{ color: "#71717a" }}>ALL AFFECTED FILES ({result.affectedFiles.length})</span>
              </div>
              {result.affectedFiles.map((f, i) => (
                <AffectedFileRow key={i} file={f} onOpenFile={onOpenFile} />
              ))}
            </div>
          )}
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
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "10px 14px",
    backgroundColor: "#111113",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    flexShrink: 0,
  },
  title: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "#d4d4d8",
  },
  subtitle: {
    fontSize: "10px",
    color: "#52525b",
    marginLeft: "auto",
  },
  section: {
    padding: "10px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  label: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#71717a",
  },
  fileDisplay: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#0e0e10",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "4px",
    padding: "6px 9px",
    fontSize: "11px",
    fontFamily: "'JetBrains Mono', monospace",
    color: "#38bdf8",
  },
  codeInput: {
    width: "100%",
    backgroundColor: "#0e0e10",
    border: "1px solid rgba(245,158,11,0.2)",
    borderRadius: "4px",
    color: "#f59e0b",
    fontFamily: "'JetBrains Mono', Consolas, monospace",
    padding: "6px 9px",
    fontSize: "12px",
    outline: "none",
    boxSizing: "border-box",
    marginTop: "2px",
  },
  computeBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    backgroundColor: "#f59e0b",
    color: "#09090b",
    border: "none",
    borderRadius: "4px",
    padding: "7px 12px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: "6px",
  },
  errorBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "7px",
    margin: "8px 12px",
    backgroundColor: "rgba(248,113,113,0.07)",
    border: "1px solid rgba(248,113,113,0.2)",
    borderRadius: "5px",
    padding: "8px 10px",
    fontSize: "11px",
    color: "#f87171",
    flexShrink: 0,
  },
  resultArea: {
    flex: 1,
    overflowY: "auto",
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  riskBanner: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    padding: "10px 12px",
    borderRadius: "7px",
    border: "1px solid",
    flexShrink: 0,
  },
  statsRow: {
    display: "flex",
    gap: "6px",
    flexShrink: 0,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#111113",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "6px",
    padding: "7px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
  },
  group: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  groupHeader: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    padding: "2px 0",
  },
  fileRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#111113",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: "4px",
    padding: "6px 8px",
    cursor: "pointer",
    fontSize: "11px",
    transition: "border-color 0.1s",
  },
  fileRowName: {
    flex: 1,
    fontFamily: "'JetBrains Mono', monospace",
    color: "#d4d4d8",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "11px",
  },
  fileLabel: {
    fontSize: "9px",
    fontWeight: 700,
    color: "#38bdf8",
    backgroundColor: "rgba(56,189,248,0.1)",
    padding: "1px 4px",
    borderRadius: "3px",
    flexShrink: 0,
  },
};
