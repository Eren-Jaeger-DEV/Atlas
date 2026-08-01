import React, { useState } from "react";
import { RotateCcw } from "lucide-react";

export interface SettingItem {
  id: string;
  name: string;
  category: "editor" | "ai" | "appearance" | "terminal" | "keybindings" | "plugins";
  type: "boolean" | "string" | "number";
  value: any;
  defaultValue: any;
  description: string;
}

interface SettingsConfigViewerProps {
  onClose?: () => void;
}

const DEFAULT_SETTINGS: SettingItem[] = [
  {
    id: "editor.fontSize",
    name: "Font Size",
    category: "editor",
    type: "number",
    value: 14,
    defaultValue: 14,
    description: "Controls the font size in pixels for the code editor.",
  },
  {
    id: "editor.minimap",
    name: "Enable Minimap",
    category: "editor",
    type: "boolean",
    value: true,
    defaultValue: true,
    description: "Controls whether the code minimap is shown on the right side.",
  },
  {
    id: "ai.inlineSuggestions",
    name: "Inline Ghost Text AI Suggestions",
    category: "ai",
    type: "boolean",
    value: true,
    defaultValue: true,
    description: "Automatically show inline AI autocomplete ghost text as you type.",
  },
  {
    id: "ai.defaultModel",
    name: "Default AI Model",
    category: "ai",
    type: "string",
    value: "gemini-1.5-flash",
    defaultValue: "gemini-1.5-flash",
    description: "Default LLM model provider for AI Chat and Inline Ctrl+K prompt bar.",
  },
  {
    id: "appearance.glassmorphism",
    name: "Glassmorphic Panels & Blur",
    category: "appearance",
    type: "boolean",
    value: true,
    defaultValue: true,
    description: "Enable high-saturation backdrop filters on floating pickers and dialogs.",
  },
  {
    id: "keybindings.commandPalette",
    name: "Command Palette Keybinding",
    category: "keybindings",
    type: "string",
    value: "Ctrl+Shift+P",
    defaultValue: "Ctrl+Shift+P",
    description: "Global shortcut to trigger the Command Palette.",
  },
  {
    id: "plugins.autoSuggest",
    name: "Auto-Suggest Forge Plugins",
    category: "plugins",
    type: "boolean",
    value: true,
    defaultValue: true,
    description: "Show install recommendation toasts when opening unsupported file extensions.",
  },
];

