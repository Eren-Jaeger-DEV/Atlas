import { useState, useEffect } from "react";

export interface CommandItem {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  commands: CommandItem[];
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ commands, isOpen, onClose }: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(search.toLowerCase()) ||
      cmd.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = filtered[selectedIndex];
      if (target) {
        target.action();
        onClose();
      }
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          style={styles.input}
          placeholder="Type a command or search..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
        />
        <div style={styles.list}>
          {filtered.length === 0 ? (
            <div style={styles.noMatch}>No matching commands</div>
          ) : (
            filtered.map((cmd, idx) => (
              <div
                key={cmd.id}
                style={{
                  ...styles.item,
                  ...(idx === selectedIndex ? styles.itemSelected : {}),
                }}
                onClick={() => {
                  cmd.action();
                  onClose();
                }}
              >
                <span style={styles.category}>{cmd.category}</span>
                <span style={styles.label}>{cmd.label}</span>
                {cmd.shortcut && <span style={styles.shortcut}>{cmd.shortcut}</span>}
              </div>
            ))
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
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingTop: "80px",
    zIndex: 9999,
  },
  modal: {
    width: "550px",
    backgroundColor: "#16161e",
    border: "1px solid #292e42",
    borderRadius: "8px",
    boxShadow: "0 12px 32px rgba(0, 0, 0, 0.5)",
    overflow: "hidden",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    backgroundColor: "#1f2335",
    border: "none",
    borderBottom: "1px solid #292e42",
    color: "#c0caf5",
    fontSize: "14px",
    outline: "none",
  },
  list: {
    maxHeight: "320px",
    overflowY: "auto",
  },
  item: {
    display: "flex",
    alignItems: "center",
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: "13px",
    color: "#a9b1d6",
  },
  itemSelected: {
    backgroundColor: "#292e42",
    color: "#7aa2f7",
  },
  category: {
    fontSize: "10px",
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#565f89",
    width: "90px",
  },
  label: {
    flex: 1,
  },
  shortcut: {
    fontSize: "11px",
    color: "#565f89",
    backgroundColor: "#1f2335",
    padding: "2px 6px",
    borderRadius: "3px",
  },
  noMatch: {
    padding: "16px",
    textAlign: "center",
    color: "#565f89",
    fontSize: "13px",
  },
};
