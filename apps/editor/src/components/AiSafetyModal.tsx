interface AiSafetyModalProps {
  filePath: string;
  proposedCode: string;
  onApprove: () => void;
  onReject: () => void;
}

export function AiSafetyModal({
  filePath,
  proposedCode,
  onApprove,
  onReject,
}: AiSafetyModalProps) {
  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div>
            <span style={styles.tag}>AI SAFETY CONFIRMATION</span>
            <h3 style={styles.title}>Proposed File Modification</h3>
            <p style={styles.subtext}>{filePath}</p>
          </div>
          <button style={styles.closeBtn} onClick={onReject}>✕</button>
        </div>

        <div style={styles.diffBox}>
          <p style={styles.diffHdr}>PROPOSED CONTENT PREVIEW</p>
          <pre style={styles.pre}>{proposedCode}</pre>
        </div>

        <div style={styles.actions}>
          <button style={styles.rejectBtn} onClick={onReject}>
            Reject Changes
          </button>
          <button style={styles.approveBtn} onClick={onApprove}>
            Approve & Apply Edits
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
    backgroundColor: "var(--bg-panel, #141417)",
    border: "1px solid #27272a",
    borderRadius: "10px",
    width: "600px",
    maxWidth: "90vw",
    maxHeight: "80vh",
    boxShadow: "0 24px 72px rgba(0, 0, 0, 0.8)",
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
    color: "#f87171",
    letterSpacing: "0.8px",
  },
  title: {
    fontSize: "16px",
    fontWeight: 800,
    margin: "4px 0 2px",
    color: "var(--text-main, #fafafa)",
  },
  subtext: {
    fontSize: "11px",
    color: "var(--text-muted, #71717a)",
    margin: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted, #a1a1aa)",
    fontSize: "14px",
    cursor: "pointer",
  },
  diffBox: {
    flex: 1,
    padding: "16px",
    backgroundColor: "var(--bg-base, #09090b)",
    overflowY: "auto",
  },
  diffHdr: {
    fontSize: "10px",
    fontWeight: 700,
    color: "var(--text-muted, #71717a)",
    margin: "0 0 8px",
  },
  pre: {
    margin: 0,
    fontFamily: "'JetBrains Mono', Consolas, monospace",
    fontSize: "12px",
    color: "#4ade80",
    whiteSpace: "pre-wrap",
    lineHeight: "1.5",
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
    backgroundColor: "var(--text-main, #fafafa)",
    color: "var(--bg-base, #09090b)",
    border: "none",
    borderRadius: "6px",
    padding: "8px 16px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
};
