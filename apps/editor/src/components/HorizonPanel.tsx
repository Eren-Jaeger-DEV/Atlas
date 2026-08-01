import React, { useState, useEffect, useCallback } from "react";
import { Compass, Cpu, CheckCircle2, AlertCircle, Play, ArrowRight, ShieldCheck, RefreshCw, Zap, Layers, FileCode } from "lucide-react";
import { HorizonSpec, HorizonWave, HorizonTask, HorizonStage, horizonEngine } from "@atlas/agents";
import { useDialog } from "./DialogProvider.js";

interface HorizonPanelProps {
  workspaceRoot?: string;
  onClose?: () => void;
}

export function HorizonPanel({ workspaceRoot, onClose }: HorizonPanelProps) {
  const { showDialog } = useDialog();
  const [activeSpec, setActiveSpec] = useState<HorizonSpec | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [descInput, setDescInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const root = workspaceRoot || "/home/victor/My projects/Atlas";

  const refreshSpec = useCallback(() => {
    const spec = horizonEngine.getActiveSpec(root);
    setActiveSpec(spec);
  }, [root]);

  useEffect(() => {
    refreshSpec();
  }, [refreshSpec]);

  const handleCreateSpec = async () => {
    if (!titleInput.trim()) return;
    setIsProcessing(true);
    try {
      const spec = await horizonEngine.createSpec(root, titleInput.trim(), descInput.trim() || titleInput.trim());
      setActiveSpec(spec);
      setTitleInput("");
      setDescInput("");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteWave = async (waveNumber: number) => {
    if (!activeSpec) return;
    setIsProcessing(true);
    try {
      const updated = await horizonEngine.executeWave(activeSpec, waveNumber, () => {
        refreshSpec();
      });
      setActiveSpec(updated);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunAudit = async () => {
    if (!activeSpec) return;
    setIsProcessing(true);
    try {
      const updated = await horizonEngine.runAudit(activeSpec);
      setActiveSpec(updated);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdvanceStage = async () => {
    if (!activeSpec) return;
    const updated = await horizonEngine.advanceStage(activeSpec);
    setActiveSpec(updated);
  };

  const stages: { key: HorizonStage; label: string; icon: any }[] = [
    { key: "discover", label: "1. Discover", icon: Compass },
    { key: "architect", label: "2. Architect", icon: Layers },
    { key: "execute", label: "3. Swarm-Execute", icon: Cpu },
    { key: "audit", label: "4. Audit", icon: ShieldCheck },
    { key: "completed", label: "Completed", icon: CheckCircle2 },
  ];

  const getStageColor = (stage: HorizonStage) => {
    switch (stage) {
      case "discover": return "#38bdf8";
      case "architect": return "#a855f7";
      case "execute": return "#fbbf24";
      case "audit": return "#f97316";
      case "completed": return "#34d399";
    }
  };

  return (
    <div style={styles.container}>
      {/* Panel Header */}
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Zap size={16} color="#6366f1" />
          <span style={styles.title}>ATLAS HORIZON WORKBENCH</span>
        </div>
        <button style={styles.iconBtn} onClick={refreshSpec} title="Refresh Telemetry">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Stage Pipeline HUD */}
      <div style={styles.pipelineBar}>
        {stages.map((s, idx) => {
          const Icon = s.icon;
          const isActive = activeSpec?.stage === s.key;
          const isPassed = activeSpec
            ? stages.findIndex(st => st.key === activeSpec.stage) > idx
            : false;

          const color = isActive
            ? getStageColor(s.key)
            : isPassed
            ? "#34d399"
            : "#52525b";

          return (
            <React.Fragment key={s.key}>
              <div
                style={{
                  ...styles.stageChip,
                  borderColor: isActive ? color : "transparent",
                  backgroundColor: isActive ? `${color}15` : "rgba(255,255,255,0.03)",
                  color,
                }}
              >
                <Icon size={12} />
                <span>{s.label}</span>
              </div>
              {idx < stages.length - 1 && <ArrowRight size={10} color="#3f3f46" />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div style={styles.body}>
        {!activeSpec ? (
          /* Spec Initialization Form */
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Initialize New Spec-Driven Spec</h3>
            <p style={styles.cardDesc}>
              Decompose complex goals into isolated parallel swarm waves with automated AST verification gates.
            </p>

            <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <input
                style={styles.input}
                placeholder="Spec Title (e.g. Implement OAuth2 Token Refresh Engine)..."
                value={titleInput}
                onChange={e => setTitleInput(e.target.value)}
              />
              <textarea
                style={{ ...styles.input, height: "60px", resize: "none" }}
                placeholder="Detailed architectural scope and target bounds..."
                value={descInput}
                onChange={e => setDescInput(e.target.value)}
              />
              <button
                style={{
                  ...styles.btnPrimary,
                  opacity: isProcessing || !titleInput.trim() ? 0.5 : 1,
                }}
                disabled={isProcessing || !titleInput.trim()}
                onClick={handleCreateSpec}
              >
                <Play size={14} />
                <span>Initialize Horizon Spec</span>
              </button>
            </div>
          </div>
        ) : (
          /* Active Horizon Spec Matrix */
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Active Spec Info Card */}
            <div style={styles.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={styles.specTag}>ID: {activeSpec.id}</span>
                  <h3 style={{ ...styles.cardTitle, marginTop: "4px" }}>{activeSpec.title}</h3>
                </div>
                <div
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    backgroundColor: `${getStageColor(activeSpec.stage)}20`,
                    color: getStageColor(activeSpec.stage),
                    border: `1px solid ${getStageColor(activeSpec.stage)}40`,
                  }}
                >
                  {activeSpec.stage}
                </div>
              </div>

              <p style={{ ...styles.cardDesc, marginTop: "6px" }}>{activeSpec.description}</p>

              {/* Action Controls */}
              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                {activeSpec.stage !== "completed" && (
                  <button style={styles.btnSecondary} onClick={handleAdvanceStage}>
                    <span>Next Stage</span>
                    <ArrowRight size={12} />
                  </button>
                )}
                {activeSpec.stage === "audit" && (
                  <button style={styles.btnPrimary} onClick={handleRunAudit} disabled={isProcessing}>
                    <ShieldCheck size={14} />
                    <span>Run Audit Verification</span>
                  </button>
                )}
              </div>
            </div>

            {/* Wave Matrix List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={styles.sectionHeader}>SWARM WAVE EXECUTION MATRIX</span>
              {activeSpec.waves.map((wave: HorizonWave) => (
                <div key={wave.waveNumber} style={styles.waveCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Layers size={14} color="#a855f7" />
                      <span style={{ fontWeight: 600, fontSize: "13px", color: "#e4e4e7" }}>
                        Wave {wave.waveNumber}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          color: wave.status === "completed" ? "#34d399" : wave.status === "in_progress" ? "#fbbf24" : "#a1a1aa",
                        }}
                      >
                        {wave.status.toUpperCase()}
                      </span>
                      {wave.status !== "completed" && (
                        <button
                          style={styles.btnSmall}
                          disabled={isProcessing}
                          onClick={() => handleExecuteWave(wave.waveNumber)}
                        >
                          <Play size={10} />
                          <span>Run Wave</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tasks inside Wave */}
                  <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    {wave.tasks.map((t: HorizonTask) => (
                      <div key={t.id} style={styles.taskRow}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <FileCode size={12} color="#818cf8" />
                          <span style={{ fontSize: "12px", color: "#d4d4d8", fontWeight: 500 }}>{t.title}</span>
                        </div>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            fontFamily: "monospace",
                            color: t.status === "verified" ? "#34d399" : t.status === "executing" ? "#fbbf24" : "#71717a",
                          }}
                        >
                          {t.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Audit Results Banner */}
            {activeSpec.auditPassed && (
              <div style={styles.auditBanner}>
                <CheckCircle2 size={16} color="#34d399" />
                <span style={{ fontSize: "12px", color: "#34d399", fontWeight: 600 }}>
                  Horizon Spec Audit Passed — All AST bounds & verification tests verified clean!
                </span>
              </div>
            )}
          </div>
        )}
      </div>
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
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    borderLeft: "1px solid rgba(255,255,255,0.08)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    backgroundColor: "#18181b",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  title: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    color: "#e4e4e7",
  },
  iconBtn: {
    background: "none",
    border: "none",
    color: "#a1a1aa",
    cursor: "pointer",
    padding: "4px",
  },
  pipelineBar: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 12px",
    backgroundColor: "#121215",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    overflowX: "auto",
  },
  stageChip: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "3px 7px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 600,
    border: "1px solid transparent",
    whiteSpace: "nowrap",
  },
  body: {
    flex: 1,
    overflowY: "auto",
    padding: "12px",
  },
  card: {
    backgroundColor: "#141417",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "6px",
    padding: "12px",
  },
  cardTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#f4f4f5",
    margin: 0,
  },
  cardDesc: {
    fontSize: "12px",
    color: "#a1a1aa",
    lineHeight: "1.4",
    margin: "4px 0 0 0",
  },
  specTag: {
    fontSize: "10px",
    fontFamily: "monospace",
    color: "#6366f1",
  },
  input: {
    backgroundColor: "#09090b",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "4px",
    color: "#f4f4f5",
    padding: "8px 10px",
    fontSize: "12px",
    outline: "none",
  },
  btnPrimary: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    backgroundColor: "#6366f1",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    padding: "7px 12px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSecondary: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    backgroundColor: "#27272a",
    color: "#e4e4e7",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "4px",
    padding: "5px 10px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSmall: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    backgroundColor: "#a855f7",
    color: "#fff",
    border: "none",
    borderRadius: "3px",
    padding: "3px 6px",
    fontSize: "10px",
    fontWeight: 600,
    cursor: "pointer",
  },
  sectionHeader: {
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    color: "#71717a",
    marginTop: "4px",
  },
  waveCard: {
    backgroundColor: "#18181b",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "6px",
    padding: "10px",
  },
  taskRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#09090b",
    padding: "5px 8px",
    borderRadius: "4px",
  },
  auditBanner: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "rgba(52, 211, 153, 0.1)",
    border: "1px solid rgba(52, 211, 153, 0.3)",
    borderRadius: "6px",
    padding: "10px 12px",
  },
};
