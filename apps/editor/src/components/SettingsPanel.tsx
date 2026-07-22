import React, { useState, useEffect } from "react";
import { ThemeManager } from "./ThemeManager.js";

export interface EditorSettings {
  theme: "obsidian" | "midnight" | "monokai" | "light" | "custom";
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
  sidebarPosition?: "left" | "right";
  terminalPosition?: "bottom" | "right";
  customThemeColors?: Record<string, string>;
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
  sidebarPosition: "left",
  terminalPosition: "bottom",
};

interface SettingsPanelProps {
  settings: EditorSettings;
  onUpdateSettings: (newSettings: EditorSettings) => void;
}

const CATEGORIES = [
  "Appearance",
  "Editor",
  "Terminal",
  "AI Configuration",
  "Advanced"
];

// --- Custom Components ---

function ToggleSwitch({ checked, onChange }: { checked: boolean, onChange: (v: boolean) => void }) {
  return (
    <div 
      onClick={() => onChange(!checked)}
      style={{
        width: "36px",
        height: "20px",
        backgroundColor: checked ? "var(--accent, #38bdf8)" : "var(--bg-header, #18181b)",
        borderRadius: "12px",
        position: "relative",
        cursor: "pointer",
        transition: "background-color 0.2s ease",
        border: "1px solid var(--border-color, #27272a)",
        flexShrink: 0
      }}
    >
      <div style={{
        width: "14px",
        height: "14px",
        backgroundColor: "#fff",
        borderRadius: "50%",
        position: "absolute",
        top: "2px",
        left: checked ? "18px" : "2px",
        transition: "left 0.2s ease, transform 0.2s ease",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
      }} />
    </div>
  );
}

function DropdownSelect({ value, options, onChange }: { value: string | number, options: {label: string, value: string | number}[], onChange: (v: any) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        backgroundColor: "var(--bg-header, #18181b)",
        border: "1px solid var(--border-color, #27272a)",
        color: "var(--text-main, #fafafa)",
        borderRadius: "6px",
        padding: "8px 12px",
        fontSize: "12px",
        outline: "none",
        fontFamily: "inherit",
        cursor: "pointer",
        minWidth: "150px"
      }}
    >
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  );
}

// --- Main Panel ---

