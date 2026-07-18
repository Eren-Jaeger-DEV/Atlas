/**
 * Atlas Editor — Live Dependency Impact Panel
 *
 * Fires computeImpact() on cursor move (debounced).
 * Works with ZERO AI plugin loaded — this is a key differentiator.
 * Uses the IPC bridge via window.atlasAPI.
 */

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
  low: "#a9dc76",
  medium: "#ffd866",
  high: "#fc9867",
  critical: "#ff6188",
};

const RISK_LABELS: Record<string, string> = {
  low: "● LOW",
  medium: "◆ MEDIUM",
  high: "▲ HIGH",
  critical: "✖ CRITICAL",
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
      if (!api) {
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

  // Recompute on file/symbol change (debounced by parent)
  useEffect(() => {
    compute();
  }, [compute]);

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>⚡ Impact</span>
        {state.status === "loading" && (
          <span style={styles.loadingDot}>●</span>
        )}
      </div>

      {state.status === "idle" && (
        <p style={styles.hint}>Open a file to see dependency impact</p>
      )}

      {state.status === "no-graph" && (
        <p style={styles.hint}>Run atlas init to enable impact analysis</p>
      )}

      {state.status === "loading" && (
        <p style={styles.hint}>Computing...</p>
      )}

      {state.status === "error" && (
        <p style={{ ...styles.hint, color: "#ff6188" }}>{state.message}</p>
      )}

      {state.status === "ready" && (
        <ImpactDisplay result={state.result} />
      )}
    </div>
  );
}

function ImpactDisplay({ result }: { result: ImpactResult }) {
  const riskColor = RISK_COLORS[result.riskLevel] ?? "#cdd6f4";
  const riskLabel = RISK_LABELS[result.riskLevel] ?? result.riskLevel.toUpperCase();

  return (
    <div>
      {/* Risk badge */}
      <div style={{ ...styles.riskBadge, color: riskColor }}>
        {riskLabel}
      </div>

      {/* Metrics */}
      <div style={styles.metrics}>
        <Metric label="Affected files" value={result.affectedFiles.length} />
        <Metric label="Tests affected" value={result.affectedTestFiles.length} />
        <Metric label="API endpoints" value={result.affectedApiEndpoints.length} />
        <Metric
          label="Computed in"
          value={`${result.computedInMs.toFixed(0)}ms`}
          mono
        />
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
                    color: isTest ? "#8be9fd" : isApi ? "#bd93f9" : "#6272a4",
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
        {mono ? (
          <code style={{ fontFamily: "monospace", fontSize: 12 }}>{value}</code>
        ) : (
          value
        )}
      </span>
      <span style={styles.metricLabel}>{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles (inline, no CSS files needed for this panel)
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  panel: {
    padding: "12px",
    height: "100%",
    overflowY: "auto",
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 12,
    color: "#cdd6f4",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitle: {
    fontWeight: 700,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#7f849c",
  },
  loadingDot: {
    color: "#89b4fa",
    animation: "pulse 1s infinite",
  },
  hint: {
    color: "#585b70",
    fontStyle: "italic",
    marginTop: 8,
  },
  riskBadge: {
    fontWeight: 800,
    fontSize: 13,
    letterSpacing: "0.05em",
    marginBottom: 12,
  },
  metrics: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    marginBottom: 12,
  },
  metric: {
    background: "#1e1e2e",
    borderRadius: 6,
    padding: "8px 10px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 2,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 700,
    color: "#cdd6f4",
  },
  metricLabel: {
    fontSize: 10,
    color: "#6272a4",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  rationale: {
    color: "#7f849c",
    marginBottom: 12,
    lineHeight: 1.5,
  },
  fileList: {
    marginTop: 8,
  },
  fileListHeader: {
    fontSize: 10,
    fontWeight: 700,
    color: "#44415a",
    letterSpacing: "0.1em",
    marginBottom: 6,
  },
  fileItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "2px 0",
  },
  fileBadge: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    minWidth: 28,
  },
  filePath: {
    color: "#7f849c",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  moreFiles: {
    color: "#44415a",
    fontStyle: "italic",
    marginTop: 4,
  },
};
