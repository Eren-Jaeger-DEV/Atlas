import { useState, useEffect } from "react";

import type { CommandService, CommandDescriptor } from "@atlas/core";

interface CommandPaletteProps {
  commandService: CommandService;
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ commandService, isOpen, onClose }: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const commands = commandService.getCommands();
  const filtered = commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(search.toLowerCase()) ||
      (cmd.category && cmd.category.toLowerCase().includes(search.toLowerCase()))
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
        commandService.executeCommand(target.id).catch(console.error);
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
                  commandService.executeCommand(cmd.id).catch(console.error);
                  onClose();
                }}
              >
                {cmd.category && <span style={styles.category}>{cmd.category}</span>}
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
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(4px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingTop: "80px",
    zIndex: 9999,
  },
  modal: {
    width: "560px",
    backgroundColor: "#0d0d10",
    border: "1px solid #27272a",
    borderRadius: "10px",
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8)",
    overflow: "hidden",
  },
  input: {
    width: "100%",
    padding: "14px 18px",
    backgroundColor: "#09090b",
    border: "none",
    borderBottom: "1px solid #27272a",
    color: "#fafafa",
    fontSize: "14px",
    outline: "none",
    fontFamily: "inherit",
  },
  list: {
    maxHeight: "320px",
    overflowY: "auto",
    padding: "6px",
  },
  item: {
    display: "flex",
    alignItems: "center",
    padding: "10px 14px",
    cursor: "pointer",
    fontSize: "13px",
    color: "#a1a1aa",
    borderRadius: "6px",
  },
  itemSelected: {
    backgroundColor: "#18181b",
    color: "#fafafa",
  },
  category: {
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase",
    color: "#71717a",
    width: "90px",
  },
  label: {
    flex: 1,
  },
  shortcut: {
    fontSize: "11px",
    color: "#71717a",
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  noMatch: {
    padding: "20px",
    textAlign: "center",
    color: "#71717a",
    fontSize: "13px",
  },
};
