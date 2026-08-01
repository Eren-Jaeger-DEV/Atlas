import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DEFAULT_KEYBINDINGS, KeybindingDef } from "./KeybindingsPanel.js";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = DEFAULT_KEYBINDINGS.filter(kb =>
    kb.name.toLowerCase().includes(search.toLowerCase()) ||
    kb.defaultKey.toLowerCase().includes(search.toLowerCase()) ||
    kb.category.toLowerCase().includes(search.toLowerCase())
  );

  const categories = Array.from(new Set(filtered.map(kb => kb.category)));

  return (
    <AnimatePresence>
      <div style={s.overlay} onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15 }}
          style={s.modal}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={s.header}>
            <div style={s.titleWrap}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 16h8" />
              </svg>
              <h3 style={s.title}>Keyboard Shortcuts Cheat Sheet</h3>
              <span style={s.badge}>Ctrl+/</span>
            </div>
            <button style={s.closeBtn} onClick={onClose} title="Close (Esc)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Search Bar */}
          <div style={s.searchWrap}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search shortcuts by name, key or category..."
              style={s.searchInput}
            />
            {search && (
              <button style={s.clearSearch} onClick={() => setSearch("")}>
                Clear
              </button>
            )}
          </div>

          {/* Content Body */}
          <div style={s.body}>
            {categories.length === 0 ? (
              <div style={s.empty}>No shortcuts matching "{search}"</div>
            ) : (
              categories.map(cat => {
                const items = filtered.filter(kb => kb.category === cat);
                return (
                  <div key={cat} style={s.categoryBlock}>
                    <div style={s.categoryTitle}>{cat}</div>
                    <div style={s.grid}>
                      {items.map(item => (
                        <div key={item.id} style={s.row}>
                          <span style={s.name}>{item.name}</span>
                          <div style={s.keysWrap}>
                            {item.defaultKey.split(" ").map((kCombo, ci) => (
                              <React.Fragment key={ci}>
                                {ci > 0 && <span style={s.thenText}>then</span>}
                                <span style={s.keyCap}>{kCombo}</span>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div style={s.footer}>
            <span style={s.footerHint}>
              Tip: Press <kbd style={s.kbdInline}>Ctrl+K</kbd> <kbd style={s.kbdInline}>Ctrl+S</kbd> to customize keybindings in Settings.
            </span>
            <button style={s.gotItBtn} onClick={onClose}>
              Got it
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    backdropFilter: "blur(8px)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  modal: {
    width: "100%",
    maxWidth: "680px",
    maxHeight: "80vh",
    backgroundColor: "#09090b",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "12px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  },
  titleWrap: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  title: {
    margin: 0,
    fontSize: "15px",
    fontWeight: 600,
    color: "#f4f4f5",
    letterSpacing: "-0.2px",
  },
  badge: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    color: "#38bdf8",
    fontSize: "11px",
    fontWeight: 600,
    padding: "2px 7px",
    borderRadius: "4px",
    fontFamily: "'JetBrains Mono', monospace",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#71717a",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
  },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    margin: "14px 20px 0 20px",
    padding: "8px 12px",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "8px",
  },
  searchInput: {
    flex: 1,
    background: "none",
    border: "none",
    outline: "none",
    color: "#f4f4f5",
    fontSize: "13px",
  },
  clearSearch: {
    background: "none",
    border: "none",
    color: "#71717a",
    fontSize: "11px",
    cursor: "pointer",
  },
  body: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  empty: {
    padding: "30px 0",
    textAlign: "center",
    color: "#71717a",
    fontSize: "13px",
    fontStyle: "italic",
  },
  categoryBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  categoryTitle: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#71717a",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
  },
  grid: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "7px 10px",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: "6px",
    border: "1px solid rgba(255, 255, 255, 0.03)",
  },
  name: {
    fontSize: "13px",
    color: "#d4d4d8",
  },
  keysWrap: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  keyCap: {
    backgroundColor: "#18181b",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    boxShadow: "0 2px 0 rgba(0, 0, 0, 0.4)",
    borderRadius: "4px",
    color: "#f4f4f5",
    fontSize: "11px",
    fontWeight: 600,
    padding: "3px 7px",
    fontFamily: "'JetBrains Mono', Consolas, monospace",
  },
  thenText: {
    fontSize: "11px",
    color: "#71717a",
    fontStyle: "italic",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 20px",
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  footerHint: {
    fontSize: "12px",
    color: "#71717a",
  },
  kbdInline: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "3px",
    padding: "1px 5px",
    fontSize: "10px",
    color: "#a1a1aa",
    fontFamily: "'JetBrains Mono', monospace",
  },
  gotItBtn: {
    backgroundColor: "#38bdf8",
    color: "#09090b",
    border: "none",
    borderRadius: "6px",
    padding: "6px 14px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
};
