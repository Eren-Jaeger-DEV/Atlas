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
    const api = (window as any).atlasAPI;

    // Ensure active tab terminal is created and attached
    tabs.forEach(tab => {
      if (!termMapRef.current.has(tab.id)) {
        const term = new Terminal({
          cursorBlink: true,
          fontSize: 13,
          fontFamily: "'JetBrains Mono', Consolas, monospace",
          theme: {
            background: "#09090b",
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
          api.terminalCreate(tab.id, repoPath).then(() => {
            term.onData((data: string) => api.terminalInput(tab.id, data));
          });
          api.onTerminalData((payload: { termId: string; data: string }) => {
            if (payload.termId === tab.id) term.write(payload.data);
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
          termMapRef.current.get(tab.id)?.fit.fit();
        }
      }
    });
  }, [tabs, activeTabId, repoPath]);

  return (
    <div style={styles.container}>
      {/* Terminal Tab Bar & Shell Selector */}
      <div style={styles.header}>
        <div style={styles.tabGroup}>
          {tabs.map(t => (
            <div
              key={t.id}
              style={{ ...styles.tab, ...(t.id === activeTabId ? styles.tabOn : {}) }}
              onClick={() => setActiveTabId(t.id)}
            >
              <span>{t.name}</span>
              {tabs.length > 1 && (
                <span style={styles.tabX} onClick={e => handleCloseTab(t.id, e)}>✕</span>
              )}
            </div>
          ))}
          <button style={styles.addBtn} title="New Terminal Tab" onClick={handleAddTab}>+</button>
        </div>

        <div style={styles.rightGroup}>
          <select
            style={styles.select}
            value={shellType}
            onChange={e => setShellType(e.target.value)}
          >
            <option value="powershell">PowerShell</option>
            <option value="cmd">Command Prompt</option>
            <option value="bash">Git Bash</option>
          </select>
          <span style={styles.subtext}>{repoPath ?? "No workspace"}</span>
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
    backgroundColor: "#09090b",
    color: "#fafafa",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 8px",
    backgroundColor: "#0d0d10",
    borderBottom: "1px solid #27272a",
    fontSize: "11px",
    height: "28px",
  },
  tabGroup: {
    display: "flex",
    alignItems: "center",
    gap: "2px",
    height: "100%",
  },
  tab: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "0 10px",
    height: "100%",
    color: "#71717a",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: 600,
    borderBottom: "2px solid transparent",
  },
  tabOn: {
    color: "#fafafa",
    borderBottom: "2px solid #fafafa",
    backgroundColor: "#141417",
  },
  tabX: {
    fontSize: "10px",
    opacity: 0.5,
  },
  addBtn: {
    background: "none",
    border: "none",
    color: "#71717a",
    fontSize: "14px",
    cursor: "pointer",
    padding: "0 6px",
  },
  rightGroup: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  select: {
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    color: "#fafafa",
    fontSize: "11px",
    borderRadius: "3px",
    padding: "1px 4px",
    outline: "none",
  },
  subtext: {
    color: "#71717a",
    fontSize: "10px",
  },
  canvasContainer: {
    flex: 1,
    padding: "4px 8px",
    overflow: "hidden",
    position: "relative",
  },
};
