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
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("atlas_recent_commands");
      if (stored) setRecentIds(JSON.parse(stored));
    } catch (err) {
      console.warn("[WARN] Failed to parse atlas_recent_commands from localStorage:", err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const saveRecent = (id: string) => {
    setRecentIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, 5);
      localStorage.setItem("atlas_recent_commands", JSON.stringify(next));
      return next;
    });
  };

  if (!isOpen) return null;

  const commands = commandService.getCommands();

  // Fuzzy match logic
  const fuzzyMatch = (str: string, query: string) => {
    if (!query) return { isMatch: true, indices: [] };
    const strLower = str.toLowerCase();
    const queryLower = query.toLowerCase();
    let i = 0, j = 0;
    const indices = [];
    while (i < strLower.length && j < queryLower.length) {
      if (strLower[i] === queryLower[j]) {
        indices.push(i);
        j++;
      }
      i++;
    }
    return { isMatch: j === queryLower.length, indices };
  };

  const renderHighlighted = (text: string, indices: number[]) => {
    if (indices.length === 0) return <span>{text}</span>;
    return (
      <span>
        {text.split("").map((char, idx) =>
          indices.includes(idx) ? (
            <span key={idx} style={{ color: "#38bdf8", fontWeight: 700 }}>{char}</span>
          ) : (
            <span key={idx}>{char}</span>
          )
        )}
      </span>
    );
  };

  let displayCommands: Array<{ cmd: CommandDescriptor; indices: number[]; isRecent?: boolean }> = [];

  if (search === "") {
    const recent = recentIds.map(id => commands.find(c => c.id === id)).filter(Boolean) as CommandDescriptor[];
    const others = commands.filter(c => !recentIds.includes(c.id));
    displayCommands = [
      ...recent.map(cmd => ({ cmd, indices: [], isRecent: true })),
      ...others.map(cmd => ({ cmd, indices: [] }))
    ];
  } else {
    for (const cmd of commands) {
      const matchLabel = fuzzyMatch(cmd.label, search);
      const matchCat = cmd.category ? fuzzyMatch(cmd.category, search) : { isMatch: false, indices: [] };
      if (matchLabel.isMatch || matchCat.isMatch) {
        displayCommands.push({ cmd, indices: matchLabel.isMatch ? matchLabel.indices : [] });
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, displayCommands.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + displayCommands.length) % Math.max(1, displayCommands.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = displayCommands[selectedIndex];
      if (target) {
        saveRecent(target.cmd.id);
        commandService.executeCommand(target.cmd.id).catch(console.error);
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
          {displayCommands.length === 0 ? (
            <div style={styles.noMatch}>No matching commands</div>
          ) : (
            displayCommands.map((item, idx) => {
              const showRecentHeader = idx === 0 && search === "" && item.isRecent;
              const showOtherHeader = search === "" && !item.isRecent && (idx === 0 || displayCommands[idx - 1]?.isRecent);
              
              return (
                <div key={item.cmd.id}>
                  {showRecentHeader && <div style={styles.groupHeader}>Recently Used</div>}
                  {showOtherHeader && <div style={styles.groupHeader}>All Commands</div>}
                  <div
                    style={{
                      ...styles.item,
                      ...(idx === selectedIndex ? styles.itemSelected : {}),
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => {
                      saveRecent(item.cmd.id);
                      commandService.executeCommand(item.cmd.id).catch(console.error);
                      onClose();
                    }}
                  >
                    {item.cmd.category && <span style={styles.category}>{item.cmd.category}</span>}
                    <span style={styles.label}>{renderHighlighted(item.cmd.label, item.indices)}</span>
                    {item.cmd.shortcut && <span style={styles.shortcut}>{item.cmd.shortcut}</span>}
                  </div>
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
    backgroundColor: "#050505",
    border: "1px solid #38bdf8",
    borderRadius: "10px",
    boxShadow: "0 25px 65px rgba(0, 0, 0, 0.7)",
    overflow: "hidden",
  },
  input: {
    width: "100%",
    padding: "16px 20px",
    backgroundColor: "#000000",
    border: "none",
    borderBottom: "1px solid #38bdf8",
    color: "#fafafa",
    fontSize: "14px",
    outline: "none",
    fontFamily: "inherit",
  },
  list: {
    maxHeight: "360px",
    overflowY: "auto",
    padding: "8px",
  },
  groupHeader: {
    padding: "6px 14px",
    fontSize: "10px",
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  item: {
    display: "flex",
    alignItems: "center",
    padding: "10px 14px",
    cursor: "pointer",
    fontSize: "13px",
    color: "#94a3b8",
    borderRadius: "6px",
    transition: "background-color 0.1s",
  },
  itemSelected: {
    backgroundColor: "#38bdf820",
    color: "#e4e4e7",
  },
  category: {
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase",
    color: "#64748b",
    width: "100px",
  },
  label: {
    flex: 1,
  },
  shortcut: {
    fontSize: "11px",
    color: "#94a3b8",
    backgroundColor: "#000000",
    border: "1px solid #38bdf8",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  noMatch: {
    padding: "20px",
    textAlign: "center",
    color: "#64748b",
    fontSize: "13px",
  },
};
