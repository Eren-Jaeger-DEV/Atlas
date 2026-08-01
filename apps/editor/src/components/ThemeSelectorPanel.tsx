import React from "react";
import { ThemeManager } from "./ThemeManager.js";

interface ThemeSelectorPanelProps {
  onClose: () => void;
  onSelectTheme: (theme: string) => void;
}

export function ThemeSelectorPanel({ onClose, onSelectTheme }: ThemeSelectorPanelProps) {
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
      localStorage.setItem("atlas_theme", "custom");
      onSelectTheme("custom");
      onClose();
    };
    fileInput.click();
  };

  const handleSelectDark = () => {
    themeManager.setDarkMode();
    localStorage.setItem("atlas_theme", "dark");
    onSelectTheme("dark");
    onClose();
  };

  const handleSelectLight = () => {
    themeManager.setLightMode();
    localStorage.setItem("atlas_theme", "light");
    onSelectTheme("light");
    onClose();
  };

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div className="anim-scale-in" style={styles.modal} onClick={e => e.stopPropagation()}>
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
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modal: {
    backgroundColor: "#111113",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    width: "340px",
    overflow: "hidden",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    backgroundColor: "#18181b",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  title: {
    margin: 0,
    fontSize: "13px",
    fontWeight: 700,
    color: "#f4f4f5",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#a1a1aa",
    cursor: "pointer",
    fontSize: "14px",
  },
  body: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  themeBtn: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "#18181b",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "6px",
    padding: "10px 12px",
    color: "#f4f4f5",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "left",
  },
  colorPreview: {
    width: "16px",
    height: "16px",
    borderRadius: "4px",
  },
  separator: {
    height: "1px",
    backgroundColor: "rgba(255,255,255,0.06)",
    margin: "4px 0",
  },
  importBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    borderRadius: "6px",
    color: "#38bdf8",
    padding: "8px 12px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
  },
};
