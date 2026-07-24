import React, { useState, useRef, useEffect } from "react";

interface StatusBarProps {
  repoPath?: string;
  activeLanguage?: string;
  cursorSymbol?: string;
  cursorLine?: number;
  cursorCol?: number;
  lsStatus?: "loading" | "ready" | "error";
  healthScore?: number | null;
  onChangeLanguage?: (lang: string) => void;
  onChangeIndentation?: (spaces: number, useTab: boolean) => void;
  onChangeEol?: (eol: "LF" | "CRLF") => void;
  onGoToLine?: () => void;
  tabSize?: number;
  useTabs?: boolean;
  eol?: "LF" | "CRLF";
}

// ---- Picker popup -----
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

  const top = Math.min(anchor.y, window.innerHeight - (Math.min(filtered.length, 8) * 28 + 80));
  const left = Math.max(0, Math.min(anchor.x - 140, window.innerWidth - 300));

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999997 }} onClick={onClose}>
      <div
        className="anim-scale-in"
        style={{
          position: "fixed", top, left,
          width: 280, backgroundColor: "rgba(24, 24, 27, 0.7)",
          backdropFilter: "blur(16px) saturate(1.5)",
          WebkitBackdropFilter: "blur(16px) saturate(1.5)",
          border: "1px solid var(--border-medium)", borderRadius: 6,
          boxShadow: "var(--shadow-lg), var(--shadow-panel)", overflow: "hidden",
          fontFamily: "var(--font-ui)", zIndex: 999998
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: "8px 10px 4px", fontSize: 11, color: "var(--text-muted, #71717a)", fontWeight: 600, letterSpacing: "0.5px", borderBottom: "1px solid var(--border-color, #27272a)", marginBottom: 2 }}>
          {title}
        </div>
        <div style={{ padding: "6px 8px" }}>
          <input
            ref={inputRef}
            value={filter}
            onChange={e => setFilter(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search..."
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(0, 0, 0, 0.2)",
              border: "1px solid var(--border-color)",
              borderRadius: 4, padding: "5px 8px", fontSize: 13,
              color: "var(--text-main)", outline: "none",
              transition: "border-color 0.15s, box-shadow 0.15s"
            }}
          />
        </div>
        <div style={{ maxHeight: 224, overflowY: "auto", paddingBottom: 6 }}>
          {filtered.length === 0
            ? <div style={{ padding: "8px 16px", fontSize: 12, color: "var(--text-muted, #777)" }}>No results</div>
            : filtered.map((item, idx) => (
              <div
                key={item}
                style={{
                  padding: "5px 16px", fontSize: 13, cursor: "pointer",
                  backgroundColor: idx === hoveredIdx ? "var(--accent)" : "transparent",
                  color: idx === hoveredIdx ? "#fff" : "var(--text-main)",
                  transition: "background-color 0.1s"
                }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onClick={() => { onSelect(item); onClose(); }}
              >
                {item}
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

const LANGUAGES = [
  "TypeScript", "TypeScript JSX", "JavaScript", "JavaScript JSX",
  "Python", "JSON", "Markdown", "CSS", "HTML", "Shell Script",
  "YAML", "Rust", "Go", "C", "C++", "Java", "Kotlin",
  "Ruby", "PHP", "SQL", "Plain Text"
];

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

type PickerKind = "language" | "indent" | "eol" | null;

export function StatusBar({
  repoPath,
  activeLanguage,
  cursorSymbol,
  cursorLine = 1,
  cursorCol = 1,
  lsStatus = "ready",
  healthScore,
  onChangeLanguage,
  onChangeIndentation,
  onChangeEol,
  onGoToLine,
  tabSize = 2,
  useTabs = false,
  eol = "LF"
}: StatusBarProps) {
  const [activePicker, setActivePicker] = useState<PickerKind>(null);
  const [pickerAnchor, setPickerAnchor] = useState({ x: 0, y: 0 });

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

  const itemStyle = (clickable = true): React.CSSProperties => ({
    display: "flex", alignItems: "center", height: "100%",
    padding: "0 8px", gap: "4px", cursor: clickable ? "pointer" : "default",
    fontSize: 11, color: "var(--text-main, #e4e4e7)",
    transition: "background 0.1s",
    userSelect: "none",
    whiteSpace: "nowrap"
  });

  return (
    <>
      <footer style={s.statusBar}>
        {/* LEFT */}
        <div style={s.leftGroup}>
          <div style={{ ...itemStyle(), backgroundColor: "var(--accent, #0ea5e9)", color: "#fff", padding: "0 12px", fontFamily: "monospace", fontWeight: "bold", letterSpacing: "-1px", fontSize: 12 }}>
            &gt;&lt;
          </div>
        </div>

        {/* RIGHT */}
        <div style={s.rightGroup}>
          {cursorSymbol && (
            <div style={itemStyle(false)}>
              <span style={{ opacity: 0.7 }}>{cursorSymbol}</span>
            </div>
          )}

          {/* Cursor position — click = Go to Line */}
          <div
            id="statusbar-cursor"
            className="statusbar-item"
            style={itemStyle()}
            title="Go to Line/Column (Ctrl+G)"
            onClick={() => onGoToLine?.()}
          >
            Ln {cursorLine}, Col {cursorCol}
          </div>

          {/* Indentation picker */}
          <div
            id="statusbar-indent"
            className="statusbar-item"
            style={itemStyle()}
            title="Change Indentation"
            onClick={e => openPicker("indent", e)}
          >
            {indentLabel}
          </div>

          {/* EOL picker */}
          <div
            id="statusbar-eol"
            className="statusbar-item"
            style={itemStyle()}
            title="Select End of Line Sequence"
            onClick={e => openPicker("eol", e)}
          >
            {eol}
          </div>

          {/* Encoding — read-only for now */}
          <div className="statusbar-item" style={itemStyle(false)} title="File Encoding">UTF-8</div>

          {/* Language picker */}
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

          {/* Health */}
          {healthScore !== undefined && healthScore !== null && (
            <div className="statusbar-item" style={itemStyle(false)} title="Project Health">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              Health: {healthScore}%
            </div>
          )}

          {/* Notifications bell */}
          <div className="statusbar-item" style={itemStyle()} title="Notifications">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>

          <div className="statusbar-item" style={itemStyle(false)}>Atlas Studio</div>
        </div>
      </footer>

      {/* Picker overlays */}
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
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  statusBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    height: "22px", backgroundColor: "#000000",
    borderTop: "1px solid #38bdf8", color: "var(--text-main, #e4e4e7)",
    userSelect: "none", overflow: "hidden", flexShrink: 0,
  },
  leftGroup: { display: "flex", alignItems: "center", height: "100%" },
  rightGroup: { display: "flex", alignItems: "center", height: "100%" },
};
