import React, { useState, useEffect } from "react";
import { useStorage } from "./StorageContext";

export interface KeybindingDef {
  id: string;
  name: string;
  defaultKey: string;
  category: string;
}

export const DEFAULT_KEYBINDINGS: KeybindingDef[] = [
  { id: "commandPalette", name: "Show Command Palette", defaultKey: "Ctrl+Shift+P", category: "General" },
  { id: "settings", name: "Open Settings", defaultKey: "Ctrl+,", category: "General" },
  { id: "keybindings", name: "Open Keyboard Shortcuts", defaultKey: "Ctrl+K Ctrl+S", category: "General" },
  { id: "save", name: "Save File", defaultKey: "Ctrl+S", category: "File" },
  { id: "saveAll", name: "Save All Files", defaultKey: "Ctrl+Shift+S", category: "File" },
  { id: "closeTab", name: "Close Editor Tab", defaultKey: "Ctrl+W", category: "File" },
  { id: "splitEditor", name: "Toggle Split Editor", defaultKey: "Ctrl+\\", category: "View" },
  { id: "toggleAi", name: "Toggle AI Chat", defaultKey: "Ctrl+L", category: "View" },
  { id: "inlineAi", name: "Inline AI Assistant", defaultKey: "Ctrl+I", category: "View" },
  { id: "explorer", name: "Focus Explorer", defaultKey: "Ctrl+Shift+E", category: "View" },
  { id: "search", name: "Focus Search", defaultKey: "Ctrl+Shift+F", category: "View" },
  { id: "git", name: "Focus Source Control", defaultKey: "Ctrl+Shift+G", category: "View" },
  { id: "extensions", name: "Focus Extensions", defaultKey: "Ctrl+Shift+X", category: "View" },
  { id: "toggleTerminal", name: "Toggle Terminal", defaultKey: "Ctrl+`", category: "Terminal" },
  { id: "debug", name: "Start Debugging", defaultKey: "F5", category: "Run" },
];

interface KeybindingsPanelProps {
  onClose: () => void;
  onKeybindingsChanged?: () => void;
}

