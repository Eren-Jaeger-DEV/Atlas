import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

interface TerminalPanelProps {
  repoPath?: string;
}

interface TermTab {
  id: string;
  name: string;
  shell: string;
}

export function TerminalPanel({ repoPath }: TerminalPanelProps) {
  const [tabs, setTabs] = useState<TermTab[]>([
    { id: "term-1", name: "Terminal 1", shell: "powershell" }
  ]);
  const [activeTabId, setActiveTabId] = useState("term-1");
  const [shellType, setShellType] = useState("powershell");

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
            background: "var(--bg-base, #09090b)",
            foreground: "var(--text-main, #fafafa)",
            cursor: "var(--text-main, #fafafa)",
            selectionBackground: "var(--border-color, #27272a)",
            black: "var(--bg-header, #18181b)",
            red: "#f87171",
            green: "#4ade80",
            yellow: "#facc15",
            blue: "#60a5fa",
            magenta: "#c084fc",
            cyan: "var(--accent, #38bdf8)",
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
          api.terminalCreate(tab.id, repoPath).then(() => {
            term.onData((data: string) => api.terminalInput(tab.id, data));
          });
          const unsub = api.onTerminalData((payload: { termId: string; data: string }) => {
            if (payload.termId === tab.id) term.write(payload.data);
          });
          if (typeof unsub === "function") {
            unsubMapRef.current.set(tab.id, unsub);
          }

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
          termMapRef.current.get(tab.id)?.fit.fit();
        }
      }
    });
  }, [tabs, activeTabId, repoPath]);

  return (
    <div style={styles.container}>
      {/* Terminal Viewport */}
      <div ref={containerRef} style={styles.canvasContainer} />

      {/* Right-hand Sessions Sidebar matching Antigravity Screenshot 1 */}
      <div style={styles.sessionsSidebar}>
        <div style={styles.sessionsList}>
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
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isActive ? "#f97316" : "#a1a1aa"} strokeWidth="2.5">
                    <polyline points="4 17 10 11 4 5" />
                    <line x1="12" y1="19" x2="20" y2="19" />
                  </svg>
                  <span style={{ fontSize: "11px", fontWeight: isActive ? 600 : 400, color: isActive ? "#fafafa" : "#a1a1aa", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {t.shell === "powershell" ? "powershell" : t.shell === "cmd" ? "cmd" : "bash"}
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
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "row",
    height: "100%",
    width: "100%",
    backgroundColor: "var(--bg-base, #09090b)",
    color: "var(--text-main)",
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
    width: "135px",
    height: "100%",
    backgroundColor: "var(--bg-panel, #09090b)",
    borderLeft: "1px solid var(--border-subtle, #27272a)",
    display: "flex",
    flexDirection: "column",
    padding: "4px",
    flexShrink: 0,
    overflowY: "auto",
  },
  sessionsList: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  sessionItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "4px 8px",
    borderRadius: "3px",
    cursor: "pointer",
    fontSize: "11px",
    color: "var(--text-muted, #a1a1aa)",
    border: "1px solid transparent",
    transition: "all 0.1s ease",
  },
  sessionItemActive: {
    color: "#fafafa",
    backgroundColor: "rgba(249, 115, 22, 0.08)",
    border: "1px solid #f97316",
  },
  sessionX: {
    fontSize: "10px",
    color: "#71717a",
    padding: "2px",
    borderRadius: "2px",
    cursor: "pointer",
  },
};
