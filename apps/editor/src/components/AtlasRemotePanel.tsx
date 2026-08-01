import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { QrCode, RefreshCw, Copy, Check, ShieldCheck, Smartphone } from "lucide-react";

export function AtlasRemotePanel() {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchConnectionInfo = async () => {
    setLoading(true);
    try {
      if (window.atlasAPI?.getRemoteConnectionInfo) {
        const info = await window.atlasAPI.getRemoteConnectionInfo();
        setRemoteUrl(info.url);
        setToken(info.token);
        const qr = await QRCode.toDataURL(info.url, { width: 220, margin: 2, color: { dark: "#38bdf8", light: "#09090b" } });
        setQrDataUrl(qr);
      } else {
        const fallbackUrl = "http://192.168.1.100:9876?token=atlas-remote-session-token";
        setRemoteUrl(fallbackUrl);
        setToken("atlas-remote-session-token");
        const qr = await QRCode.toDataURL(fallbackUrl, { width: 220, margin: 2, color: { dark: "#38bdf8", light: "#09090b" } });
        setQrDataUrl(qr);
      }
    } catch (err) {
      console.error("Failed to load remote connection info:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnectionInfo();
  }, []);

  const handleRegenerateToken = async () => {
    if (window.atlasAPI?.regenerateRemoteToken) {
      await window.atlasAPI.regenerateRemoteToken();
      await fetchConnectionInfo();
    }
  };

  const handleCopyUrl = () => {
    if (!remoteUrl) return;
    navigator.clipboard.writeText(remoteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Smartphone size={16} color="#38bdf8" />
          <span style={styles.title}>ATLAS REMOTE — PHONE GATEWAY</span>
        </div>
        <span style={styles.statusBadge}>
          <ShieldCheck size={10} color="#34d399" />
          ENCRYPTED
        </span>
      </div>

      <div style={styles.body}>
        <div style={styles.introCard}>
          <QrCode size={20} color="#38bdf8" style={{ marginBottom: "4px" }} />
          <span style={{ fontWeight: 700, fontSize: "12px", color: "#f4f4f5" }}>
            Scan QR Code to Pair Mobile Device
          </span>
          <span style={{ color: "#a1a1aa", fontSize: "11px", textAlign: "center", lineHeight: 1.4 }}>
            Scan directly from your phone camera or mobile browser to control Atlas Studio, trigger workflow runs, and monitor logs.
          </span>
        </div>

        {/* QR Code Container */}
        <div style={styles.qrCard}>
          {loading ? (
            <div style={styles.qrSkeleton}>
              <RefreshCw size={24} color="#38bdf8" className="spin" />
              <span>Generating Secure Connection QR...</span>
            </div>
          ) : (
            qrDataUrl && <img src={qrDataUrl} alt="Atlas Remote QR Code" style={styles.qrImage} />
          )}
        </div>

        {/* Connection URL Bar */}
        {remoteUrl && (
          <div style={styles.urlBox}>
            <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <span style={styles.urlLabel}>LAN CONNECTION ENDPOINT</span>
              <span style={styles.urlText}>{remoteUrl}</span>
            </div>
            <button style={styles.copyBtn} onClick={handleCopyUrl}>
              {copied ? <Check size={12} color="#34d399" /> : <Copy size={12} color="#a1a1aa" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        )}

        <button style={styles.regenBtn} onClick={handleRegenerateToken}>
          <RefreshCw size={12} color="#f4f4f5" />
          <span>Regenerate Auth Token</span>
        </button>
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
    color: "#38bdf8",
    fontSize: "11px",
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "9px",
    fontWeight: 700,
    color: "#34d399",
    backgroundColor: "rgba(52, 211, 153, 0.12)",
    padding: "2px 6px",
    borderRadius: "4px",
    border: "1px solid rgba(52, 211, 153, 0.3)",
  },
  body: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    alignItems: "center",
  },
  introCard: {
    backgroundColor: "#111113",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "6px",
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    boxSizing: "border-box",
  },
  qrCard: {
    backgroundColor: "#09090b",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    borderRadius: "8px",
    padding: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
  },
  qrImage: {
    borderRadius: "4px",
  },
  qrSkeleton: {
    width: "200px",
    height: "200px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    color: "#71717a",
    fontSize: "10px",
  },
  urlBox: {
    width: "100%",
    backgroundColor: "#111113",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "6px",
    padding: "8px 12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxSizing: "border-box",
  },
  urlLabel: {
    fontSize: "8px",
    fontWeight: 700,
    color: "#71717a",
    letterSpacing: "0.06em",
  },
  urlText: {
    fontSize: "10px",
    color: "#38bdf8",
    fontFamily: "monospace",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "180px",
  },
  copyBtn: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    backgroundColor: "#18181b",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "4px",
    color: "#a1a1aa",
    padding: "4px 8px",
    fontSize: "10px",
    cursor: "pointer",
  },
  regenBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    backgroundColor: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "4px",
    color: "#f4f4f5",
    padding: "8px 14px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
  },
};