export function KeybindingsPanel({ onClose, onKeybindingsChanged }: KeybindingsPanelProps) {
  const storage = useStorage();
  const [bindings, setBindings] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const loadBindings = async () => {
      try {
        const saved = await storage.getItem("atlas_keybindings");
        if (saved) {
          setBindings(JSON.parse(saved));
        }
      } catch (err) {
        console.warn("Failed to load custom keybindings", err);
      }
    };
    loadBindings();
  }, [storage]);

  const saveBindings = async (newBindings: Record<string, string>) => {
    setBindings(newBindings);
    await storage.setItem("atlas_keybindings", JSON.stringify(newBindings));
    if (onKeybindingsChanged) onKeybindingsChanged();
  };

  const handleReset = (id: string) => {
    const updated = { ...bindings };
    delete updated[id];
    saveBindings(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!editingId) return;
    e.preventDefault();
    e.stopPropagation();

    if (e.key === "Escape") {
      setEditingId(null);
      return;
    }

    if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
      return; // Wait for full combo
    }

    const modifiers = [];
    if (e.ctrlKey) modifiers.push("Ctrl");
    if (e.shiftKey) modifiers.push("Shift");
    if (e.altKey) modifiers.push("Alt");
    if (e.metaKey) modifiers.push("Meta");

    const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    const combo = [...modifiers, key].join("+");

    const updated = { ...bindings, [editingId]: combo };
    saveBindings(updated);
    setEditingId(null);
  };

  const filtered = DEFAULT_KEYBINDINGS.filter(kb =>
    kb.name.toLowerCase().includes(search.toLowerCase()) ||
    kb.category.toLowerCase().includes(search.toLowerCase()) ||
    (bindings[kb.id] || kb.defaultKey).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Keyboard Shortcuts</h2>
            <span style={styles.subtext}>Customize your editor keybindings</span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.searchBox}>
          <input
            autoFocus
            style={styles.searchInput}
            placeholder="Search keybindings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={styles.list}>
          {filtered.map(kb => {
            const currentKey = bindings[kb.id] || kb.defaultKey;
            const isEditing = editingId === kb.id;
            const isCustom = !!bindings[kb.id];

            return (
              <div key={kb.id} style={styles.row}>
                <div style={styles.info}>
                  <div style={styles.kbName}>{kb.name}</div>
                  <div style={styles.kbCategory}>{kb.category}</div>
                </div>
                <div style={styles.actions}>
                  {isEditing ? (
                    <input
                      autoFocus
                      readOnly
                      style={styles.editInput}
                      value="Press key combination... (Esc to cancel)"
                      onKeyDown={handleKeyDown}
                      onBlur={() => setEditingId(null)}
                    />
                  ) : (
                    <button style={styles.keyBtn} onClick={() => setEditingId(kb.id)}>
                      {currentKey}
                    </button>
                  )}
                  {isCustom && !isEditing && (
                    <button style={styles.resetBtn} onClick={() => handleReset(kb.id)} title="Reset to default">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={styles.footer}>
          <button style={styles.okBtn} onClick={onClose}>Done</button>
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
    backdropFilter: "blur(2px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
  },
  modal: {
    backgroundColor: "var(--bg-panel, #141417)",
    border: "1px solid #27272a",
    borderRadius: "12px",
    width: "700px",
    maxHeight: "80vh",
    maxWidth: "90vw",
    boxShadow: "0 24px 72px rgba(0, 0, 0, 0.9)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px",
    backgroundColor: "var(--bg-header, #18181b)",
    borderBottom: "1px solid #27272a",
  },
  title: {
    fontSize: "18px",
    fontWeight: 700,
    margin: "0 0 4px",
    color: "var(--text-main, #fafafa)",
  },
  subtext: {
    fontSize: "12px",
    color: "var(--text-muted, #a1a1aa)",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted, #71717a)",
    fontSize: "16px",
    cursor: "pointer",
  },
  searchBox: {
    padding: "16px 20px",
    borderBottom: "1px solid #27272a",
    backgroundColor: "var(--bg-base, #0d0d10)",
  },
  searchInput: {
    width: "100%",
    backgroundColor: "var(--bg-header, #18181b)",
    border: "1px solid #3f3f46",
    color: "var(--text-main, #fafafa)",
    borderRadius: "6px",
    padding: "8px 12px",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    backgroundColor: "var(--bg-base, #0d0d10)",
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    backgroundColor: "var(--bg-header, #18181b)",
    borderRadius: "6px",
    border: "1px solid #27272a",
  },
  info: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  kbName: {
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--text-main, #e4e4e7)",
  },
  kbCategory: {
    fontSize: "11px",
    color: "var(--text-muted, #71717a)",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  keyBtn: {
    backgroundColor: "var(--border-color, #27272a)",
    border: "1px solid #3f3f46",
    color: "var(--accent, #38bdf8)",
    borderRadius: "4px",
    padding: "4px 8px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "monospace",
  },
  editInput: {
    backgroundColor: "var(--border-color, #27272a)",
    border: "1px solid #38bdf8",
    color: "var(--text-main, #fafafa)",
    borderRadius: "4px",
    padding: "4px 8px",
    fontSize: "12px",
    width: "250px",
    outline: "none",
    textAlign: "center",
  },
  resetBtn: {
    background: "none",
    border: "none",
    color: "#f87171",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    padding: "16px 20px",
    backgroundColor: "var(--bg-header, #18181b)",
    borderTop: "1px solid #27272a",
  },
  okBtn: {
    backgroundColor: "var(--text-main, #fafafa)",
    color: "var(--bg-base, #09090b)",
    border: "none",
    borderRadius: "6px",
    padding: "8px 20px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
};