export function SettingsConfigViewer({ onClose }: SettingsConfigViewerProps) {
  const [filter, setFilter] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [settings, setSettings] = useState<SettingItem[]>(DEFAULT_SETTINGS);

  const handleToggleBool = (id: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, value: !s.value } : s))
    );
  };

  const handleResetSetting = (id: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, value: s.defaultValue } : s))
    );
  };

  const handleResetCategory = () => {
    setSettings((prev) =>
      prev.map((s) =>
        activeCategory === "all" || s.category === activeCategory
          ? { ...s, value: s.defaultValue }
          : s
      )
    );
  };

  const filtered = settings.filter((s) => {
    const matchesCategory = activeCategory === "all" || s.category === activeCategory;
    const matchesFilter =
      s.name.toLowerCase().includes(filter.toLowerCase()) ||
      s.id.toLowerCase().includes(filter.toLowerCase()) ||
      s.description.toLowerCase().includes(filter.toLowerCase());
    return matchesCategory && matchesFilter;
  });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleGroup}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #38bdf8)" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span style={styles.title}>ATLAS STUDIO SETTINGS</span>
        </div>
        <input
          style={styles.filterInput}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search settings..."
        />
        <button style={styles.resetCatBtn} onClick={handleResetCategory} title="Reset Category Defaults">
          <RotateCcw size={11} color="#a1a1aa" />
          <span>Reset Defaults</span>
        </button>
        {onClose && (
          <button style={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      <div style={styles.content}>
        {/* Category Sidebar */}
        <div style={styles.categoryNav}>
          {["all", "editor", "ai", "appearance", "terminal", "keybindings", "plugins"].map((cat) => (
            <button
              key={cat}
              style={{
                ...styles.navBtn,
                backgroundColor: activeCategory === cat ? "var(--bg-panel, #18181b)" : "transparent",
                color: activeCategory === cat ? "var(--accent, #38bdf8)" : "var(--text-muted, #a1a1aa)",
              }}
              onClick={() => setActiveCategory(cat)}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Settings List */}
        <div style={styles.settingList}>
          {filtered.map((setting) => (
            <div key={setting.id} style={styles.settingCard}>
              <div style={styles.settingMeta}>
                <span style={styles.settingName}>{setting.name}</span>
                <span style={styles.settingId}>{setting.id}</span>
              </div>
              <div style={styles.settingDesc}>{setting.description}</div>
              <div style={styles.controlRow}>
                {setting.value !== setting.defaultValue && (
                  <button
                    style={styles.resetSettingBtn}
                    onClick={() => handleResetSetting(setting.id)}
                    title="Reset to default"
                  >
                    Reset
                  </button>
                )}

                {setting.type === "boolean" ? (
                  <button
                    style={{
                      ...styles.toggleBtn,
                      backgroundColor: setting.value ? "var(--accent, #38bdf8)" : "var(--bg-base, #09090b)",
                      color: setting.value ? "#09090b" : "var(--text-muted, #a1a1aa)",
                    }}
                    onClick={() => handleToggleBool(setting.id)}
                  >
                    {setting.value ? "ENABLED" : "DISABLED"}
                  </button>
                ) : (
                  <input style={styles.valueInput} value={setting.value} readOnly />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: "var(--bg-base, #09090b)",
    border: "1px solid var(--border-strong, #27272a)",
    borderRadius: "var(--radius-md, 8px)",
    overflow: "hidden",
    fontFamily: "var(--font-sans, system-ui)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 14px",
    backgroundColor: "var(--bg-panel, #18181b)",
    borderBottom: "1px solid var(--border-subtle, #27272a)",
  },
  titleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  title: {
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--accent, #38bdf8)",
    letterSpacing: "0.8px",
  },
  filterInput: {
    flex: 1,
    backgroundColor: "var(--bg-base, #09090b)",
    border: "1px solid var(--border-subtle, #27272a)",
    borderRadius: "4px",
    padding: "4px 8px",
    color: "var(--text-main, #fafafa)",
    fontSize: "12px",
    outline: "none",
  },
  resetCatBtn: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    backgroundColor: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "4px",
    color: "#a1a1aa",
    padding: "3px 8px",
    fontSize: "10px",
    fontWeight: 600,
    cursor: "pointer",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted, #a1a1aa)",
    fontSize: "14px",
    cursor: "pointer",
  },
  content: {
    display: "flex",
    minHeight: "360px",
  },
  categoryNav: {
    width: "130px",
    borderRight: "1px solid var(--border-subtle, #27272a)",
    padding: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  navBtn: {
    border: "none",
    borderRadius: "4px",
    padding: "6px 8px",
    textAlign: "left",
    fontSize: "10px",
    fontWeight: 700,
    cursor: "pointer",
  },
  settingList: {
    flex: 1,
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    overflow: "auto",
  },
  settingCard: {
    backgroundColor: "var(--bg-panel, #18181b)",
    border: "1px solid var(--border-subtle, #27272a)",
    borderRadius: "6px",
    padding: "10px",
  },
  settingMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  },
  settingName: {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-main, #fafafa)",
  },
  settingId: {
    fontSize: "9px",
    color: "var(--text-muted, #a1a1aa)",
    fontFamily: "monospace",
  },
  settingDesc: {
    fontSize: "11px",
    color: "var(--text-muted, #a1a1aa)",
    marginBottom: "8px",
  },
  controlRow: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "8px",
  },
  resetSettingBtn: {
    backgroundColor: "transparent",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "3px",
    color: "#a1a1aa",
    padding: "2px 6px",
    fontSize: "9px",
    cursor: "pointer",
  },
  toggleBtn: {
    border: "none",
    borderRadius: "4px",
    padding: "4px 10px",
    fontSize: "10px",
    fontWeight: 700,
    cursor: "pointer",
  },
  valueInput: {
    backgroundColor: "var(--bg-base, #09090b)",
    border: "1px solid var(--border-subtle, #27272a)",
    borderRadius: "4px",
    padding: "2px 6px",
    color: "var(--text-main, #fafafa)",
    fontSize: "11px",
  },
};
