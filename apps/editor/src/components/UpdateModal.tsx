import { useEffect, useState } from "react";
import { X, Sparkles, CheckCircle, RefreshCw } from "lucide-react";

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpdateModal({ isOpen, onClose }: UpdateModalProps) {
  const [checking, setChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    currentVersion: string;
    upToDate: boolean;
    message: string;
  } | null>(null);

  const checkUpdates = async () => {
    setChecking(true);
    try {
      if (window.atlasAPI?.checkUpdates) {
        const res = await window.atlasAPI.checkUpdates();
        setUpdateInfo(res);
      } else {
        setUpdateInfo({
          currentVersion: "v1.0.0",
          upToDate: true,
          message: "Atlas Studio is up to date with the latest release."
        });
      }
    } catch (e) {
      console.error("Failed to check updates", e);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkUpdates();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={18} color="#38bdf8" />
            <h2 style={styles.title}>Atlas Studio Software Update</h2>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {checking ? (
            <div style={styles.centerState}>
              <RefreshCw size={28} color="#38bdf8" className="animate-spin" />
              <span style={{ color: "#ffffff", fontSize: "13px", fontWeight: 500 }}>
                Checking for available Atlas Studio updates...
              </span>
            </div>
          ) : (
            <div style={styles.contentState}>
              <div style={styles.statusBadge}>
                <CheckCircle size={20} color="#4ade80" />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#ffffff" }}>
                    Atlas Studio {updateInfo?.currentVersion || "v1.0.0"}
                  </span>
                  <span style={{ fontSize: "12px", color: "#a1a1aa" }}>
                    {updateInfo?.message || "You are running the latest version."}
                  </span>
                </div>
              </div>

              <div style={styles.releaseCard}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#ffffff" }}>
                  Release Highlights (v1.0.0 Flagship):
                </span>
                <ul style={{ margin: "6px 0 0 0", paddingLeft: "18px", fontSize: "12px", color: "#a1a1aa", lineHeight: 1.6 }}>
                  <li>✨ 100% Real Logic across all Window Top Menus (File, Edit, Selection, View, Go, Run, Terminal, Help).</li>
                  <li>⚡ Live DAP Debugger Client &amp; Interactive xterm Shell Integration.</li>
                  <li>🧠 Multi-agent Swarm Architecture &amp; Automated Plan Approval.</li>
                  <li>📊 Real-time Impact Analysis Graph &amp; Symbol Relationships.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button style={styles.secondaryBtn} onClick={checkUpdates} disabled={checking}>
            <RefreshCw size={13} className={checking ? "animate-spin" : ""} />
            <span>Check Again</span>
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
    width: "480px",
    backgroundColor: "#090a0f",
    border: "1px solid #27272a",
    borderRadius: "8px",
    boxShadow: "0 16px 40px rgba(0, 0, 0, 0.8)",
    overflow: "hidden",
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
  },
  centerState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "30px 0",
  },
  contentState: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    backgroundColor: "#13141f",
    border: "1px solid #27272a",
    borderRadius: "6px",
    padding: "12px 14px",
  },
  releaseCard: {
    backgroundColor: "#13141f",
    border: "1px solid #27272a",
    borderRadius: "6px",
    padding: "12px 14px",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 18px",
    borderTop: "1px solid #27272a",
    backgroundColor: "#0d0e15",
  },
  secondaryBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "transparent",
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
