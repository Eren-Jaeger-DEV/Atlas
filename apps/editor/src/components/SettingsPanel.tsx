import { useState, useEffect } from "react";

export interface EditorSettings {
  theme: "obsidian" | "midnight" | "monokai" | "light";
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: "on" | "off";
  formatOnSave: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  autoSave: "off" | "afterDelay" | "onFocusChange";
  terminalShell: "cmd" | "powershell" | "bash";
  aiProvider: "openai" | "anthropic" | "gemini" | "openai-compatible";
  aiModel: string;
  aiBaseUrl: string;
  gitBlameEnabled: boolean;
  gitDiffGuttersEnabled: boolean;
}

export const DEFAULT_SETTINGS: EditorSettings = {
  theme: "obsidian",
  fontSize: 13,
  fontFamily: "'JetBrains Mono', Consolas, monospace",
  tabSize: 2,
  wordWrap: "on",
  formatOnSave: false,
  minimap: true,
  lineNumbers: true,
  autoSave: "off",
  terminalShell: "cmd",
  aiProvider: "gemini",
  aiModel: "gemini-2.0-flash",
  aiBaseUrl: "",
  gitBlameEnabled: true,
  gitDiffGuttersEnabled: true,
};

interface SettingsPanelProps {
  settings: EditorSettings;
  onUpdateSettings: (newSettings: EditorSettings) => void;
}

