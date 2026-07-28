import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface StatusBarProps {
  repoPath?: string;
  activeLanguage?: string;
  cursorSymbol?: string;
  cursorLine?: number;
  cursorCol?: number;
  lsStatus?: "loading" | "ready" | "error";
  healthScore?: number | null;
  selectedModel?: string;
  onChangeModel?: (model: string) => void;
  onChangeLanguage?: (lang: string) => void;
  onChangeIndentation?: (spaces: number, useTab: boolean) => void;
  onChangeEol?: (eol: "LF" | "CRLF") => void;
  onGoToLine?: () => void;
  tabSize?: number;
  useTabs?: boolean;
  eol?: "LF" | "CRLF";
  hasActiveFile?: boolean;
  discordRpcState?: "connected" | "reconnecting" | "disconnected";
  onToggleDiscordRpc?: () => void;
  onOpenExtensionDetail?: (extData: any) => void;
  onShowContextMenu?: (options: { x: number; y: number; items: any[] }) => void;
}

interface PickerProps {
  items: string[];
  onSelect: (val: string) => void;
  onClose: () => void;
  title: string;
  anchor: { x: number; y: number };
}

function Picker({ items, onSelect, onClose, title, anchor }: PickerProps) {
  const [filter, setFilter] = useState("");
  const [hoveredIdx, setHoveredIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = items.filter(i => i.toLowerCase().includes(filter.toLowerCase()));

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setHoveredIdx(0); }, [filter]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setHoveredIdx(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setHoveredIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter") { e.preventDefault(); if (filtered[hoveredIdx]) { onSelect(filtered[hoveredIdx]); onClose(); } }
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };

  const top = Math.max(10, Math.min(anchor.y - (Math.min(filtered.length, 8) * 28 + 90), window.innerHeight - 300));
  const left = Math.max(10, Math.min(anchor.x - 140, window.innerWidth - 300));

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999997 }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "fixed", top, left,
          width: 290, backgroundColor: "var(--bg-glass-strong, rgba(14, 14, 18, 0.95))",
          backdropFilter: "blur(20px) saturate(1.5)",
          WebkitBackdropFilter: "blur(20px) saturate(1.5)",
          border: "1px solid var(--border-strong, #27272a)", borderRadius: 8,
          boxShadow: "var(--shadow-lg), 0 20px 40px rgba(0,0,0,0.6)", overflow: "hidden",
          fontFamily: "var(--font-ui)", zIndex: 999998
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: "8px 12px 6px", fontSize: 10, color: "var(--accent, #38bdf8)", fontWeight: 700, letterSpacing: "1px", borderBottom: "1px solid var(--border-subtle, #27272a)", textTransform: "uppercase" }}>
          {title}
        </div>
        <div style={{ padding: "6px 8px" }}>
          <input
            ref={inputRef}
            value={filter}
            onChange={e => setFilter(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search options..."
            style={{
              width: "100%", boxSizing: "border-box",
              background: "var(--bg-base, #09090b)",
              border: "1px solid var(--border-strong, #27272a)",
              borderRadius: 4, padding: "6px 10px", fontSize: 12,
              color: "var(--text-main, #fafafa)", outline: "none",
            }}
          />
        </div>
        <div style={{ maxHeight: 220, overflowY: "auto", padding: "4px" }}>
          {filtered.length === 0
            ? <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--text-muted, #71717a)" }}>No results matching</div>
            : filtered.map((item, idx) => (
              <div
                key={item}
                style={{
                  padding: "6px 10px", fontSize: 12, cursor: "pointer", borderRadius: 4,
                  backgroundColor: idx === hoveredIdx ? "var(--bg-hover-strong, rgba(255,255,255,0.08))" : "transparent",
                  color: idx === hoveredIdx ? "var(--accent, #38bdf8)" : "var(--text-main, #fafafa)",
                  transition: "all 0.1s ease"
                }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onClick={() => { onSelect(item); onClose(); }}
              >
                {item}
              </div>
            ))
          }
        </div>
      </motion.div>
    </div>
  );
}

const LANGUAGES = [
  "TypeScript", "TypeScript JSX", "JavaScript", "JavaScript JSX",
  "Python", "JSON", "Markdown", "CSS", "HTML", "Shell Script",
  "YAML", "Rust", "Go", "C", "C++", "Java", "Kotlin",
  "Ruby", "PHP", "SQL", "Plain Text"
];

const PROVIDER_MODELS: Record<string, string[]> = {
  "routing.run": [
    "kimi-k2.6 (Fast)",
    "claude-opus-4-8",
    "claude-sonnet-4-6",
    "deepseek-v4-pro",
    "deepseek-v4-flash",
    "gpt-5.6-sol",
    "gpt-5.6-luna",
    "gpt-5.6-terra",
    "kimi-k2.6-nitro",
    "kimi-k2.7-code",
    "glm-5.2",
    "glm-5.2-nitro",
    "nemotron-3-ultra",
    "qwen3.5-9b"
  ],
  "openai": ["gpt-4o", "gpt-4o-mini", "o3-mini"],
  "anthropic": ["claude-3-5-sonnet", "claude-3-5-haiku", "claude-3-opus"],
  "gemini": ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
};

const LANGUAGE_ID_MAP: Record<string, string> = {
  "TypeScript": "typescript", "TypeScript JSX": "typescriptreact",
  "JavaScript": "javascript", "JavaScript JSX": "javascriptreact",
  "Python": "python", "JSON": "json", "Markdown": "markdown",
  "CSS": "css", "HTML": "html", "Shell Script": "shell",
  "YAML": "yaml", "Rust": "rust", "Go": "go",
  "C": "c", "C++": "cpp", "Java": "java", "Kotlin": "kotlin",
  "Ruby": "ruby", "PHP": "php", "SQL": "sql", "Plain Text": "plaintext"
};

const LANGUAGE_DISPLAY_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(LANGUAGE_ID_MAP).map(([k, v]) => [v, k])
);

