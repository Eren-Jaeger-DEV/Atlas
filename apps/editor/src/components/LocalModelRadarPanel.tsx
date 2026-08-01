import React, { useState, useCallback } from "react";
import { localModelRadar, type LocalModelEntry, type LocalRadarScanResult } from "@atlas/agents";
import { Cpu, RefreshCw, CheckCircle, Circle, AlertTriangle, Zap, Server } from "lucide-react";

interface LocalModelRadarPanelProps {
  onModelSelected?: (model: LocalModelEntry) => void;
}

const RUNTIME_COLORS: Record<string, string> = {
  ollama:    "#34d399",
  lm_studio: "#a78bfa",
  vllm:      "#60a5fa",
  llamacpp:  "#fb923c",
  gpt4all:   "#f472b6",
  jan:       "#facc15",
  custom:    "#94a3b8",
};

const RUNTIME_LABELS: Record<string, string> = {
  ollama:    "Ollama",
  lm_studio: "LM Studio",
  vllm:      "vLLM",
  llamacpp:  "Llama.cpp",
  gpt4all:   "GPT4All",
  jan:       "Jan",
  custom:    "Custom",
};

function RuntimeBadge({ kind }: { kind: string }) {
  const color = RUNTIME_COLORS[kind] ?? "#94a3b8";
  return (
    <span
      style={{
        fontSize: "9px",
        fontWeight: 700,
        letterSpacing: "0.05em",
        color,
        backgroundColor: `${color}18`,
        border: `1px solid ${color}30`,
        padding: "2px 5px",
        borderRadius: "3px",
        textTransform: "uppercase",
      }}
    >
      {RUNTIME_LABELS[kind] ?? kind}
    </span>
  );
}