export function SettingsPanel({ settings, onUpdateSettings }: SettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<EditorSettings>(settings);
  const [searchQuery, setSearchQuery] = useState("");
  const [secureKeys, setSecureKeys] = useState<Record<string, string>>({
    openRouterApiKey: "",
    openaiApiKey: "",
    anthropicApiKey: "",
    geminiApiKey: ""
  });
  const [testStatus, setTestStatus] = useState<Record<string, "idle" | "testing" | "success" | "error">>({});

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    const loadKeys = async () => {
      const api = (window as any).atlasAPI;
      if (!api) return;
      const r = await api.getSecureKey("openRouterApiKey");
      const o = await api.getSecureKey("openaiApiKey");
      const a = await api.getSecureKey("anthropicApiKey");
      const g = await api.getSecureKey("geminiApiKey");
      setSecureKeys({
        openRouterApiKey: r || "",
        openaiApiKey: o || "",
        anthropicApiKey: a || "",
        geminiApiKey: g || ""
      });
    };
    loadKeys();
  }, []);

  const handleSecureKeyChange = (key: string, value: string) => {
    setSecureKeys(prev => ({ ...prev, [key]: value }));
    const api = (window as any).atlasAPI;
    if (api) api.setSecureKey(key, value);
    setTestStatus(prev => ({ ...prev, [key]: "idle" }));
  };

  const handleTestConnection = async (providerName: string, stateKey: string) => {
    const api = (window as any).atlasAPI;
    if (!api?.testProviderConnection) return;
    
    setTestStatus(prev => ({ ...prev, [stateKey]: "testing" }));
    const key = secureKeys[stateKey];
    if (!key) {
      setTestStatus(prev => ({ ...prev, [stateKey]: "error" }));
      return;
    }
    
    const baseUrl = providerName === "openai-compatible" ? localSettings.aiBaseUrl : undefined;
    const res = await api.testProviderConnection(providerName, key, baseUrl);
    setTestStatus(prev => ({ ...prev, [stateKey]: res.success ? "success" : "error" }));
  };

  const handleChange = <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    onUpdateSettings(updated);
  };

  const matches = (keywords: string[]) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return keywords.some(k => k.toLowerCase().includes(q));
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>SETTINGS</span>
        <span style={styles.subtext}>Preferences</span>
      </div>

      <div style={{ padding: "10px 14px", borderBottom: "1px solid #27272a" }}>
        <input 
          type="text" 
          placeholder="Search settings..." 
          style={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div style={styles.body}>
        {/* Section: Appearance */}
        {(matches(["appearance", "theme", "color"]) || matches(["appearance", "font", "size"]) || matches(["appearance", "font", "family"])) && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>APPEARANCE</div>

          {matches(["appearance", "theme", "color"]) && (
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
          )}

          {matches(["appearance", "font", "size"]) && (
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
          )}

          {matches(["appearance", "font", "family", "jetbrains", "fira", "consolas"]) && (
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
          )}
        </div>
        )}

        {/* Section: Editor Behavior */}
        {(matches(["editor", "behavior", "tab", "size", "spaces"]) || matches(["editor", "behavior", "auto", "save"]) || matches(["editor", "behavior", "format", "save"]) || matches(["editor", "behavior", "git", "blame", "diff", "gutters", "source", "control"])) && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>EDITOR BEHAVIOR</div>

          {matches(["editor", "behavior", "tab", "size", "spaces"]) && (
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
          )}

          {matches(["editor", "behavior", "auto", "save", "delay"]) && (
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
          )}

          {matches(["editor", "behavior", "format", "save"]) && (
          <div style={styles.settingItem}>
            <label style={styles.label}>Format On Save</label>
            <select
              style={styles.select}
              value={localSettings.formatOnSave ? "true" : "false"}
              onChange={(e) => handleChange("formatOnSave", e.target.value === "true")}
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>
          )}

          {matches(["editor", "behavior", "git", "blame"]) && (
          <div style={styles.settingItem}>
            <label style={styles.label}>Inline Git Blame</label>
            <select
              style={styles.select}
              value={localSettings.gitBlameEnabled ? "true" : "false"}
              onChange={(e) => handleChange("gitBlameEnabled", e.target.value === "true")}
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>
          )}

          {matches(["editor", "behavior", "git", "diff", "gutters", "source", "control"]) && (
          <div style={styles.settingItem}>
            <label style={styles.label}>Git Diff Gutters</label>
            <select
              style={styles.select}
              value={localSettings.gitDiffGuttersEnabled ? "true" : "false"}
              onChange={(e) => handleChange("gitDiffGuttersEnabled", e.target.value === "true")}
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>
          )}
        </div>
        )}

        {/* Section: Terminal & Execution */}
        {(matches(["terminal", "shell", "cmd", "bash", "powershell"]) || matches(["ai", "agent", "model", "gemini", "gpt", "claude", "ollama"])) && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>TERMINAL & AI AGENT</div>

          {matches(["terminal", "shell", "cmd", "bash", "powershell"]) && (
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
          )}
        </div>
        )}

        {/* Section: AI Configuration */}
        {(matches(["ai", "model", "provider", "baseurl"])) && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>AI CONFIGURATION</div>
          
          <div style={styles.settingItem}>
            <label style={styles.label}>AI Provider</label>
            <select
              style={styles.select}
              value={localSettings.aiProvider || "openai"}
              onChange={(e) => handleChange("aiProvider", e.target.value as any)}
            >
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="openai-compatible">OpenAI-Compatible (Custom / OpenRouter)</option>
            </select>
          </div>

          <div style={styles.settingItem}>
            <label style={styles.label}>AI Model</label>
            <input 
              type="text" 
              style={styles.textInput}
              value={localSettings.aiModel}
              onChange={(e) => handleChange("aiModel", e.target.value)}
              placeholder="e.g. gemini-2.0-flash or gpt-4o"
            />
          </div>

          {localSettings.aiProvider === "openai-compatible" && (
            <div style={styles.settingItem}>
              <label style={styles.label}>Base URL (Custom Endpoint)</label>
              <input 
                type="text" 
                style={styles.textInput}
                value={localSettings.aiBaseUrl || ""}
                onChange={(e) => handleChange("aiBaseUrl", e.target.value)}
                placeholder="https://api.routing.run/v1"
              />
            </div>
          )}
        </div>
        )}

        {/* Section: AI Providers & Keys */}
        {(matches(["ai", "provider", "key", "api", "routing", "openai", "anthropic", "gemini"])) && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>AI API KEYS</div>

          {matches(["api", "key", "routing", "openrouter"]) && (
          <div style={styles.settingItem}>
            <label style={styles.label}>routing.run API Key</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input 
                type="password"
                style={{...styles.textInput, flex: 1}}
                value={secureKeys.openRouterApiKey}
                onChange={(e) => handleSecureKeyChange("openRouterApiKey", e.target.value)}
                placeholder="rk_..."
              />
              <button 
                style={styles.testBtn} 
                onClick={() => handleTestConnection("openai-compatible", "openRouterApiKey")}
                disabled={testStatus.openRouterApiKey === "testing" || !secureKeys.openRouterApiKey}
              >
                {testStatus.openRouterApiKey === "testing" ? "..." : testStatus.openRouterApiKey === "success" ? "OK" : testStatus.openRouterApiKey === "error" ? "Fail" : "Test"}
              </button>
            </div>
          </div>
          )}

          {matches(["api", "key", "openai"]) && (
          <div style={styles.settingItem}>
            <label style={styles.label}>OpenAI API Key</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input 
                type="password"
                style={{...styles.textInput, flex: 1}}
                value={secureKeys.openaiApiKey}
                onChange={(e) => handleSecureKeyChange("openaiApiKey", e.target.value)}
                placeholder="sk-proj-..."
              />
              <button 
                style={styles.testBtn} 
                onClick={() => handleTestConnection("openai", "openaiApiKey")}
                disabled={testStatus.openaiApiKey === "testing" || !secureKeys.openaiApiKey}
              >
                {testStatus.openaiApiKey === "testing" ? "..." : testStatus.openaiApiKey === "success" ? "OK" : testStatus.openaiApiKey === "error" ? "Fail" : "Test"}
              </button>
            </div>
          </div>
          )}

          {matches(["api", "key", "anthropic"]) && (
          <div style={styles.settingItem}>
            <label style={styles.label}>Anthropic API Key</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input 
                type="password"
                style={{...styles.textInput, flex: 1}}
                value={secureKeys.anthropicApiKey}
                onChange={(e) => handleSecureKeyChange("anthropicApiKey", e.target.value)}
                placeholder="sk-ant-..."
              />
              <button 
                style={styles.testBtn} 
                onClick={() => handleTestConnection("anthropic", "anthropicApiKey")}
                disabled={testStatus.anthropicApiKey === "testing" || !secureKeys.anthropicApiKey}
              >
                {testStatus.anthropicApiKey === "testing" ? "..." : testStatus.anthropicApiKey === "success" ? "OK" : testStatus.anthropicApiKey === "error" ? "Fail" : "Test"}
              </button>
            </div>
          </div>
          )}

          {matches(["api", "key", "gemini"]) && (
          <div style={styles.settingItem}>
            <label style={styles.label}>Gemini API Key</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input 
                type="password"
                style={{...styles.textInput, flex: 1}}
                value={secureKeys.geminiApiKey}
                onChange={(e) => handleSecureKeyChange("geminiApiKey", e.target.value)}
                placeholder="AIzaSy..."
              />
              <button 
                style={styles.testBtn} 
                onClick={() => handleTestConnection("gemini", "geminiApiKey")}
                disabled={testStatus.geminiApiKey === "testing" || !secureKeys.geminiApiKey}
              >
                {testStatus.geminiApiKey === "testing" ? "..." : testStatus.geminiApiKey === "success" ? "OK" : testStatus.geminiApiKey === "error" ? "Fail" : "Test"}
              </button>
            </div>
          </div>
          )}
        </div>
        )}
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
  searchInput: {
    width: "100%",
    backgroundColor: "#18181b",
    border: "1px solid #3f3f46",
    color: "#fafafa",
    borderRadius: "4px",
    padding: "6px 8px",
    fontSize: "12px",
    outline: "none",
    boxSizing: "border-box",
  },
  testBtn: {
    backgroundColor: "#27272a",
    border: "1px solid #3f3f46",
    color: "#fafafa",
    borderRadius: "4px",
    padding: "6px 10px",
    fontSize: "12px",
    cursor: "pointer",
    outline: "none",
    minWidth: "60px"
  }
};
