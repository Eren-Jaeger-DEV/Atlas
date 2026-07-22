import React from "react";
import { ThemeManager } from "./ThemeManager.js";

interface ThemeSelectorPanelProps {
  onClose: () => void;
}

export function ThemeSelectorPanel({ onClose }: ThemeSelectorPanelProps) {
  const themeManager = ThemeManager.getInstance();

  const handleImport = async () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";
    fileInput.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      themeManager.importVsCodeTheme(text);
      // Force React re-render by dispatching event if necessary, or just close
      onClose();
    };
    fileInput.click();
  };

  const handleSelectDark = () => {
    themeManager.setDarkMode();
    onClose();
  };

  const handleSelectLight = () => {
    themeManager.setLightMode();
    onClose();
  };

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Select Theme</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        
        <div style={styles.body}>
          <button style={styles.themeBtn} onClick={handleSelectDark}>
            <div style={{...styles.colorPreview, backgroundColor: "var(--bg-base, #0d0d10)", border: "1px solid #27272a"}} />
            Atlas Dark (Default)
          </button>
          <button style={styles.themeBtn} onClick={handleSelectLight}>
            <div style={{...styles.colorPreview, backgroundColor: "#ffffff", border: "1px solid #d1d5db"}} />
            Atlas Light
          </button>
          
          <div style={styles.separator} />
          
          <button style={styles.importBtn} onClick={handleImport}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Import VS Code Theme (.json)
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
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
  },
  modal: {
    backgroundColor: "var(--bg-panel, #141417)",
    border: "1px solid var(--border-color, #27272a)",
    borderRadius: "8px",
    width: "360px",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px",
    borderBottom: "1px solid var(--border-color, #27272a)",
  },
  title: {
    margin: 0,
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--text-main, #fafafa)",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted, #a1a1aa)",
    cursor: "pointer",
  },
  body: {
    display: "flex",
    flexDirection: "column",
    padding: "12px",
    gap: "8px",
  },
  themeBtn: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    backgroundColor: "var(--bg-base, #0d0d10)",
    border: "1px solid var(--border-color, #27272a)",
    color: "var(--text-main, #fafafa)",
    padding: "12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 500,
    textAlign: "left",
  },
  colorPreview: {
    width: "20px",
    height: "20px",
    borderRadius: "4px",
  },
  separator: {
    height: "1px",
    backgroundColor: "var(--border-color, #27272a)",
    margin: "8px 0",
  },
  importBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    backgroundColor: "transparent",
    border: "1px dashed var(--accent, #38bdf8)",
    color: "var(--accent, #38bdf8)",
    padding: "12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
  }
};
