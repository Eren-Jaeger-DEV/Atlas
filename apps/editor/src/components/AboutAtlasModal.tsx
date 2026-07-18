import logoImg from "../assets/logo.png";

interface AboutAtlasModalProps {
  onClose: () => void;
}

export function AboutAtlasModal({ onClose }: AboutAtlasModalProps) {
  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <img src={logoImg} alt="Atlas" style={styles.logo} />
          <div>
            <h2 style={styles.title}>Atlas Studio</h2>
            <span style={styles.badge}>v1.0.0 General Availability</span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.body}>
          <p style={styles.tagline}>Developer-First Independent IDE Platform</p>

          <div style={styles.grid}>
            <div style={styles.box}>
              <p style={styles.label}>PLATFORM</p>
              <p style={styles.val}>Electron 30.0 / React 18 / Vite 6</p>
            </div>
            <div style={styles.box}>
              <p style={styles.label}>CORE SYSTEM</p>
              <p style={styles.val}>ServiceContainer / EventBus / Monorepo</p>
            </div>
            <div style={styles.box}>
              <p style={styles.label}>INTELLIGENCE</p>
              <p style={styles.val}>Symbol Graph / Health Metrics / AST</p>
            </div>
            <div style={styles.box}>
              <p style={styles.label}>AI RUNTIME</p>
              <p style={styles.val}>ProviderRouter / ContextEngine / Safety Modal</p>
            </div>
          </div>

          <div style={styles.pillars}>
            <p style={styles.pilHdr}>PRODUCT PILLARS</p>
            <ul style={styles.ul}>
              <li><strong>Professional IDE:</strong> High-performance code editing, tabs, and terminal.</li>
              <li><strong>Extensible Platform:</strong> Sandboxed `@atlas/sdk` extension marketplace.</li>
              <li><strong>Project Intelligence:</strong> Deterministic symbol graph & 3-way merge resolver.</li>
              <li><strong>Unprivileged AI:</strong> Safe, optional AI assistance requiring human approval.</li>
              <li><strong>Local-First Experience:</strong> 100% offline capability with optional cloud sync.</li>
            </ul>
          </div>
        </div>

        <div style={styles.footer}>
          <span style={styles.copy}>© 2026 Atlas Studio. All rights reserved.</span>
          <button style={styles.okBtn} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
  },
  modal: {
    backgroundColor: "#141417",
    border: "1px solid #27272a",
    borderRadius: "12px",
    width: "520px",
    maxWidth: "90vw",
    boxShadow: "0 24px 72px rgba(0, 0, 0, 0.9)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "20px",
    backgroundColor: "#18181b",
    borderBottom: "1px solid #27272a",
    position: "relative",
  },
  logo: {
    width: "44px",
    height: "44px",
    objectFit: "contain",
  },
  title: {
    fontSize: "20px",
    fontWeight: 900,
    margin: "0 0 2px",
    color: "#fafafa",
  },
  badge: {
    fontSize: "10px",
    fontWeight: 700,
    color: "#38bdf8",
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    padding: "2px 8px",
    borderRadius: "4px",
    letterSpacing: "0.5px",
  },
  closeBtn: {
    position: "absolute",
    top: "16px",
    right: "16px",
    background: "none",
    border: "none",
    color: "#71717a",
    fontSize: "14px",
    cursor: "pointer",
  },
  body: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  tagline: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#a1a1aa",
    margin: 0,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  box: {
    backgroundColor: "#09090b",
    border: "1px solid #27272a",
    borderRadius: "6px",
    padding: "8px 10px",
  },
  label: {
    fontSize: "9px",
    fontWeight: 700,
    color: "#71717a",
    margin: "0 0 2px",
    letterSpacing: "0.8px",
  },
  val: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#e4e4e7",
    margin: 0,
  },
  pillars: {
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    borderRadius: "8px",
    padding: "12px",
  },
  pilHdr: {
    fontSize: "10px",
    fontWeight: 700,
    color: "#71717a",
    margin: "0 0 8px",
    letterSpacing: "0.8px",
  },
  ul: {
    margin: 0,
    paddingLeft: "16px",
    fontSize: "11px",
    color: "#d4d4d8",
    lineHeight: "1.6",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 20px",
    backgroundColor: "#09090b",
    borderTop: "1px solid #27272a",
  },
  copy: {
    fontSize: "10px",
    color: "#71717a",
  },
  okBtn: {
    backgroundColor: "#fafafa",
    color: "#09090b",
    border: "none",
    borderRadius: "6px",
    padding: "6px 16px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
};
