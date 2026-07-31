import React from "react";

export interface PluginPermissionModalProps {
  reqId: string;
  pluginId: string;
  pluginName?: string;
  permission: string;
  onApprove: (reqId: string) => void;
  onReject: (reqId: string) => void;
}

export function PluginPermissionModal({
  reqId,
  pluginId,
  pluginName,
  permission,
  onApprove,
  onReject,
}: PluginPermissionModalProps) {
  const displayName = pluginName || pluginId;

  const getPermissionDescription = (perm: string): string => {
    switch (perm) {
      case "workspace.read":
        return "Allows the plugin to read files and directory structures in your active workspace.";
      case "workspace.write":
        return "Allows the plugin to modify, create, or delete files in your active workspace.";
      case "workspace.execute":
        return "Allows the plugin to execute terminal shell commands on your local machine.";
      case "network.connect":
        return "Allows the plugin to make outbound HTTP network connections.";
      default:
        return `Allows the plugin access to protected capability: ${perm}`;
    }
  };

  return (
    <div style={styles.backdrop}>
      <div className="anim-scale-in" style={styles.modal}>
        <div style={styles.header}>
          <div>
            <span style={styles.tag}>[SECURITY GATE] PLUGIN PERMISSION</span>
            <h3 style={styles.title}>Permission Requested</h3>
            <p style={styles.subtext}>Plugin: {displayName} ({pluginId})</p>
          </div>
          <button style={styles.closeBtn} onClick={() => onReject(reqId)}>✕</button>
        </div>

        <div style={styles.contentBox}>
          <div style={styles.warningBox}>
            <p style={styles.permTitle}>Requested Capability: <span style={styles.permTag}>{permission}</span></p>
            <p style={styles.permDesc}>{getPermissionDescription(permission)}</p>
          </div>
          <p style={styles.infoText}>
            Only grant permissions to plugins you trust. You can manage granted permissions anytime in Settings &gt; Extensions.
          </p>
        </div>

        <div style={styles.actions}>
          <button style={styles.rejectBtn} onClick={() => onReject(reqId)}>
            Deny Access
          </button>
          <button style={styles.approveBtn} onClick={() => onApprove(reqId)}>
            Allow Access
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
  },
  modal: {
    backgroundColor: "var(--bg-panel, rgba(20, 20, 23, 0.95))",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid #333333",
    borderRadius: "10px",
    width: "520px",
    maxWidth: "90vw",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255,255,255,0.05)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "16px",
    backgroundColor: "var(--bg-header, #18181b)",
    borderBottom: "1px solid #27272a",
  },
  tag: {
    fontSize: "10px",
    fontWeight: 700,
    color: "#f59e0b",
    letterSpacing: "0.8px",
  },
  title: {
    fontSize: "16px",
    fontWeight: 800,
    margin: "4px 0 2px",
    color: "var(--text-main, #fafafa)",
  },
  subtext: {
    fontSize: "12px",
    color: "var(--text-muted, #a1a1aa)",
    margin: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted, #a1a1aa)",
    fontSize: "14px",
    cursor: "pointer",
  },
  contentBox: {
    padding: "16px",
    backgroundColor: "var(--bg-base, #09090b)",
  },
  warningBox: {
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    border: "1px solid rgba(245, 158, 11, 0.3)",
    borderRadius: "6px",
    padding: "12px 14px",
    marginBottom: "12px",
  },
  permTitle: {
    margin: "0 0 4px",
    fontSize: "12px",
    fontWeight: 700,
    color: "#fafafa",
  },
  permTag: {
    fontFamily: "monospace",
    color: "#38bdf8",
    backgroundColor: "#18181b",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  permDesc: {
    margin: 0,
    fontSize: "12px",
    color: "#d4d4d8",
    lineHeight: "1.5",
  },
  infoText: {
    fontSize: "11px",
    color: "#71717a",
    margin: 0,
    lineHeight: "1.4",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    padding: "12px 16px",
    backgroundColor: "var(--bg-panel, #141417)",
    borderTop: "1px solid #27272a",
  },
  rejectBtn: {
    backgroundColor: "var(--border-color, #27272a)",
    color: "var(--text-main, #fafafa)",
    border: "none",
    borderRadius: "6px",
    padding: "8px 16px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  approveBtn: {
    backgroundColor: "#22c55e",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 16px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
};