export function LocalModelRadarPanel({ onModelSelected }: LocalModelRadarPanelProps) {
  const [scan, setScan] = useState<LocalRadarScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const handleScan = useCallback(async () => {
    setIsScanning(true);
    try {
      const result = await localModelRadar.scan();
      setScan(result);
    } finally {
      setIsScanning(false);
    }
  }, []);

  const handleSelectModel = (model: LocalModelEntry) => {
    setSelectedModelId(model.modelId);
    onModelSelected?.(model);
  };

  const errorKeys = scan ? Object.keys(scan.errors) : [];
  const hasErrors = errorKeys.length > 0;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <Cpu size={15} color="#a78bfa" />
          <span style={styles.title}>LOCAL MODEL RADAR</span>
        </div>
        <button
          style={{ ...styles.scanBtn, opacity: isScanning ? 0.6 : 1 }}
          onClick={handleScan}
          disabled={isScanning}
          title="Probe all local inference servers"
        >
          <RefreshCw size={12} style={{ animation: isScanning ? "spin 1s linear infinite" : "none" }} />
          <span>{isScanning ? "Scanning..." : "Scan"}</span>
        </button>
      </div>

      {/* Supported runtimes legend */}
      <div style={styles.legendRow}>
        {Object.entries(RUNTIME_LABELS).filter(([k]) => k !== "custom").map(([kind, label]) => (
          <span key={kind} style={{ ...styles.legendChip, color: RUNTIME_COLORS[kind] ?? "#94a3b8" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: RUNTIME_COLORS[kind] ?? "#94a3b8", flexShrink: 0, display: "inline-block" }} />
            {label}
          </span>
        ))}
      </div>

      {/* No scan yet */}
      {!scan && !isScanning && (
        <div style={styles.emptyState}>
          <Server size={30} color="rgba(167,139,250,0.12)" />
          <span style={styles.emptyHint}>Click Scan to probe local inference servers</span>
          <span style={styles.emptySubHint}>Ollama · LM Studio · vLLM · Llama.cpp · GPT4All · Jan</span>
        </div>
      )}

      {/* Scan result */}
      {scan && (
        <div style={styles.scrollArea}>
          {/* Summary bar */}
          <div style={styles.summaryBar}>
            <span style={{ color: "#34d399" }}>
              {scan.models.length} model{scan.models.length !== 1 ? "s" : ""} found
            </span>
            <span style={{ color: "#52525b" }}>·</span>
            <span style={{ color: "#71717a" }}>
              {scan.endpoints.length} endpoint{scan.endpoints.length !== 1 ? "s" : ""} active
            </span>
            {hasErrors && (
              <>
                <span style={{ color: "#52525b" }}>·</span>
                <span style={{ color: "#f87171" }}>
                  <AlertTriangle size={10} /> {errorKeys.length} unreachable
                </span>
              </>
            )}
          </div>

          {/* No models found */}
          {scan.models.length === 0 && (
            <div style={styles.noModels}>
              <AlertTriangle size={18} color="#f59e0b" />
              <span>No local models found. Start Ollama, LM Studio, or another inference server and scan again.</span>
            </div>
          )}

          {/* Model cards */}
          {scan.models.map((model, idx) => {
            const isSelected = selectedModelId === model.modelId;
            return (
              <div
                key={`${model.runtime}-${model.modelId}-${idx}`}
                style={{
                  ...styles.modelCard,
                  borderColor: isSelected ? RUNTIME_COLORS[model.runtime] ?? "#a78bfa" : "rgba(255,255,255,0.06)",
                  backgroundColor: isSelected ? `${RUNTIME_COLORS[model.runtime] ?? "#a78bfa"}0d` : "#111113",
                }}
                onClick={() => handleSelectModel(model)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {isSelected
                    ? <CheckCircle size={13} color={RUNTIME_COLORS[model.runtime] ?? "#a78bfa"} />
                    : <Circle size={13} color="#3f3f46" />
                  }
                  <span style={styles.modelName}>{model.name}</span>
                  <RuntimeBadge kind={model.runtime} />
                </div>

                <div style={styles.modelMeta}>
                  <span style={{ fontFamily: "monospace", color: "#52525b", fontSize: "10px" }}>
                    {model.endpointUrl}
                  </span>
                  {model.sizeGb !== undefined && (
                    <span style={styles.metaChip}>{model.sizeGb} GB</span>
                  )}
                  {model.contextLength !== undefined && (
                    <span style={styles.metaChip}>{(model.contextLength / 1000).toFixed(0)}k ctx</span>
                  )}
                </div>

                {isSelected && (
                  <div style={styles.selectedNote}>
                    <Zap size={10} color="#a78bfa" />
                    <span>Active in Atlas AI runtime — using OpenAI-compat endpoint</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Error accordion (collapsed by default) */}
          {hasErrors && (
            <details style={styles.errorDetails}>
              <summary style={styles.errorSummary}>
                <AlertTriangle size={11} color="#f87171" />
                {errorKeys.length} endpoint{errorKeys.length !== 1 ? "s" : ""} unreachable
              </summary>
              <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                {errorKeys.map((k) => (
                  <div key={k} style={styles.errorRow}>
                    <span style={{ fontFamily: "monospace", color: "#71717a" }}>{k}:</span>
                    <span style={{ color: "#f87171" }}>{scan.errors[k]}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Keyframe for spin animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
    justifyContent: "space-between",
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
  scanBtn: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    backgroundColor: "#a78bfa",
    color: "#09090b",
    border: "none",
    borderRadius: "4px",
    padding: "5px 10px",
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer",
  },
  legendRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    padding: "8px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    flexShrink: 0,
  },
  legendChip: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "10px",
    fontWeight: 600,
  },
  emptyState: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "24px",
  },
  emptyHint: {
    fontSize: "12px",
    color: "#52525b",
    textAlign: "center",
  },
  emptySubHint: {
    fontSize: "10px",
    color: "#3f3f46",
    textAlign: "center",
  },
  scrollArea: {
    flex: 1,
    overflowY: "auto",
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  summaryBar: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "11px",
    fontWeight: 600,
    marginBottom: "4px",
    flexShrink: 0,
  },
  noModels: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    padding: "24px 12px",
    color: "#71717a",
    fontSize: "12px",
    textAlign: "center",
  },
  modelCard: {
    backgroundColor: "#111113",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "7px",
    padding: "10px 12px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    transition: "border-color 0.12s, background-color 0.12s",
  },
  modelName: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#e4e4e7",
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  modelMeta: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap",
  },
  metaChip: {
    fontSize: "10px",
    fontWeight: 600,
    backgroundColor: "rgba(255,255,255,0.05)",
    color: "#71717a",
    padding: "2px 5px",
    borderRadius: "3px",
  },
  selectedNote: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "10px",
    color: "#a78bfa",
    fontWeight: 600,
    marginTop: "2px",
  },
  errorDetails: {
    borderRadius: "5px",
    backgroundColor: "#111113",
    border: "1px solid rgba(248,113,113,0.15)",
    padding: "8px 10px",
    fontSize: "11px",
    marginTop: "4px",
  },
  errorSummary: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    cursor: "pointer",
    color: "#f87171",
    fontWeight: 600,
    fontSize: "11px",
  },
  errorRow: {
    display: "flex",
    gap: "8px",
    fontSize: "10px",
    fontFamily: "monospace",
  },
};
