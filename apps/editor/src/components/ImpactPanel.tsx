import { useState, useEffect, useCallback } from "react";
import type { ImpactResult } from "@atlas/core";

interface ImpactPanelProps {
  filePath?: string;
  symbolName?: string;
}

type ImpactState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; result: ImpactResult }
  | { status: "error"; message: string }
  | { status: "no-graph" };

const RISK_COLORS: Record<string, string> = {
  low: "#4ade80",
  medium: "#facc15",
  high: "#fb923c",
  critical: "#f87171",
};

const RISK_LABELS: Record<string, string> = {
  low: "[LOW RISK]",
  medium: "[MEDIUM RISK]",
  high: "[HIGH RISK]",
  critical: "[CRITICAL RISK]",
};

export function ImpactPanel({ filePath, symbolName }: ImpactPanelProps) {
  const [state, setState] = useState<ImpactState>({ status: "idle" });

  const compute = useCallback(async () => {
    if (!filePath) {
      setState({ status: "idle" });
      return;
    }

    setState({ status: "loading" });

    try {
      const api = (window as any).atlasAPI;
      if (!api || !api.impact) {
        setState({ status: "no-graph" });
        return;
      }

      const result: ImpactResult = await api.impact(filePath, symbolName);

      if ("error" in result) {
        setState({ status: "no-graph" });
        return;
      }

      setState({ status: "ready", result });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [filePath, symbolName]);

  useEffect(() => {
    compute();
  }, [compute]);

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>DEPENDENCY IMPACT</span>
        {state.status === "loading" && <span style={styles.loadingDot}>...</span>}
      </div>

      {state.status === "idle" && (
        <p style={styles.hint}>Open a file to inspect dependency impact</p>
      )}

      {state.status === "no-graph" && (
        <p style={styles.hint}>Run atlas init to enable impact analysis</p>
      )}

      {state.status === "loading" && <p style={styles.hint}>Computing impact graph...</p>}

      {state.status === "error" && (
        <p style={{ ...styles.hint, color: "#f87171" }}>{state.message}</p>
      )}

      {state.status === "ready" && <ImpactDisplay result={state.result} />}
    </div>
  );
}

function ImpactDisplay({ result }: { result: ImpactResult }) {
  const riskColor = RISK_COLORS[result.riskLevel] ?? "#fafafa";
  const riskLabel = RISK_LABELS[result.riskLevel] ?? result.riskLevel.toUpperCase();

  return (
    <div>
      {/* Risk badge */}
      <div style={{ ...styles.riskBadge, color: riskColor }}>{riskLabel}</div>

      {/* Metrics */}
      <div style={styles.metrics}>
        <Metric label="Affected files" value={result.affectedFiles.length} />
        <Metric label="Tests affected" value={result.affectedTestFiles.length} />
        <Metric label="API endpoints" value={result.affectedApiEndpoints.length} />
        <Metric label="Computed in" value={`${result.computedInMs.toFixed(0)}ms`} mono />
      </div>

      {/* Rationale */}
      <p style={styles.rationale}>{result.riskRationale}</p>

      {/* Affected files list */}
      {result.affectedFiles.length > 0 && (
        <div style={styles.fileList}>
          <div style={styles.fileListHeader}>AFFECTED FILES</div>
          {result.affectedFiles.slice(0, 12).map((f) => {
            const isTest = result.affectedTestFiles.some((t) => t.filePath === f.filePath);
            const isApi = result.affectedApiEndpoints.some((a) => a.filePath === f.filePath);
            return (
              <div key={f.filePath} style={styles.fileItem}>
                <span
                  style={{
                    ...styles.fileBadge,
                    color: isTest ? "#38bdf8" : isApi ? "#c084fc" : "#71717a",
                  }}
                >
                  {isTest ? "test" : isApi ? "api" : "src"}
                </span>
                <span style={styles.filePath}>
                  {f.filePath.split(/[/\\]/).slice(-2).join("/")}
                </span>
              </div>
            );
          })}
          {result.affectedFiles.length > 12 && (
            <div style={styles.moreFiles}>
              +{result.affectedFiles.length - 12} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  mono,
}: {
  label: string;
  value: number | string;
  mono?: boolean;
}) {
  return (
    <div style={styles.metric}>
      <span style={styles.metricValue}>
        {mono ? <code style={{ fontFamily: "monospace", fontSize: 13 }}>{value}</code> : value}
      </span>
      <span style={styles.metricLabel}>{label}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    padding: "14px",
    height: "100%",
    overflowY: "auto",
    backgroundColor: "#0d0d10",
    color: "#fafafa",
    fontSize: 12,
    borderRight: "1px solid #27272a",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerTitle: {
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: "0.8px",
    color: "#fafafa",
  },
  loadingDot: {
    color: "#fafafa",
  },
  hint: {
    color: "#71717a",
    fontSize: 12,
    marginTop: 8,
  },
  riskBadge: {
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: "0.5px",
    marginBottom: 14,
  },
  metrics: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    marginBottom: 14,
  },
  metric: {
    background: "#18181b",
    border: "1px solid #27272a",
    borderRadius: 6,
    padding: "10px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 700,
    color: "#fafafa",
  },
  metricLabel: {
    fontSize: 10,
    color: "#71717a",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  rationale: {
    color: "#a1a1aa",
    marginBottom: 14,
    lineHeight: 1.5,
  },
  fileList: {
    marginTop: 10,
  },
  fileListHeader: {
    fontSize: 10,
    fontWeight: 700,
    color: "#71717a",
    letterSpacing: "0.8px",
    marginBottom: 8,
  },
  fileItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 0",
  },
  fileBadge: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    minWidth: 28,
  },
  filePath: {
    color: "#a1a1aa",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  moreFiles: {
    color: "#71717a",
    fontSize: 11,
    marginTop: 6,
  },
};
