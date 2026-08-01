import React, { useState, useEffect, useCallback } from "react";
import { Zap, Play, Cpu, HardDrive, AlertTriangle, Lightbulb, Sparkles, ExternalLink } from "lucide-react";
import { flamegraphProfiler, type TorchProfileReport, type FlameFrame, type Hotspot } from "@atlas/core";

interface AtlasTorchPanelProps {
  onOpenFile?: (filePath: string, line?: number) => void;
  onOptimizeHotspotPrompt?: (hotspot: Hotspot) => void;
}

export function AtlasTorchPanel({ onOpenFile, onOptimizeHotspotPrompt }: AtlasTorchPanelProps) {
  const [mode, setMode] = useState<"cpu" | "heap">("cpu");
  const [profile, setProfile] = useState<TorchProfileReport | null>(null);
  const [isSampling, setIsSampling] = useState<boolean>(false);

  const runProfiling = useCallback(() => {
    setIsSampling(true);
    setTimeout(() => {
      const res = flamegraphProfiler.generateProfile(mode);
      setProfile(res);
      setIsSampling(false);
    }, 400);
  }, [mode]);

  useEffect(() => {
    runProfiling();
  }, [runProfiling]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Zap size={16} color="#eab308" />
          <span style={styles.title}>ATLAS TORCH — CPU/HEAP FLAMEGRAPH</span>
        </div>
        <button style={styles.sampleBtn} onClick={runProfiling} disabled={isSampling}>
          <Play size={12} className={isSampling ? "spin" : ""} color="#ffffff" />
          <span>{isSampling ? "Sampling..." : "Sample Profile"}</span>
        </button>
      </div>

      {/* Mode Switcher */}
      <div style={styles.modeBar}>
        <button
          style={{
            ...styles.modeTab,
            backgroundColor: mode === "cpu" ? "rgba(234, 179, 8, 0.15)" : "transparent",
            color: mode === "cpu" ? "#eab308" : "#71717a",
            borderColor: mode === "cpu" ? "rgba(234, 179, 8, 0.3)" : "rgba(255,255,255,0.06)",
          }}
          onClick={() => setMode("cpu")}
        >
          <Cpu size={12} color={mode === "cpu" ? "#eab308" : "#71717a"} />
          <span>CPU TIME</span>
        </button>
        <button
          style={{
            ...styles.modeTab,
            backgroundColor: mode === "heap" ? "rgba(234, 179, 8, 0.15)" : "transparent",
            color: mode === "heap" ? "#eab308" : "#71717a",
            borderColor: mode === "heap" ? "rgba(234, 179, 8, 0.3)" : "rgba(255,255,255,0.06)",
          }}
          onClick={() => setMode("heap")}
        >
          <HardDrive size={12} color={mode === "heap" ? "#eab308" : "#71717a"} />
          <span>HEAP MEMORY</span>
        </button>
      </div>

      {profile && (
        <div style={styles.profileStream}>
          {/* Flamegraph Call Stack Tree */}
          <div style={styles.flameSection}>
            <div style={styles.sectionTitle}>FLAMEGRAPH CALL STACK PIPELINE</div>
            <div style={styles.flameCanvas}>
              <FlameFrameNode frame={profile.rootFrame} onOpenFile={onOpenFile} />
            </div>
          </div>

          {/* Performance Hotspots (>20% CPU Time) */}
          <div style={styles.hotspotsSection}>
            <div style={styles.sectionTitle}>
              <AlertTriangle size={12} color="#ef4444" />
              HOTSPOTS (&gt;20% CPU TIME)
            </div>

            <div style={styles.hotspotList}>
              {profile.hotspots.map((hs, idx) => (
                <div key={idx} style={styles.hotspotCard}>
                  <div style={styles.hsHeader}>
                    <span style={styles.hsName}>{hs.functionName}</span>
                    <span style={styles.hsPct}>{hs.cpuPercentage}% CPU</span>
                  </div>

                  <div style={styles.hsLoc} onClick={() => onOpenFile?.(hs.filePath, hs.line)}>
                    {hs.filePath}:{hs.line} <ExternalLink size={10} color="#71717a" />
                  </div>

                  <div style={styles.hsAdvice}>
                    <Lightbulb size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: "1px" }} />
                    <span>{hs.optimizationAdvice}</span>
                  </div>

                  <button
                    style={styles.optimizeBtn}
                    onClick={() => onOptimizeHotspotPrompt?.(hs)}
                  >
                    <Sparkles size={12} color="#eab308" />
                    <span>Optimize Hotspot with AI</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

function FlameFrameNode({ frame, depth = 0, onOpenFile }: { frame: FlameFrame; depth?: number; onOpenFile?: (path: string, line?: number) => void }) {
  // Color intensity based on percentage
  const bgAlpha = Math.max(0.1, frame.percentage / 100);
  const bgColor = `rgba(234, 179, 8, ${bgAlpha})`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
      <div
        style={{
          backgroundColor: bgColor,
          border: "1px solid rgba(234, 179, 8, 0.3)",
          borderRadius: "4px",
          padding: "6px 8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: frame.file ? "pointer" : "default",
          fontFamily: "'JetBrains Mono', Consolas, monospace",
          fontSize: "10px",
        }}
        onClick={() => frame.file && onOpenFile?.(frame.file, frame.line)}
      >
        <span style={{ fontWeight: 600, color: "#fef08a" }}>
          {frame.name} {frame.file ? `(${frame.file.split("/").pop()}:${frame.line})` : ""}
        </span>
        <span style={{ color: "#ffffff", fontWeight: 700 }}>
          {frame.value}ms ({frame.percentage}%)
        </span>
      </div>

      {frame.children && frame.children.length > 0 && (
        <div style={{ paddingLeft: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {frame.children.map((child) => (
            <FlameFrameNode key={child.id} frame={child} depth={depth + 1} onOpenFile={onOpenFile} />
          ))}
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
    color: "#eab308",
    fontSize: "11px",
  },
  sampleBtn: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    backgroundColor: "#ca8a04",
    border: "none",
    borderRadius: "4px",
    color: "#ffffff",
    padding: "4px 10px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
  },
  modeBar: {
    display: "flex",
    gap: "6px",
    padding: "8px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  modeTab: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "10px",
    fontWeight: 600,
    padding: "3px 8px",
    borderRadius: "4px",
    border: "1px solid",
    cursor: "pointer",
  },
  profileStream: {
    flex: 1,
    overflowY: "auto",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  flameSection: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  sectionTitle: {
    fontSize: "9px",
    fontWeight: 700,
    color: "#71717a",
    letterSpacing: "0.06em",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
  flameCanvas: {
    backgroundColor: "#111113",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "6px",
    padding: "10px",
  },
  hotspotsSection: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  hotspotList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  hotspotCard: {
    backgroundColor: "#111113",
    border: "1px solid rgba(239, 68, 68, 0.25)",
    borderRadius: "6px",
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  hsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hsName: {
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', Consolas, monospace",
    color: "#f87171",
    fontSize: "11px",
  },
  hsPct: {
    fontSize: "10px",
    fontWeight: 700,
    color: "#ef4444",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    padding: "2px 6px",
    borderRadius: "3px",
    border: "1px solid rgba(239, 68, 68, 0.3)",
  },
  hsLoc: {
    color: "#71717a",
    fontSize: "10px",
    fontFamily: "monospace",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  hsAdvice: {
    display: "flex",
    alignItems: "flex-start",
    gap: "6px",
    color: "#fbbf24",
    fontSize: "11px",
    backgroundColor: "rgba(251, 191, 36, 0.06)",
    padding: "6px 8px",
    borderRadius: "4px",
  },
  optimizeBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    backgroundColor: "rgba(234, 179, 8, 0.12)",
    border: "1px solid rgba(234, 179, 8, 0.3)",
    borderRadius: "4px",
    color: "#eab308",
    padding: "5px 8px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: "2px",
  },
};
