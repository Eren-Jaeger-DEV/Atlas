import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

interface TerminalPanelProps {
  repoPath?: string;
  addTrigger?: number;
}

interface TermTab {
  id: string;
  name: string;
  shell: string;
}

export function TerminalPanel({ repoPath, addTrigger }: TerminalPanelProps) {
  const isWin = typeof navigator !== "undefined" && navigator.userAgent.includes("Win");
  const defaultShell = isWin ? "powershell" : "bash";

  const [tabs, setTabs] = useState<TermTab[]>([
    { id: "term-1", name: "Terminal 1", shell: defaultShell }
  ]);
  const [activeTabId, setActiveTabId] = useState("term-1");
  const [shellType] = useState(defaultShell);

  const containerRef = useRef<HTMLDivElement>(null);
  const termMapRef = useRef<Map<string, { term: Terminal; fit: FitAddon }>>(new Map());
  const unsubMapRef = useRef<Map<string, () => void>>(new Map());

  const handleAddTab = () => {
    const newId = `term-${Date.now()}`;
    const newTab: TermTab = {
      id: newId,
      name: `Terminal ${tabs.length + 1}`,
      shell: shellType
    };
    setTabs(p => [...p, newTab]);
    setActiveTabId(newId);
  };

  const prevTriggerRef = useRef(addTrigger);
  useEffect(() => {
    if (addTrigger !== undefined && addTrigger !== prevTriggerRef.current) {
      prevTriggerRef.current = addTrigger;
      handleAddTab();
    }
  }, [addTrigger]);

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length <= 1) return;
    const unsub = unsubMapRef.current.get(id);
    if (unsub) {
      unsub();
      unsubMapRef.current.delete(id);
    }
    const item = termMapRef.current.get(id);
    if (item) {
      item.term.dispose();
      termMapRef.current.delete(id);
    }
    setTabs(p => p.filter(t => t.id !== id));
    if (activeTabId === id) {
      const rem = tabs.filter(t => t.id !== id);
      setActiveTabId(rem[rem.length - 1]?.id ?? "");
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const api = window.atlasAPI;

    // Ensure active tab terminal is created and attached
    tabs.forEach(tab => {
      if (!termMapRef.current.has(tab.id)) {
        const term = new Terminal({
          cursorBlink: true,
          fontSize: 13,
          fontFamily: "'JetBrains Mono', Consolas, monospace",
          theme: {
            background: "#000000",
            foreground: "#fafafa",
            cursor: "#fafafa",
            selectionBackground: "#27272a",
            black: "#18181b",
            red: "#f87171",
            green: "#4ade80",
            yellow: "#facc15",
            blue: "#60a5fa",
            magenta: "#c084fc",
            cyan: "#38bdf8",
            white: "#f4f4f5",
          },
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        // Mount div container for this terminal
        const div = document.createElement("div");
        div.style.width = "100%";
        div.style.height = "100%";
        div.style.display = tab.id === activeTabId ? "block" : "none";
        div.id = `canvas-${tab.id}`;
        containerRef.current?.appendChild(div);

        term.open(div);
        fitAddon.fit();

        termMapRef.current.set(tab.id, { term, fit: fitAddon });

        if (api) {
          const unsub = api.onTerminalData((payload: { termId: string; data: string }) => {
            if (payload.termId === tab.id) term.write(payload.data);
          });
          if (typeof unsub === "function") {
            unsubMapRef.current.set(tab.id, unsub);
          }

          api.terminalCreate(tab.id, repoPath).then(() => {
            term.onData((data: string) => api.terminalInput(tab.id, data));
            if (term.cols && term.rows && api.terminalResize) {
              api.terminalResize(tab.id, term.cols, term.rows);
            }
            api.terminalGetHistory(tab.id).then((hist: string) => {
              if (hist) {
                term.write(hist);
              } else {
                api.terminalInput(tab.id, "\r");
              }
            });
          });

          // Copy text automatically when selected
          term.onSelectionChange(() => {
            const sel = term.getSelection();
            if (sel) api.clipboardWriteText(sel);
          });

          // Handle keybinds for paste and explicit copy
          term.attachCustomKeyEventHandler((e) => {
            if (e.type === 'keydown') {
              const isMac = navigator.userAgent.includes('Mac');
              const isPaste = isMac ? (e.metaKey && e.code === 'KeyV') : (e.ctrlKey && e.shiftKey && e.code === 'KeyV');
              
              if (isPaste) {
                api.clipboardReadText().then((text: string) => {
                  if (text) api.terminalInput(tab.id, text);
                });
                return false;
              }

              const isCopy = (isMac ? e.metaKey : e.ctrlKey) && e.code === 'KeyC';
              if (isCopy && term.hasSelection()) {
                api.clipboardWriteText(term.getSelection());
                term.clearSelection();
                return false;
              }
            }
            return true;
          });
        } else {
          term.writeln(`Terminal ${tab.name} (${tab.shell}) ready.`);
        }
      } else {
        // Toggle visibility
        const el = document.getElementById(`canvas-${tab.id}`);
        if (el) el.style.display = tab.id === activeTabId ? "block" : "none";
        if (tab.id === activeTabId) {
          setTimeout(() => {
            try {
              const active = termMapRef.current.get(tab.id);
              if (active) {
                active.fit.fit();
                if (active.term.cols && active.term.rows && api?.terminalResize) {
                  api.terminalResize(tab.id, active.term.cols, active.term.rows);
                }
              }
            } catch {}
          }, 10);
        }
      }
    });
  }, [tabs, activeTabId, repoPath]);

  // Handle ResizeObserver for automatic terminal refitting
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      const active = termMapRef.current.get(activeTabId);
      if (active) {
        try {
          active.fit.fit();
          if (active.term.cols && active.term.rows && window.atlasAPI?.terminalResize) {
            window.atlasAPI.terminalResize(activeTabId, active.term.cols, active.term.rows);
          }
        } catch {}
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [activeTabId]);

  return (
    <div style={styles.container}>
      {/* Terminal Viewport */}
      <div ref={containerRef} style={styles.canvasContainer} />

      {/* Right-hand Sessions Sidebar matching Antigravity Screenshot 2 */}
      <div style={styles.sessionsSidebar}>
        {tabs.map(t => {
          const isActive = t.id === activeTabId;
          return (
            <div
              key={t.id}
              style={{
                ...styles.sessionItem,
                ...(isActive ? styles.sessionItemActive : {})
              }}
              onClick={() => setActiveTabId(t.id)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "16px", height: "16px", border: "1px solid #52525b", borderRadius: "3px",
                  fontSize: "9.5px", fontFamily: "var(--font-mono, monospace)", fontWeight: 700, color: "#e4e4e7"
                }}>
                  &gt;_
                </div>
                <span style={{ fontSize: "12px", fontFamily: "var(--font-mono, monospace)", fontWeight: isActive ? 600 : 400, color: isActive ? "#ffffff" : "#a1a1aa", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {t.shell}
                </span>
              </div>
              {tabs.length > 1 && (
                <span
                  className="hover-scale"
                  style={styles.sessionX}
                  onClick={e => handleCloseTab(t.id, e)}
                  title="Kill Terminal"
                >
                  ✕
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "row",
    height: "100%",
    width: "100%",
    backgroundColor: "#000000",
    color: "#fafafa",
    overflow: "hidden",
  },
  canvasContainer: {
    flex: 1,
    height: "100%",
    padding: "4px 8px",
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#000000",
  },
  sessionsSidebar: {
    width: "120px",
    height: "100%",
    backgroundColor: "#000000",
    borderLeft: "1px solid var(--border-subtle, #27272a)",
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    padding: "4px",
    flexShrink: 0,
    overflowY: "auto",
  },
  sessionItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "3px 6px",
    borderRadius: "2px",
    cursor: "pointer",
    fontSize: "12px",
    color: "#a1a1aa",
    border: "1px dashed transparent",
    transition: "all 0.1s ease",
  },
  sessionItemActive: {
    color: "#ffffff",
    border: "1px dashed #f97316",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  sessionX: {
    fontSize: "10px",
    color: "#71717a",
    padding: "2px",
    borderRadius: "2px",
    cursor: "pointer",
  },
};