export function SettingsPanel({ settings, onUpdateSettings }: SettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<EditorSettings>(settings);
  const [activeCategory, setActiveCategory] = useState("Appearance");
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
      const api = window.atlasAPI;
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
    const api = window.atlasAPI;
    if (api) api.setSecureKey(key, value);
    setTestStatus(prev => ({ ...prev, [key]: "idle" }));
  };

  const handleTestConnection = async (providerName: string, stateKey: string) => {
    const api = window.atlasAPI;
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

    // If theme is changed, apply instantly using ThemeManager
    if (key === "theme") {
      if (value === "light") {
        ThemeManager.getInstance().setLightMode();
      } else {
        ThemeManager.getInstance().setDarkMode();
      }
    }
  };

  const SettingRow = ({ title, description, control }: { title: string, description: string, control: React.ReactNode }) => (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "16px 20px",
      borderBottom: "1px solid var(--border-color, #27272a)"
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingRight: "40px" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main, #fafafa)" }}>{title}</span>
        <span style={{ fontSize: "12px", color: "var(--text-muted, #a1a1aa)", lineHeight: "1.4" }}>{description}</span>
      </div>
      <div>{control}</div>
    </div>
  );

  const SettingGroup = ({ children }: { children: React.ReactNode }) => (
    <div style={{
      backgroundColor: "var(--bg-base, #09090b)",
      border: "1px solid var(--border-color, #27272a)",
      borderRadius: "8px",
      overflow: "hidden",
      marginBottom: "24px"
    }}>
      {children}
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "var(--bg-base, #0d0d10)", color: "var(--text-main, #fafafa)", fontFamily: "sans-serif" }}>
      {/* Sidebar Navigation */}
      <div style={{
        width: "220px",
        minWidth: "220px",
        backgroundColor: "var(--bg-panel, #141417)",
        borderRight: "1px solid var(--border-color, #27272a)",
        padding: "20px 0",
        display: "flex",
        flexDirection: "column"
      }}>
        {CATEGORIES.map(cat => (
          <div
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: "10px 20px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              color: activeCategory === cat ? "var(--text-main, #fafafa)" : "var(--text-muted, #71717a)",
              backgroundColor: activeCategory === cat ? "var(--hover-bg, rgba(255,255,255,0.05))" : "transparent",
              borderLeft: activeCategory === cat ? "3px solid var(--accent, #38bdf8)" : "3px solid transparent",
              transition: "all 0.15s ease"
            }}
          >
            {cat}
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "40px 60px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 600, margin: "0 0 8px 0" }}>{activeCategory}</h1>
        <p style={{ fontSize: "14px", color: "var(--text-muted, #a1a1aa)", margin: "0 0 32px 0" }}>
          Manage your {activeCategory.toLowerCase()} settings and preferences.
        </p>

        {activeCategory === "Appearance" && (
          <SettingGroup>
            <SettingRow 
              title="Editor Theme" 
              description="Select the color theme used in the main editor. You can also import VS Code themes via Ctrl+K Ctrl+T."
              control={<DropdownSelect 
                value={localSettings.theme} 
                onChange={(v) => handleChange("theme", v)}
                options={[
                  {label: "Pure Obsidian Black (Default)", value: "obsidian"},
                  {label: "Midnight Onyx", value: "midnight"},
                  {label: "Monokai Dark", value: "monokai"},
                  {label: "Minimalist Light", value: "light"},
                  {label: "Custom", value: "custom"}
                ]}
              />} 
            />

            {localSettings.theme === "custom" && (
              <div style={{ marginLeft: "16px", padding: "16px", backgroundColor: "var(--bg-panel, #141417)", borderRadius: "8px", border: "1px solid var(--border-color, #27272a)" }}>
                <h4 style={{ margin: "0 0 12px 0", color: "var(--text-main, #fafafa)", fontSize: "13px" }}>Custom Theme Builder</h4>
                {[
                  { key: "--bg-base", label: "Editor Background", default: "#0d0d10" },
                  { key: "--bg-panel", label: "Panel Background", default: "#141417" },
                  { key: "--text-main", label: "Main Text", default: "#fafafa" },
                  { key: "--accent", label: "Accent Color", default: "#38bdf8" },
                  { key: "--border-color", label: "Border Color", default: "#27272a" }
                ].map(c => (
                  <div key={c.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "12px", color: "var(--text-muted, #a1a1aa)" }}>{c.label}</span>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <input 
                        type="color" 
                        value={localSettings.customThemeColors?.[c.key] || c.default}
                        onChange={(e) => {
                          const newColors = { ...(localSettings.customThemeColors || {}) };
                          newColors[c.key] = e.target.value;
                          handleChange("customThemeColors", newColors);
                        }}
                        style={{ width: "24px", height: "24px", padding: 0, border: "none", borderRadius: "4px", cursor: "pointer", background: "none" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <SettingRow 
              title="Editor Font Size" 
              description="Controls the font size in pixels used in the code editor."
              control={<DropdownSelect 
                value={localSettings.fontSize} 
                onChange={(v) => handleChange("fontSize", Number(v))}
                options={[
                  {label: "12 px", value: 12},
                  {label: "13 px", value: 13},
                  {label: "14 px", value: 14},
                  {label: "16 px", value: 16},
                  {label: "18 px", value: 18}
                ]}
              />} 
            />
            <SettingRow 
              title="Font Family" 
              description="The font family used for the editor text."
              control={<DropdownSelect 
                value={localSettings.fontFamily} 
                onChange={(v) => handleChange("fontFamily", v)}
                options={[
                  {label: "JetBrains Mono", value: "'JetBrains Mono', Consolas, monospace"},
                  {label: "Fira Code", value: "'Fira Code', monospace"},
                  {label: "Consolas", value: "Consolas, monospace"}
                ]}
              />} 
            />
          </SettingGroup>
        )}

        {activeCategory === "Appearance" && (
          <SettingGroup>
            <SettingRow 
              title="Sidebar Position" 
              description="Controls whether the primary activity sidebar appears on the left or right."
              control={<DropdownSelect 
                value={localSettings.sidebarPosition || "left"} 
                onChange={(v) => handleChange("sidebarPosition", v)}
                options={[
                  {label: "Left", value: "left"},
                  {label: "Right", value: "right"}
                ]}
              />} 
            />
            <SettingRow 
              title="Terminal Position" 
              description="Controls whether the terminal and bottom panels appear at the bottom or on the right."
              control={<DropdownSelect 
                value={localSettings.terminalPosition || "bottom"} 
                onChange={(v) => handleChange("terminalPosition", v)}
                options={[
                  {label: "Bottom", value: "bottom"},
                  {label: "Right", value: "right"}
                ]}
              />} 
            />
          </SettingGroup>
        )}

        {activeCategory === "Editor" && (
          <SettingGroup>
            <SettingRow 
              title="Format On Save" 
              description="Automatically format the file using Prettier or standard rules when saving."
              control={<ToggleSwitch checked={localSettings.formatOnSave} onChange={(v) => handleChange("formatOnSave", v)} />} 
            />
            <SettingRow 
              title="Inline Git Blame" 
              description="Show ghost text indicating who last modified the current line."
              control={<ToggleSwitch checked={localSettings.gitBlameEnabled} onChange={(v) => handleChange("gitBlameEnabled", v)} />} 
            />
            <SettingRow 
              title="Git Diff Gutters" 
              description="Show colored indicators in the gutter for added, modified, or removed lines."
              control={<ToggleSwitch checked={localSettings.gitDiffGuttersEnabled} onChange={(v) => handleChange("gitDiffGuttersEnabled", v)} />} 
            />
            <SettingRow 
              title="Auto Save" 
              description="Controls whether files are automatically saved."
              control={<DropdownSelect 
                value={localSettings.autoSave} 
                onChange={(v) => handleChange("autoSave", v)}
                options={[
                  {label: "Off (Manual Ctrl+S)", value: "off"},
                  {label: "On Delay (1000ms)", value: "afterDelay"},
                  {label: "On Window Focus Change", value: "onFocusChange"}
                ]}
              />} 
            />
            <SettingRow 
              title="Tab Size" 
              description="The number of spaces a tab is equal to."
              control={<DropdownSelect 
                value={localSettings.tabSize} 
                onChange={(v) => handleChange("tabSize", Number(v))}
                options={[
                  {label: "2 Spaces", value: 2},
                  {label: "4 Spaces", value: 4}
                ]}
              />} 
            />
          </SettingGroup>
        )}

        {activeCategory === "Terminal" && (
          <SettingGroup>
            <SettingRow 
              title="Default Terminal Shell" 
              description="The default shell environment to use when spawning a new terminal."
              control={<DropdownSelect 
                value={localSettings.terminalShell} 
                onChange={(v) => handleChange("terminalShell", v)}
                options={[
                  {label: "Windows Command Prompt (cmd.exe)", value: "cmd"},
                  {label: "Windows PowerShell", value: "powershell"},
                  {label: "Git Bash / Unix Shell", value: "bash"}
                ]}
              />} 
            />
          </SettingGroup>
        )}

        {activeCategory === "AI Configuration" && (
          <>
            <SettingGroup>
              <SettingRow 
                title="AI Provider" 
                description="Select the AI service provider to power Atlas AI Agent features."
                control={<DropdownSelect 
                  value={localSettings.aiProvider || "openai"} 
                  onChange={(v) => handleChange("aiProvider", v)}
                  options={[
                    {label: "Google Gemini", value: "gemini"},
                    {label: "OpenAI", value: "openai"},
                    {label: "Anthropic", value: "anthropic"},
                    {label: "OpenAI-Compatible (Custom)", value: "openai-compatible"}
                  ]}
                />} 
              />
              <SettingRow 
                title="AI Model" 
                description="The exact model identifier to request from the provider."
                control={
                  <input 
                    type="text" 
                    value={localSettings.aiModel}
                    onChange={(e) => handleChange("aiModel", e.target.value)}
                    placeholder="e.g. gemini-2.0-flash or gpt-4o"
                    style={textInputStyle}
                  />
                } 
              />
              {localSettings.aiProvider === "openai-compatible" && (
                <SettingRow 
                  title="Base URL (Custom Endpoint)" 
                  description="The custom API endpoint for OpenAI-compatible providers."
                  control={
                    <input 
                      type="text" 
                      value={localSettings.aiBaseUrl || ""}
                      onChange={(e) => handleChange("aiBaseUrl", e.target.value)}
                      placeholder="https://api.routing.run/v1"
                      style={textInputStyle}
                    />
                  } 
                />
              )}
            </SettingGroup>

            <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main, #fafafa)", margin: "32px 0 16px 0" }}>API Keys & Security</h3>
            
            <SettingGroup>
              <SettingRow 
                title="OpenAI API Key" 
                description="Used for OpenAI endpoints."
                control={
                  <ApiKeyInput 
                    value={secureKeys.openaiApiKey}
                    onChange={(v: string) => handleSecureKeyChange("openaiApiKey", v)}
                    onTest={() => handleTestConnection("openai", "openaiApiKey")}
                    status={testStatus.openaiApiKey}
                    placeholder="sk-proj-..."
                  />
                } 
              />
              <SettingRow 
                title="Anthropic API Key" 
                description="Used for Anthropic Claude models."
                control={
                  <ApiKeyInput 
                    value={secureKeys.anthropicApiKey}
                    onChange={(v: string) => handleSecureKeyChange("anthropicApiKey", v)}
                    onTest={() => handleTestConnection("anthropic", "anthropicApiKey")}
                    status={testStatus.anthropicApiKey}
                    placeholder="sk-ant-..."
                  />
                } 
              />
              <SettingRow 
                title="Gemini API Key" 
                description="Used for Google Gemini models."
                control={
                  <ApiKeyInput 
                    value={secureKeys.geminiApiKey}
                    onChange={(v: string) => handleSecureKeyChange("geminiApiKey", v)}
                    onTest={() => handleTestConnection("gemini", "geminiApiKey")}
                    status={testStatus.geminiApiKey}
                    placeholder="AIzaSy..."
                  />
                } 
              />
              <SettingRow 
                title="OpenRouter API Key" 
                description="Used for OpenAI-compatible routing endpoints."
                control={
                  <ApiKeyInput 
                    value={secureKeys.openRouterApiKey}
                    onChange={(v: string) => handleSecureKeyChange("openRouterApiKey", v)}
                    onTest={() => handleTestConnection("openai-compatible", "openRouterApiKey")}
                    status={testStatus.openRouterApiKey}
                    placeholder="sk-or-..."
                  />
                } 
              />
            </SettingGroup>
          </>
        )}

        {activeCategory === "Advanced" && (
          <SettingGroup>
            <SettingRow 
              title="Raw JSON Configuration" 
              description="Open the raw settings.json file in the editor to make advanced modifications."
              control={
                <button 
                  onClick={async () => {
                    const api = window.atlasAPI;
                    if (api?.getPaths && api?.openFileInEditor) {
                      const paths = await api.getPaths();
                      api.openFileInEditor(paths.settingsJsonPath);
                    }
                  }}
                  style={{...textInputStyle, cursor: "pointer", backgroundColor: "var(--border-color, #27272a)"}}
                >
                  Open settings.json
                </button>
              } 
            />
            <SettingRow 
              title="Raw Keybindings" 
              description="Open the raw keybindings.json file in the editor to bind custom bash commands and snippets."
              control={
                <button 
                  onClick={async () => {
                    const api = window.atlasAPI;
                    if (api?.getPaths && api?.openFileInEditor) {
                      const paths = await api.getPaths();
                      api.openFileInEditor(paths.keybindingsJsonPath);
                    }
                  }}
                  style={{...textInputStyle, cursor: "pointer", backgroundColor: "var(--border-color, #27272a)"}}
                >
                  Open keybindings.json
                </button>
              } 
            />
          </SettingGroup>
        )}

        
        {/* Fill empty space at bottom */}
        <div style={{ height: "40px" }} />
      </div>
    </div>
  );
}

const textInputStyle: React.CSSProperties = {
  backgroundColor: "var(--bg-header, #18181b)",
  border: "1px solid var(--border-color, #27272a)",
  color: "var(--text-main, #fafafa)",
  borderRadius: "6px",
  padding: "8px 12px",
  fontSize: "12px",
  outline: "none",
  fontFamily: "inherit",
  minWidth: "200px"
};

function ApiKeyInput({ value, onChange, onTest, status, placeholder }: any) {
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      <input 
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{...textInputStyle, minWidth: "180px"}}
      />
      <button 
        onClick={onTest}
        disabled={status === "testing" || !value}
        style={{
          backgroundColor: "var(--border-color, #27272a)",
          border: "1px solid var(--border-color, #3f3f46)",
          color: "var(--text-main, #fafafa)",
          borderRadius: "6px",
          padding: "8px 16px",
          fontSize: "12px",
          cursor: (status === "testing" || !value) ? "not-allowed" : "pointer",
          opacity: (status === "testing" || !value) ? 0.6 : 1,
          transition: "background-color 0.15s ease",
          minWidth: "70px"
        }}
      >
        {status === "testing" ? "..." : status === "success" ? "OK" : status === "error" ? "Failed" : "Test"}
      </button>
    </div>
  );
}
