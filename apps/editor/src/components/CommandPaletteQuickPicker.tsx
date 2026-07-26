import React, { useState, useEffect } from "react";

export interface PaletteCommand {
  id: string;
  title: string;
  category: string;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteQuickPickerProps {
  isOpen: boolean;
  onClose: () => void;
  commands?: PaletteCommand[];
}

export function CommandPaletteQuickPicker({ isOpen, onClose, commands }: CommandPaletteQuickPickerProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const defaultCommands: PaletteCommand[] = [
    {
      id: "cmd-inline-ai",
      title: "Trigger Inline AI Assistance (Ctrl+K)",
      category: "AI",
      shortcut: "Ctrl+K",
      action: () => console.log("[Palette] Trigger Inline AI"),
    },
    {
      id: "cmd-toggle-sidebar",
      title: "Toggle AI Chat Panel",
      category: "View",
      shortcut: "Ctrl+L",
      action: () => console.log("[Palette] Toggle AI Chat Panel"),
    },
    {
      id: "cmd-import-settings",
      title: "Import Competitor IDE Settings (Cursor / Windsurf)",
      category: "Settings",
      action: () => console.log("[Palette] Import Settings"),
    },
    {
      id: "cmd-new-workflow",
      title: "Create Custom Agent Workflow (.agent/workflows/)",
      category: "Workflow",
      action: () => console.log("[Palette] Create Workflow"),
    },
    {
      id: "cmd-toggle-terminal",
      title: "Toggle Integrated Terminal",
      category: "View",
      shortcut: "Ctrl+`",
      action: () => console.log("[Palette] Toggle Terminal"),
    },
  ];

  const activeCommands = commands || defaultCommands;
  const filtered = activeCommands.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex]!.action();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div style={styles.searchBar}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #38bdf8)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            autoFocus
            style={styles.searchInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search settings..."
          />
        </div>

        <div style={styles.commandList}>
          {filtered.length === 0 ? (
            <div style={styles.noResults}>No matching commands found</div>
          ) : (
            filtered.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  style={isSelected ? styles.itemSelected : styles.item}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                >
                  <span style={styles.categoryBadge}>{cmd.category}</span>
                  <span style={styles.title}>{cmd.title}</span>
                  {cmd.shortcut && <span style={styles.shortcutBadge}>{cmd.shortcut}</span>}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    zIndex: 9999,
    display: "flex",
    justifyContent: "center",
    paddingTop: "80px",
  },
  modal: {
    width: "600px",
    maxHeight: "420px",
    backgroundColor: "var(--bg-glass-strong, rgba(14, 14, 18, 0.95))",
    border: "1px solid var(--border-strong, #27272a)",
    borderRadius: "var(--radius-lg, 12px)",
    boxShadow: "0 20px 40px rgba(0,0,0,0.8)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  searchBar: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 16px",
    borderBottom: "1px solid var(--border-subtle, #27272a)",
    backgroundColor: "var(--bg-base, #09090b)",
  },
  searchInput: {
    flex: 1,
    background: "none",
    border: "none",
    color: "var(--text-main, #fafafa)",
    fontSize: "14px",
    fontWeight: 500,
    outline: "none",
  },
  commandList: {
    padding: "6px",
    overflow: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "background-color 0.1s ease",
  },
  itemSelected: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    backgroundColor: "var(--accent-glow, rgba(56, 189, 248, 0.15))",
    borderLeft: "3px solid var(--accent, #38bdf8)",
  },
  categoryBadge: {
    fontSize: "9px",
    fontWeight: 700,
    color: "var(--accent, #38bdf8)",
    backgroundColor: "var(--bg-panel, #18181b)",
    padding: "2px 6px",
    borderRadius: "4px",
    textTransform: "uppercase",
  },
  title: {
    fontSize: "13px",
    color: "var(--text-main, #fafafa)",
    flex: 1,
  },
  shortcutBadge: {
    fontSize: "10px",
    fontWeight: 600,
    color: "var(--text-muted, #a1a1aa)",
    backgroundColor: "var(--bg-panel, #18181b)",
    padding: "2px 6px",
    borderRadius: "4px",
    border: "1px solid var(--border-subtle, #27272a)",
  },
  noResults: {
    padding: "16px",
    textAlign: "center",
    fontSize: "12px",
    color: "var(--text-muted, #a1a1aa)",
  },
};