const INDENT_OPTIONS = [
  "Indent Using Spaces: 2", "Indent Using Spaces: 4", "Indent Using Spaces: 8",
  "Indent Using Tabs: 2", "Indent Using Tabs: 4"
];

type PickerKind = "language" | "indent" | "eol" | "model" | "branch" | null;

export function StatusBar({
  repoPath,
  activeLanguage,
  cursorSymbol,
  cursorLine = 1,
  cursorCol = 1,
  lsStatus = "ready",
  healthScore,
  selectedModel = "Gemini 2.5 Flash",
  onChangeModel,
  onChangeLanguage,
  onChangeIndentation,
  onChangeEol,
  onGoToLine,
  tabSize = 2,
  useTabs = false,
  eol = "LF",
  hasActiveFile = false,
  discordRpcState = "connected",
  onToggleDiscordRpc,
  onOpenExtensionDetail,
  onShowContextMenu
}: StatusBarProps) {
  const [activePicker, setActivePicker] = useState<PickerKind>(null);
  const [pickerAnchor, setPickerAnchor] = useState({ x: 0, y: 0 });
  const [currentProvider, setCurrentProvider] = useState<string>("gemini");
  const [activeModel, setActiveModel] = useState<string>(selectedModel);
  const [hideDiscordItem, setHideDiscordItem] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const api = (window as any).atlasAPI;
      if (api?.getSettings) {
        const s = await api.getSettings();
        if (s) {
          if (s.aiProvider) setCurrentProvider(s.aiProvider);
          if (s.aiModel) setActiveModel(s.aiModel);
        }
      }
    };
    loadSettings();
    window.addEventListener("focus", loadSettings);
    return () => window.removeEventListener("focus", loadSettings);
  }, []);

  const modelOptions = PROVIDER_MODELS[currentProvider] ?? PROVIDER_MODELS["gemini"] ?? [];

  const openPicker = (kind: PickerKind, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPickerAnchor({ x: rect.left, y: rect.top });
    setActivePicker(prev => prev === kind ? null : kind);
  };

  const displayLanguage = activeLanguage
    ? (LANGUAGE_DISPLAY_MAP[activeLanguage] ?? activeLanguage.toUpperCase())
    : "TypeScript JSX";

  const indentLabel = useTabs ? `Tab Size: ${tabSize}` : `Spaces: ${tabSize}`;

  const handleLanguageSelect = (lang: string) => {
    const id = LANGUAGE_ID_MAP[lang] ?? lang.toLowerCase().replace(/ /g, "");
    onChangeLanguage?.(id);
  };

  const handleIndentSelect = (option: string) => {
    const useTab = option.includes("Tabs");
    const size = parseInt(option.match(/\d+/)?.[0] ?? "2", 10);
    onChangeIndentation?.(size, useTab);
  };

  const handleEolSelect = (option: string) => {
    onChangeEol?.(option as "LF" | "CRLF");
  };

  const handleModelSelect = (m: string) => {
    const cleanModel = m.split(" ")[0] || m;
    setActiveModel(cleanModel);
    onChangeModel?.(cleanModel);
    const api = (window as any).atlasAPI;
    if (api?.updateSettings) {
      api.updateSettings({ aiModel: cleanModel });
    }
  };

  const itemStyle = (clickable = true): React.CSSProperties => ({
    display: "flex", alignItems: "center", height: "100%",
    padding: "0 8px", gap: "4px", cursor: clickable ? "pointer" : "default",
    fontSize: 11, color: "var(--text-main, #e4e4e7)",
    transition: "background 0.1s",
    userSelect: "none",
    whiteSpace: "nowrap"
  });

  const handleDiscordContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onShowContextMenu?.({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          label: "Manage Extension (Atlascord)",
          onClick: () => {
            onOpenExtensionDetail?.({
              id: "atlascord",
              name: "Atlascord",
              publisher: "Eren-Jaeger-DEV",
              version: "1.0.0",
              description: "Highly customizable Discord Rich Presence extension for Atlas Studio",
              repository: "https://github.com/Eren-Jaeger-DEV/Atlascord",
              license: "MIT"
            });
          }
        },
        {
          label: discordRpcState === "connected" ? "Disconnect Discord RPC" : "Connect Discord RPC",
          onClick: () => onToggleDiscordRpc?.()
        },
        {
          label: "Hide 'Atlascord (Extension)'",
          onClick: () => setHideDiscordItem(true)
        }
      ]
    });
  };

  return (
    <>
      <footer style={s.statusBar}>
        {/* LEFT */}
        <div style={s.leftGroup}>
          <div style={{ ...itemStyle(), backgroundColor: "var(--accent, #0ea5e9)", color: "#fff", padding: "0 12px", fontFamily: "monospace", fontWeight: "bold", letterSpacing: "-1px", fontSize: 12 }}>
            &gt;&lt;
          </div>
          
          {/* Branch Picker */}
          <div
            id="statusbar-branch"
            className="statusbar-item"
            style={itemStyle()}
            title="Git Branch"
            onClick={e => openPicker("branch", e)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
            <span>main</span>
          </div>
        </div>

        {/* RIGHT */}
        <div style={s.rightGroup}>

          {hasActiveFile && cursorSymbol && (
            <div style={itemStyle(false)}>
              <span style={{ opacity: 0.7 }}>{cursorSymbol}</span>
            </div>
          )}

          {/* Cursor position - only when a file is open */}
          {hasActiveFile && (
            <div
              id="statusbar-cursor"
              className="statusbar-item"
              style={itemStyle()}
              title="Go to Line/Column (Ctrl+G)"
              onClick={() => onGoToLine?.()}
            >
              Ln {cursorLine}, Col {cursorCol}
            </div>
          )}

          {/* Indentation picker - only when a file is open */}
          {hasActiveFile && (
            <div
              id="statusbar-indent"
              className="statusbar-item"
              style={itemStyle()}
              title="Change Indentation"
              onClick={e => openPicker("indent", e)}
            >
              {indentLabel}
            </div>
          )}

          {/* EOL picker - only when a file is open */}
          {hasActiveFile && (
            <div
              id="statusbar-eol"
              className="statusbar-item"
              style={itemStyle()}
              title="Select End of Line Sequence"
              onClick={e => openPicker("eol", e)}
            >
              {eol}
            </div>
          )}

          {/* Language picker - only when a file is open */}
          {hasActiveFile && (
            <div
              id="statusbar-language"
              className="statusbar-item"
              style={itemStyle()}
              title="Select Language Mode"
              onClick={e => openPicker("language", e)}
            >
              <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: "bold" }}>{"{}"}</span>
              <span>{displayLanguage}</span>
              {lsStatus === "ready"    && <div className="pulsing-dot" style={{ marginLeft: 6, width: 7, height: 7, borderRadius: "50%", backgroundColor: "#22c55e" }} title="Language Server Ready" />}
              {lsStatus === "loading"  && <div className="pulsing-dot" style={{ marginLeft: 6, width: 7, height: 7, borderRadius: "50%", backgroundColor: "#38bdf8" }} title="Language Server Loading..." />}
              {lsStatus === "error"    && <div style={{ marginLeft: 6, width: 7, height: 7, borderRadius: "50%", backgroundColor: "#ef4444" }} title="Language Server Error" />}
            </div>
          )}

          {/* Health - only when a file is open */}
          {hasActiveFile && healthScore !== undefined && healthScore !== null && (
            <div className="statusbar-item" style={itemStyle(false)} title="Project Health">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              Health: {healthScore}%
            </div>
          )}

          {/* Discord RPC Status Bar Item */}
          {!hideDiscordItem && (
            <div
              id="statusbar-discord-rpc"
              className="statusbar-item"
              style={itemStyle()}
              title={
                discordRpcState === "connected"
                  ? "Discord RPC Connected (Click to Disconnect, Right Click to Manage)"
                  : discordRpcState === "reconnecting"
                  ? "Discord RPC Connecting... (Click to Retry, Right Click to Manage)"
                  : "Discord RPC Disconnected (Click to Connect, Right Click to Manage)"
              }
              onClick={onToggleDiscordRpc}
              onContextMenu={handleDiscordContextMenu}
            >
              {discordRpcState === "connected" ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              )}
              <span>
                {discordRpcState === "connected"
                  ? "Discord RPC"
                  : discordRpcState === "reconnecting"
                  ? "Discord RPC (Connecting...)"
                  : "Discord RPC (Disconnected)"}
              </span>
            </div>
          )}

          <div className="statusbar-item" style={itemStyle(false)}>Atlas Studio</div>
        </div>
      </footer>

      {/* Animated Picker overlays */}
      <AnimatePresence>
        {activePicker === "language" && (
          <Picker
            title="SELECT LANGUAGE MODE"
            items={LANGUAGES}
            onSelect={handleLanguageSelect}
            onClose={() => setActivePicker(null)}
            anchor={pickerAnchor}
          />
        )}
        {activePicker === "indent" && (
          <Picker
            title="SELECT INDENTATION"
            items={INDENT_OPTIONS}
            onSelect={handleIndentSelect}
            onClose={() => setActivePicker(null)}
            anchor={pickerAnchor}
          />
        )}
        {activePicker === "eol" && (
          <Picker
            title="SELECT END OF LINE SEQUENCE"
            items={["LF", "CRLF"]}
            onSelect={handleEolSelect}
            onClose={() => setActivePicker(null)}
            anchor={pickerAnchor}
          />
        )}
        {activePicker === "model" && (
          <Picker
            title="SELECT AI MODEL"
            items={modelOptions}
            onSelect={handleModelSelect}
            onClose={() => setActivePicker(null)}
            anchor={pickerAnchor}
          />
        )}
        {activePicker === "branch" && (
          <Picker
            title="SWITCH GIT BRANCH"
            items={["main", "feature/ai-composer", "release/v1.0", "origin/main"]}
            onSelect={() => setActivePicker(null)}
            onClose={() => setActivePicker(null)}
            anchor={pickerAnchor}
          />
        )}
      </AnimatePresence>
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  statusBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    height: "22px", backgroundColor: "var(--bg-statusbar, #000000)",
    color: "#ffffff",
    userSelect: "none", overflow: "hidden", flexShrink: 0,
    borderTop: "1px solid var(--border-subtle, #18181b)",
  },
  leftGroup: { display: "flex", alignItems: "center", height: "100%" },
  rightGroup: { display: "flex", alignItems: "center", height: "100%" },
};
