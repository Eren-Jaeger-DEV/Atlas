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
      <div style={styles.header}>
        <div style={styles.tabGroup}>
          {tabs.map(t => (
            <div
              key={t.id}
              className="editor-tab anim-slide-right"
              style={{ ...styles.tab, ...(t.id === activeTabId ? styles.tabOn : {}) }}
              onClick={() => setActiveTabId(t.id)}
            >
              <span>{t.name}</span>
              {tabs.length > 1 && (
                <span
                  className="tab-close-btn"
                  style={styles.tabX}
                  onClick={e => handleCloseTab(t.id, e)}
                  title="Close Terminal"
                >
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/>
                  </svg>
                </span>
              )}
            </div>
          ))}
          <button className="hover-scale sidebar-action-btn" style={styles.addBtn} title="New Terminal Tab" onClick={handleAddTab}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        <div style={styles.rightGroup}>
          <select
            className="hover-scale"
            style={styles.select}
            value={shellType}
            onChange={e => setShellType(e.target.value)}
          >
            <option value="powershell">PowerShell</option>
            <option value="cmd">Command Prompt</option>
            <option value="bash">Git Bash</option>
          </select>
          <span style={styles.subtext}>{repoPath ? repoPath.split(/[/\\]/).pop() : "No workspace"}</span>
        </div>
      </div>

      <div ref={containerRef} style={styles.canvasContainer} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "transparent",
    color: "var(--text-main)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 8px 0 0",
    backgroundColor: "transparent",
    borderBottom: "1px solid var(--border-subtle)",
    fontSize: "11px",
    height: "28px",
    flexShrink: 0,
  },
  tabGroup: {
    display: "flex",
    alignItems: "center",
    height: "100%",
  },
  tab: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "0 10px",
    height: "100%",
    color: "var(--text-muted)",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: 500,
    borderBottom: "2px solid transparent",
    borderRight: "1px solid var(--border-subtle)",
    transition: "color 0.15s, background-color 0.15s",
  },
  tabOn: {
    color: "var(--text-main)",
    borderBottom: "2px solid var(--accent)",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  tabX: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2px",
    borderRadius: "3px",
    color: "var(--text-faint)",
    transition: "color 0.15s, background-color 0.15s",
  },
  addBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "4px 8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  rightGroup: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  select: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-main)",
    fontSize: "11px",
    borderRadius: "4px",
    padding: "2px 6px",
    outline: "none",
    cursor: "pointer",
    transition: "border-color 0.15s",
  },
  subtext: {
    color: "var(--text-faint)",
    fontSize: "10px",
    fontWeight: 500,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },
  canvasContainer: {
    flex: 1,
    padding: "8px 10px 4px 10px",
    overflow: "hidden",
    position: "relative",
  },
};
