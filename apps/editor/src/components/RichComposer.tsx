import React, { useState, useEffect, useRef } from "react";

export interface MentionItem {
  id: string;
  label: string;
  type: "file" | "symbol" | "folder" | "git";
  detail?: string;
}

interface RichComposerProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  openTabs?: Array<{ filePath: string }>;
  disabled?: boolean;
}

export function RichComposer({ value, onChange, onSubmit, openTabs = [], disabled }: RichComposerProps) {
  const [mentions, setMentions] = useState<MentionItem[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [popupFilter, setPopupFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Available mention suggestions
  const defaultSuggestions: MentionItem[] = [
    ...openTabs.map((tab) => {
      const name = tab.filePath.split("/").pop() || tab.filePath;
      return { id: tab.filePath, label: `@${name}`, type: "file" as const, detail: tab.filePath };
    }),
    { id: "git-status", label: "@git-status", type: "git", detail: "Current working tree diff & status" },
    { id: "terminal-history", label: "@terminal", type: "symbol", detail: "Recent terminal execution log" },
    { id: "diagnostics", label: "@problems", type: "symbol", detail: "Active workspace linter errors & warnings" }
  ];

  const filteredSuggestions = defaultSuggestions.filter((item) =>
    item.label.toLowerCase().includes(popupFilter.toLowerCase())
  );

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onChange(text);

    // Detect @ trigger
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = text.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([\w./-]*)$/);

    if (atMatch) {
      setShowPopup(true);
      setPopupFilter(atMatch[1]!);
      setSelectedIndex(0);
    } else {
      setShowPopup(false);
    }
  };

  const handleSelectMention = (item: MentionItem) => {
    if (!mentions.some((m) => m.id === item.id)) {
      setMentions([...mentions, item]);
    }
    // Remove the typed @filter text from input
    const textBeforeCursor = value.slice(0, inputRef.current?.selectionStart || value.length);
    const cleanBefore = textBeforeCursor.replace(/@([\w./-]*)$/, "");
    onChange(cleanBefore);
    setShowPopup(false);
    inputRef.current?.focus();
  };

  const handleRemoveMention = (id: string) => {
    setMentions(mentions.filter((m) => m.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showPopup) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredSuggestions.length));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredSuggestions.length) % Math.max(1, filteredSuggestions.length));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (filteredSuggestions[selectedIndex]) {
          handleSelectMention(filteredSuggestions[selectedIndex]);
        }
        return;
      }
      if (e.key === "Escape") {
        setShowPopup(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div style={styles.container}>
      {/* Context Mentions Bar */}
      {mentions.length > 0 && (
        <div style={styles.mentionsRow}>
          {mentions.map((m) => (
            <span key={m.id} style={styles.pill}>
              <span style={styles.pillType}>{m.type}</span>
              <span style={styles.pillLabel}>{m.label}</span>
              <button style={styles.pillClose} onClick={() => handleRemoveMention(m.id)}>
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div style={{ position: "relative" }}>
        <textarea
          ref={inputRef}
          value={value}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask AI, typing '@' to attach context files or symbols..."
          disabled={disabled}
          style={styles.textarea}
        />

        {/* Autocomplete Mention Popup */}
        {showPopup && (
          <div style={styles.popup}>
            {filteredSuggestions.length === 0 ? (
              <div style={styles.popupEmpty}>No context matches</div>
            ) : (
              filteredSuggestions.map((item, idx) => (
                <div
                  key={item.id}
                  style={{
                    ...styles.popupItem,
                    backgroundColor: idx === selectedIndex ? "var(--bg-hover-strong, rgba(255,255,255,0.1))" : "transparent",
                  }}
                  onClick={() => handleSelectMention(item)}
                >
                  <span style={styles.itemBadge}>{item.type}</span>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={styles.itemTitle}>{item.label}</span>
                    {item.detail && <span style={styles.itemDetail}>{item.detail}</span>}
                  </div>
                </div>
              ))
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
    gap: "6px",
    width: "100%",
  },
  mentionsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    paddingBottom: "4px",
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "var(--bg-panel, #18181b)",
    border: "1px solid var(--accent, #38bdf8)",
    borderRadius: "12px",
    padding: "2px 8px",
    fontSize: "11px",
    color: "var(--text-main, #fafafa)",
  },
  pillType: {
    color: "var(--accent, #38bdf8)",
    fontWeight: 700,
    fontSize: "9px",
    textTransform: "uppercase",
  },
  pillLabel: {
    fontWeight: 500,
  },
  pillClose: {
    background: "none",
    border: "none",
    color: "var(--text-muted, #a1a1aa)",
    cursor: "pointer",
    padding: "0 2px",
    fontSize: "12px",
  },
  textarea: {
    width: "100%",
    minHeight: "40px",
    maxHeight: "140px",
    backgroundColor: "transparent",
    border: "none",
    color: "var(--text-main, #fafafa)",
    fontSize: "13px",
    resize: "none",
    fontFamily: "inherit",
    outline: "none",
    lineHeight: 1.5,
  },
  popup: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    right: 0,
    marginBottom: "8px",
    backgroundColor: "var(--bg-glass-strong, rgba(14,14,18,0.95))",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid var(--border-strong, #27272a)",
    borderRadius: "8px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
    maxHeight: "180px",
    overflowY: "auto",
    zIndex: 100,
    padding: "4px",
  },
  popupItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 8px",
    borderRadius: "4px",
    cursor: "pointer",
  },
  popupEmpty: {
    padding: "8px",
    fontSize: "11px",
    color: "var(--text-muted, #71717a)",
    textAlign: "center",
  },
  itemBadge: {
    fontSize: "9px",
    fontWeight: 700,
    textTransform: "uppercase",
    padding: "2px 4px",
    borderRadius: "3px",
    backgroundColor: "var(--accent-glow, rgba(56,189,248,0.15))",
    color: "var(--accent, #38bdf8)",
  },
  itemTitle: {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-main, #fafafa)",
  },
  itemDetail: {
    fontSize: "10px",
    color: "var(--text-faint, #71717a)",
  },
};
