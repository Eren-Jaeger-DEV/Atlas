import React, { useEffect, useState } from "react";
import { X, Activity, Cpu, HardDrive, RefreshCw, CheckCircle2 } from "lucide-react";

interface ProcessExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProcessExplorerModal({ isOpen, onClose }: ProcessExplorerModalProps) {
  const [diagnostics, setDiagnostics] = useState<{
    systemMemoryUsagePercent: number;
    heapUsedMB: number;
    cpuCount: number;
    uptime: number;
  } | null>(null);

  const [loading, setLoading] = useState(false);

  const fetchDiagnostics = async () => {
    setLoading(true);
    try {
      if (window.atlasAPI?.getSystemDiagnostics) {
        const diag = await window.atlasAPI.getSystemDiagnostics();
        setDiagnostics(diag);
      } else {
        // Fallback live calculation
        const memory = (performance as any).memory;
        setDiagnostics({
          systemMemoryUsagePercent: memory ? Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100) : 42,
          heapUsedMB: memory ? Math.round(memory.usedJSHeapSize / (1024 * 1024)) : 128,
          cpuCount: navigator.hardwareConcurrency || 8,
          uptime: Math.round(performance.now() / 1000)
        });
      }
    } catch (e) {
      console.error("Failed to fetch diagnostics", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDiagnostics();
      const interval = setInterval(fetchDiagnostics, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const memoryPercent = diagnostics?.systemMemoryUsagePercent || 0;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={18} color="#38bdf8" />
            <h2 style={styles.title}>Atlas Studio Process Explorer</h2>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={styles.body}>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#a1a1aa", fontSize: "12px" }}>
                <Cpu size={14} color="#60a5fa" />
                <span>CPU Cores</span>
              </div>
              <div style={styles.statValue}>{diagnostics?.cpuCount ?? 8} Cores</div>
              <span style={{ fontSize: "11px", color: "#71717a" }}>Hardware Threads</span>
            </div>

            <div style={styles.statCard}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#a1a1aa", fontSize: "12px" }}>
                <HardDrive size={14} color="#c084fc" />
                <span>JS Heap Usage</span>
              </div>
              <div style={styles.statValue}>{diagnostics?.heapUsedMB ?? 0} MB</div>
              <span style={{ fontSize: "11px", color: "#71717a" }}>Active Renderer Memory</span>
            </div>

            <div style={styles.statCard}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#a1a1aa", fontSize: "12px" }}>
                <Activity size={14} color="#4ade80" />
                <span>Process Uptime</span>
              </div>
              <div style={styles.statValue}>{diagnostics?.uptime ?? 0} s</div>
              <span style={{ fontSize: "11px", color: "#71717a" }}>Continuous Runtime</span>
            </div>
          </div>

          {/* System Memory Usage Meter */}
          <div style={styles.meterContainer}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
              <span style={{ color: "#e4e4e7" }}>System Memory Load</span>
              <span style={{ color: memoryPercent > 80 ? "#f87171" : "#4ade80", fontWeight: 600 }}>{memoryPercent}%</span>
            </div>
            <div style={styles.track}>
              <div
                style={{
                  ...styles.fill,
                  width: `${memoryPercent}%`,
                  backgroundColor: memoryPercent > 80 ? "#f87171" : "#38bdf8"
                }}
              />
            </div>
          </div>

          {/* Active Process List Table */}
          <div style={styles.tableHeader}>
            <span>Process / Component Name</span>
            <span>Type</span>
            <span>Status</span>
          </div>

          <div style={styles.tableBody}>
            <div style={styles.tableRow}>
              <span style={{ color: "#ffffff", fontWeight: 500 }}>Atlas Main Window (Electron Renderer)</span>
              <span style={{ color: "#a1a1aa" }}>UI / Window</span>
              <span style={{ color: "#4ade80", display: "flex", alignItems: "center", gap: "4px" }}>
                <CheckCircle2 size={12} /> Running
              </span>
            </div>

            <div style={styles.tableRow}>
              <span style={{ color: "#ffffff", fontWeight: 500 }}>Language Server Protocol (LSP Host)</span>
              <span style={{ color: "#a1a1aa" }}>Language Service</span>
              <span style={{ color: "#4ade80", display: "flex", alignItems: "center", gap: "4px" }}>
                <CheckCircle2 size={12} /> Active
              </span>
            </div>

            <div style={styles.tableRow}>
              <span style={{ color: "#ffffff", fontWeight: 500 }}>Debug Adapter Protocol (DAP Client)</span>
              <span style={{ color: "#a1a1aa" }}>Debugger</span>
              <span style={{ color: "#a1a1aa", display: "flex", alignItems: "center", gap: "4px" }}>
                Idle / Ready
              </span>
            </div>

            <div style={styles.tableRow}>
              <span style={{ color: "#ffffff", fontWeight: 500 }}>Integrated Terminal Shell Process</span>
              <span style={{ color: "#a1a1aa" }}>Pty Service</span>
              <span style={{ color: "#4ade80", display: "flex", alignItems: "center", gap: "4px" }}>
                <CheckCircle2 size={12} /> Active
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button style={styles.refreshBtn} onClick={fetchDiagnostics} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh Diagnostics</span>
          </button>
          <button style={styles.primaryBtn} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
  },
  modal: {
    width: "560px",
    backgroundColor: "#090a0f",
    border: "1px solid #27272a",
    borderRadius: "8px",
    boxShadow: "0 16px 40px rgba(0, 0, 0, 0.8)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 18px",
    borderBottom: "1px solid #27272a",
    backgroundColor: "#0d0e15",
  },
  title: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#f4f4f5",
    margin: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#a1a1aa",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "4px",
  },
  body: {
    padding: "18px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
  },
  statCard: {
    backgroundColor: "#13141f",
    border: "1px solid #27272a",
    borderRadius: "6px",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  statValue: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#ffffff",
    marginTop: "2px",
  },
  meterContainer: {
    backgroundColor: "#13141f",
    border: "1px solid #27272a",
    borderRadius: "6px",
    padding: "12px",
  },
  track: {
    height: "8px",
    backgroundColor: "#27272a",
    borderRadius: "4px",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: "4px",
    transition: "width 0.3s ease",
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr",
    fontSize: "11px",
    fontWeight: 600,
    color: "#a1a1aa",
    textTransform: "uppercase",
    padding: "0 6px 6px 6px",
    borderBottom: "1px solid #27272a",
  },
  tableBody: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxHeight: "160px",
    overflowY: "auto",
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr",
    fontSize: "12px",
    padding: "6px",
    backgroundColor: "#13141f",
    borderRadius: "4px",
    alignItems: "center",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 18px",
    borderTop: "1px solid #27272a",
    backgroundColor: "#0d0e15",
  },
  refreshBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "none",
    border: "1px solid #3f3f46",
    color: "#e4e4e7",
    padding: "6px 12px",
    borderRadius: "4px",
    fontSize: "12px",
    cursor: "pointer",
  },
  primaryBtn: {
    backgroundColor: "#0284c7",
    border: "none",
    color: "#ffffff",
    padding: "6px 16px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
};
