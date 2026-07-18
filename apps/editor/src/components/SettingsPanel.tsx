import { useState, useEffect } from "react";

export interface EditorSettings {
  theme: "obsidian" | "midnight" | "monokai" | "light";
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  autoSave: "off" | "afterDelay" | "onFocusChange";
  terminalShell: "cmd" | "powershell" | "bash";
  aiModel: "gemini-2.0-flash" | "gpt-4o" | "claude-3-5-sonnet" | "ollama-local";
}

export const DEFAULT_SETTINGS: EditorSettings = {
  theme: "obsidian",
  fontSize: 14,
  fontFamily: "'JetBrains Mono', Consolas, monospace",
  tabSize: 2,
  autoSave: "off",
  terminalShell: "cmd",
  aiModel: "gemini-2.0-flash",
};

interface SettingsPanelProps {
  settings: EditorSettings;
  onUpdateSettings: (newSettings: EditorSettings) => void;
}

export function SettingsPanel({ settings, onUpdateSettings }: SettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<EditorSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    onUpdateSettings(updated);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>SETTINGS</span>
        <span style={styles.subtext}>Preferences & Configuration</span>
      </div>

      <div style={styles.body}>
        {/* Section: Appearance */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>APPEARANCE</div>

          <div style={styles.settingItem}>
            <label style={styles.label}>Theme</label>
            <select
              style={styles.select}
              value={localSettings.theme}
              onChange={(e) => handleChange("theme", e.target.value as any)}
            >
              <option value="obsidian">Pure Obsidian Black (Default)</option>
              <option value="midnight">Midnight Onyx</option>
              <option value="monokai">Monokai Dark</option>
              <option value="light">Minimalist Light</option>
            </select>
          </div>

          <div style={styles.settingItem}>
            <label style={styles.label}>Editor Font Size</label>
            <select
              style={styles.select}
              value={localSettings.fontSize}
              onChange={(e) => handleChange("fontSize", Number(e.target.value))}
            >
              <option value={12}>12 px</option>
              <option value={13}>13 px</option>
              <option value={14}>14 px (Recommended)</option>
              <option value={16}>16 px</option>
              <option value={18}>18 px</option>
            </select>
          </div>

          <div style={styles.settingItem}>
            <label style={styles.label}>Font Family</label>
            <select
              style={styles.select}
              value={localSettings.fontFamily}
              onChange={(e) => handleChange("fontFamily", e.target.value)}
            >
              <option value="'JetBrains Mono', Consolas, monospace">JetBrains Mono</option>
              <option value="'Fira Code', monospace">Fira Code</option>
              <option value="Consolas, monospace">Consolas</option>
            </select>
          </div>
        </div>

        {/* Section: Editor Behavior */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>EDITOR BEHAVIOR</div>

          <div style={styles.settingItem}>
            <label style={styles.label}>Tab Size</label>
            <select
              style={styles.select}
              value={localSettings.tabSize}
              onChange={(e) => handleChange("tabSize", Number(e.target.value))}
            >
              <option value={2}>2 Spaces</option>
              <option value={4}>4 Spaces</option>
            </select>
          </div>

          <div style={styles.settingItem}>
            <label style={styles.label}>Auto Save</label>
            <select
              style={styles.select}
              value={localSettings.autoSave}
              onChange={(e) => handleChange("autoSave", e.target.value as any)}
            >
              <option value="off">Off (Manual Ctrl+S)</option>
              <option value="afterDelay">On Delay (1000ms)</option>
              <option value="onFocusChange">On Window Focus Change</option>
            </select>
          </div>
        </div>

        {/* Section: Terminal & Execution */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>TERMINAL & AI AGENT</div>

          <div style={styles.settingItem}>
            <label style={styles.label}>Default Terminal Shell</label>
            <select
              style={styles.select}
              value={localSettings.terminalShell}
              onChange={(e) => handleChange("terminalShell", e.target.value as any)}
            >
              <option value="cmd">Windows Command Prompt (cmd.exe)</option>
              <option value="powershell">Windows PowerShell (powershell.exe)</option>
              <option value="bash">Git Bash / Unix Shell</option>
            </select>
          </div>

          <div style={styles.settingItem}>
            <label style={styles.label}>Autonomous AI Model</label>
            <select
              style={styles.select}
              value={localSettings.aiModel}
              onChange={(e) => handleChange("aiModel", e.target.value as any)}
            >
              <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast & Intelligent)</option>
              <option value="gpt-4o">OpenAI GPT-4o</option>
              <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
              <option value="ollama-local">Ollama (100% Offline Local Model)</option>
            </select>
          </div>
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
    fontSize: "12px",
    borderRight: "1px solid #27272a",
    overflowY: "auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    backgroundColor: "#09090b",
    borderBottom: "1px solid #27272a",
  },
  title: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.8px",
    color: "#fafafa",
  },
  subtext: {
    fontSize: "11px",
    color: "#71717a",
  },
  body: {
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  sectionHeader: {
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.8px",
    color: "#71717a",
    marginBottom: "2px",
  },
  settingItem: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "12px",
    color: "#e4e4e7",
    fontWeight: 500,
  },
  select: {
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    color: "#fafafa",
    borderRadius: "6px",
    padding: "8px 10px",
    fontSize: "12px",
    outline: "none",
    fontFamily: "inherit",
    cursor: "pointer",
  },
};
