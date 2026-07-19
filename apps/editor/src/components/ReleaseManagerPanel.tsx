// STUB — update checking and diagnostics export are simulated
// (setTimeout + hardcoded values). No real update server exists yet.
// Two of three performance metrics are hardcoded, not measured.
import { useState, useEffect } from "react";

export function ReleaseManagerPanel() {
  const [channel, setChannel] = useState<"stable" | "beta" | "nightly">("stable");
  const [checking, setChecking] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);
  const [diagnosticExported, setDiagnosticExported] = useState(false);

  const [coldStart, setColdStart] = useState<number>(0);

  useEffect(() => {
    setColdStart(Math.round(performance.now()));
  }, []);

  const handleCheckUpdates = () => {
    setChecking(true);
    setUpdateMsg("Coming Soon");
    setTimeout(() => {
      setChecking(false);
    }, 800);
  };

  const handleExportDiagnostics = () => {
    setDiagnosticExported(true);
    setTimeout(() => setDiagnosticExported(false), 3000);
  };

  const metrics = [
    { name: "Cold Start (Live)", target: "< 2000ms", current: `${coldStart}ms`, status: coldStart < 2000 ? "PASS" : "WARN" },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>RELEASE ENGINEERING & UPDATES</span>
        <span style={styles.subtext}>v0.1.0</span>
      </div>

      <div style={styles.content}>
        {/* Release Channel Switcher */}
        <div style={styles.card}>
          <p style={styles.cardHdr}>RELEASE CHANNEL & AUTO UPDATE</p>
          <div style={styles.row}>
            <span>Active Channel</span>
            <select
              style={styles.select}
              value={channel}
              onChange={e => setChannel(e.target.value as any)}
            >
              <option value="stable">Stable (Verified Builds)</option>
              <option value="beta">Beta (Preview Features)</option>
              <option value="nightly">Nightly (Bleeding Edge)</option>
            </select>
          </div>

          <button style={styles.updateBtn} disabled={true} onClick={handleCheckUpdates}>
            {checking ? "Checking..." : "Coming Soon"}
          </button>

          {updateMsg && <p style={styles.msg}>{updateMsg}</p>}
        </div>

        {/* Performance Budget Verification */}
        <div style={styles.card}>
          <p style={styles.cardHdr}>PERFORMANCE BUDGETS (REAL-TIME)</p>
          {metrics.map(m => (
            <div key={m.name} style={styles.metricRow}>
              <div>
                <p style={styles.mName}>{m.name}</p>
                <p style={styles.mSub}>Target: {m.target}</p>
              </div>
              <div style={styles.mRight}>
                <span style={styles.mVal}>{m.current}</span>
                <span style={{ ...styles.passTag, color: m.status === "PASS" ? "#4ade80" : "#facc15" }}>
                  [{m.status}]
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Diagnostics & Observability */}
        <div style={styles.card}>
          <p style={styles.cardHdr}>DIAGNOSTICS & TELEMETRY</p>
          <p style={styles.desc}>Export anonymous performance metrics and system logs for troubleshooting.</p>
          <button style={styles.diagBtn} onClick={handleExportDiagnostics}>
            {diagnosticExported ? "Bundle Exported! (atlas-diag.json)" : "Export Diagnostic Bundle"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#0d0d10",
    color: "#fafafa",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    backgroundColor: "#09090b",
    borderBottom: "1px solid #27272a",
  },
  title: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.8px",
  },
  subtext: {
    fontSize: "11px",
    color: "#38bdf8",
    fontWeight: 700,
  },
  content: {
    flex: 1,
    padding: "12px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  card: {
    backgroundColor: "#141417",
    border: "1px solid #27272a",
    borderRadius: "8px",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  cardHdr: {
    fontSize: "10px",
    fontWeight: 700,
    color: "#71717a",
    margin: "0 0 4px",
    letterSpacing: "0.8px",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "12px",
  },
  select: {
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    color: "#fafafa",
    borderRadius: "4px",
    padding: "4px 8px",
    fontSize: "11px",
  },
  updateBtn: {
    backgroundColor: "#fafafa",
    color: "#09090b",
    border: "none",
    borderRadius: "6px",
    padding: "8px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  msg: {
    fontSize: "11px",
    color: "#4ade80",
    margin: "4px 0 0",
  },
  metricRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #27272a",
    paddingBottom: "4px",
  },
  mName: {
    fontSize: "12px",
    fontWeight: 600,
    margin: "0 0 2px",
  },
  mSub: {
    fontSize: "10px",
    color: "#71717a",
    margin: 0,
  },
  mRight: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  mVal: {
    fontSize: "11px",
    color: "#e4e4e7",
    fontFamily: "monospace",
  },
  passTag: {
    fontSize: "10px",
    fontWeight: 700,
  },
  desc: {
    fontSize: "11px",
    color: "#71717a",
    margin: "0 0 4px",
  },
  diagBtn: {
    backgroundColor: "#27272a",
    color: "#fafafa",
    border: "none",
    borderRadius: "6px",
    padding: "8px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
  },
};
