import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CommandItem {
  id: string;
  title: string;
  category?: string;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands?: CommandItem[];
  commandService?: any;
  openFiles?: string[];
  onSelectFile?: (filePath: string) => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  commands = [],
  commandService,
  openFiles = [],
  onSelectFile,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Render state check is handled by AnimatePresence below

  let activeCommands: CommandItem[] = [...commands];
  if (commandService && typeof commandService.getCommands === "function") {
    const registered = commandService.getCommands();
    if (Array.isArray(registered)) {
      activeCommands = [
        ...activeCommands,
        ...registered.map((c: any) => ({
          id: c.id || c.title,
          title: c.title || c.label || c.id,
          category: c.category || "Editor",
          action: () => {
            if (typeof c.action === "function") c.action();
            else if (typeof commandService.executeCommand === "function") commandService.executeCommand(c.id);
            onClose();
          }
        }))
      ];
    }
  }

  const isFileSearch = query.startsWith(">") === false;
  const searchTerm = query.startsWith(">") ? query.slice(1).trim().toLowerCase() : query.trim().toLowerCase();

  const filteredCommands: CommandItem[] = isFileSearch
    ? openFiles
        .filter((f) => f.toLowerCase().includes(searchTerm))
        .map((f) => ({
          id: f,
          title: f.split("/").pop() || f,
          category: f,
          action: () => {
            onSelectFile?.(f);
            onClose();
          },
        }))
    : activeCommands.filter(
        (c) =>
          c.title.toLowerCase().includes(searchTerm) ||
          (c.category && c.category.toLowerCase().includes(searchTerm))
      );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={styles.backdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={styles.modal}
          >
            <div style={styles.inputContainer}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" style={{ marginRight: 10 }}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                style={styles.input}
                placeholder="Type a command or '>' for actions (e.g. '> Format', '> Build')..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
              />
              <span style={styles.badge}>{isFileSearch ? "Files" : "Commands"}</span>
            </div>

            <div style={styles.list}>
              {filteredCommands.length === 0 ? (
                <div style={styles.emptyState}>No matching results found</div>
              ) : (
                filteredCommands.map((cmd, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={cmd.id}
                      style={{
                        ...styles.item,
                        backgroundColor: isSelected ? "var(--bg-hover-strong)" : "transparent",
                        borderLeft: isSelected ? "3px solid var(--accent)" : "3px solid transparent",
                      }}
                      onClick={() => cmd.action()}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <div style={styles.itemMain}>
                        <span style={styles.itemTitle}>{cmd.title}</span>
                        {cmd.category && <span style={styles.itemCategory}>{cmd.category}</span>}
                      </div>
                      {cmd.shortcut && <span style={styles.shortcut}>{cmd.shortcut}</span>}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    zIndex: 99999,
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingTop: "12vh",
    fontFamily: "var(--font-ui)",
  },
  modal: {
    backgroundColor: "var(--bg-glass-strong)",
    backdropFilter: "blur(24px) saturate(1.5)",
    WebkitBackdropFilter: "blur(24px) saturate(1.5)",
    width: "600px",
    maxWidth: "90vw",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-lg), var(--shadow-panel)",
    border: "1px solid var(--border-strong)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  inputContainer: {
    display: "flex",
    alignItems: "center",
    padding: "16px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    backgroundColor: "transparent",
  },
  input: {
    flex: 1,
    background: "none",
    border: "none",
    color: "var(--text-main)",
    fontSize: "15px",
    outline: "none",
    fontFamily: "inherit",
  },
  badge: {
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "var(--accent)",
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    padding: "2px 8px",
    borderRadius: "4px",
    border: "1px solid rgba(56, 189, 248, 0.25)",
  },
  list: {
    overflowY: "auto",
    maxHeight: "340px",
    padding: "8px",
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.1s ease",
  },
  itemMain: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  itemTitle: {
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--text-main)",
  },
  itemCategory: {
    fontSize: "11px",
    color: "var(--text-faint)",
  },
  shortcut: {
    fontSize: "11px",
    fontFamily: "var(--font-mono, monospace)",
    color: "var(--text-muted)",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: "3px 6px",
    borderRadius: "4px",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  emptyState: {
    padding: "32px",
    textAlign: "center",
    fontSize: "13px",
    color: "var(--text-muted)",
  },
};
