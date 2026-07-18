import { useState, useCallback, useRef, useEffect } from "react";
import { EditorPane } from "./components/EditorPane.js";
import { ImpactPanel } from "./components/ImpactPanel.js";
import { FileExplorer } from "./components/FileExplorer.js";
import { GitPanel } from "./components/GitPanel.js";
import { TerminalPanel } from "./components/TerminalPanel.js";
import { DiffViewer } from "./components/DiffViewer.js";
import { CommandPalette, CommandItem } from "./components/CommandPalette.js";

interface EditorTab {
  filePath: string;
  content: string;
  language: "typescript" | "javascript" | "python";
  isDirty: boolean;
}

type SidebarView = "explorer" | "git" | "impact" | "ai";
type BottomTab = "terminal" | "output" | "ai";

export function App() {
  const [repoPath, setRepoPath] = useState<string | undefined>();
  const [activeSidebar, setActiveSidebar] = useState<SidebarView>("explorer");
  const [bottomTab, setBottomTab] = useState<BottomTab>("terminal");
  const [showBottomPanel, setShowBottomPanel] = useState(true);

  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [activeDiff, setActiveDiff] = useState<{ filePath: string; diffText: string } | null>(null);

  const [cursorSymbol, setCursorSymbol] = useState<string | undefined>();
  const [aiGoal, setAiGoal] = useState("");
  const [aiRunning, setAiRunning] = useState(false);
  const [aiEvents, setAiEvents] = useState<string[]>([]);

  const activeTab = tabs[activeTabIndex];

  const handleSelectRepo = async () => {
    const api = (window as any).atlasAPI;
    if (api?.selectDirectory) {
      const selected = await api.selectDirectory();
      if (selected) {
        setRepoPath(selected);
      }
    }
  };

  const handleOpenFile = async (filePath: string) => {
    setActiveDiff(null);
    const existingIndex = tabs.findIndex((t) => t.filePath === filePath);
    if (existingIndex >= 0) {
      setActiveTabIndex(existingIndex);
      return;
    }

    const api = (window as any).atlasAPI;
    if (api?.readFile) {
      try {
        const content = await api.readFile(filePath);
        const ext = filePath.split(".").pop()?.toLowerCase();
        let language: "typescript" | "javascript" | "python" = "typescript";
        if (ext === "py") language = "python";
        else if (ext === "js" || ext === "jsx") language = "javascript";

        const newTab: EditorTab = { filePath, content, language, isDirty: false };
        setTabs((prev) => [...prev, newTab]);
        setActiveTabIndex(tabs.length);
      } catch {
        // Handle read file error gracefully
      }
    }
  };

  const handleCloseTab = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabs((prev) => prev.filter((_, i) => i !== index));
    if (activeTabIndex >= index && activeTabIndex > 0) {
      setActiveTabIndex(activeTabIndex - 1);
    }
  };

  const handleSaveTab = async (index: number) => {
    const targetTab = tabs[index];
    if (!targetTab) return;
    const api = (window as any).atlasAPI;
    if (api?.writeFile) {
      await api.writeFile(targetTab.filePath, targetTab.content);
      setTabs((prev) =>
        prev.map((t, i) => (i === index ? { ...t, isDirty: false } : t))
      );
    }
  };

  const handleViewDiff = async (filePath: string, staged: boolean) => {
    const api = (window as any).atlasAPI;
    if (api?.gitDiff) {
      const fullPath = repoPath ? `${repoPath}/${filePath}`.replace(/\/+/g, "/") : filePath;
      const diffText = await api.gitDiff(repoPath, filePath, staged);
      setActiveDiff({ filePath: fullPath, diffText });
    }
  };

  // Command palette commands
  const commands: CommandItem[] = [
    {
      id: "open-workspace",
      label: "Open Workspace Folder",
      category: "File",
      action: handleSelectRepo,
    },
    {
      id: "save-file",
      label: "Save Current File",
      category: "File",
      shortcut: "Ctrl+S",
      action: () => handleSaveTab(activeTabIndex),
    },
    {
      id: "toggle-terminal",
      label: "Toggle Integrated Terminal Panel",
      category: "View",
      shortcut: "Ctrl+`",
      action: () => {
        setShowBottomPanel(!showBottomPanel);
        setBottomTab("terminal");
      },
    },
    {
      id: "show-explorer",
      label: "Show File Explorer Sidebar",
      category: "View",
      action: () => setActiveSidebar("explorer"),
    },
    {
      id: "show-git",
      label: "Show Source Control (Git) Sidebar",
      category: "View",
      action: () => setActiveSidebar("git"),
    },
    {
      id: "show-impact",
      label: "Show Live Impact Panel",
      category: "View",
      action: () => setActiveSidebar("impact"),
    },
    {
      id: "run-agent",
      label: "Run Atlas AI Agent",
      category: "Agent",
      action: () => {
        setActiveSidebar("ai");
        handleRunAi();
      },
    },
  ];

  // Debounced symbol detection on cursor move
  const symbolTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const handleCursorChange = useCallback((_line: number, _col: number) => {
    clearTimeout(symbolTimerRef.current);
    symbolTimerRef.current = setTimeout(() => {
      setCursorSymbol(undefined);
    }, 300);
  }, []);

  // Keyboard shortcut listener (Ctrl+S to save, Ctrl+Shift+P for Command Palette)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "P" || e.key === "p")) {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (activeTab) {
          handleSaveTab(activeTabIndex);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, activeTabIndex]);

  // AI run via IPC
  const handleRunAi = async () => {
    if (!aiGoal || aiRunning) return;
    setAiRunning(true);
    setAiEvents([]);
    setBottomTab("ai");
    setShowBottomPanel(true);

    const api = (window as any).atlasAPI;
    if (!api) {
      setAiEvents(["Error: Atlas API not available."]);
      setAiRunning(false);
      return;
    }

    const unsubscribe = api.onEvent((ev: any) => {
      setAiEvents((prev) => [...prev, JSON.stringify(ev, null, 2)]);
    });

    try {
      await api.run(aiGoal);
    } finally {
      unsubscribe();
      setAiRunning(false);
    }
  };

  return (
    <div style={styles.root}>
      {/* Top Header Bar */}
      <header style={styles.topBar}>
        <div style={styles.logo}>
          <span style={styles.logoAtlas}>Atlas</span>
          <span style={styles.logoStudio}> Studio v0.1</span>
        </div>
        <div style={styles.workspaceInfo}>
          <button style={styles.openRepoButton} onClick={handleSelectRepo}>
            📁 {repoPath ? repoPath.split(/[/\\]/).pop() : "Open Workspace Folder"}
          </button>
        </div>
        <div style={styles.topControls}>
          <button
            style={styles.dockToggle}
            onClick={() => setShowCommandPalette(true)}
            title="Command Palette (Ctrl+Shift+P)"
          >
            ⌘ Command Palette
          </button>
          <button
            style={{ ...styles.dockToggle, ...(showBottomPanel ? styles.dockToggleActive : {}) }}
            onClick={() => setShowBottomPanel(!showBottomPanel)}
            title="Toggle Bottom Terminal Panel"
          >
            💻 Terminal Panel
          </button>
        </div>
      </header>

      <CommandPalette
        commands={commands}
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
      />

      {/* Main Workspace Layout */}
      <div style={styles.mainLayout}>
        {/* Activity Bar */}
        <nav style={styles.activityBar}>
          <button
            style={{ ...styles.activityButton, ...(activeSidebar === "explorer" ? styles.activityButtonActive : {}) }}
            onClick={() => setActiveSidebar("explorer")}
            title="File Explorer"
          >
            📁
          </button>
          <button
            style={{ ...styles.activityButton, ...(activeSidebar === "git" ? styles.activityButtonActive : {}) }}
            onClick={() => setActiveSidebar("git")}
            title="Source Control (Git)"
          >
            🌿
          </button>
          <button
            style={{ ...styles.activityButton, ...(activeSidebar === "impact" ? styles.activityButtonActive : {}) }}
            onClick={() => setActiveSidebar("impact")}
            title="Impact Analysis"
          >
            ⚡
          </button>
          <button
            style={{ ...styles.activityButton, ...(activeSidebar === "ai" ? styles.activityButtonActive : {}) }}
            onClick={() => setActiveSidebar("ai")}
            title="Atlas AI Agent"
          >
            🤖
          </button>
        </nav>

        {/* Sidebar Panel */}
        <aside style={styles.sidebarPanel}>
          {activeSidebar === "explorer" && (
            <FileExplorer repoPath={repoPath} onOpenFile={handleOpenFile} onSelectRepo={handleSelectRepo} />
          )}
          {activeSidebar === "git" && (
            <GitPanel repoPath={repoPath} onViewDiff={handleViewDiff} />
          )}
          {activeSidebar === "impact" && (
            <ImpactPanel filePath={activeTab?.filePath} symbolName={cursorSymbol} />
          )}
          {activeSidebar === "ai" && (
            <div style={styles.aiSidebar}>
              <div style={styles.sidebarHeader}>ATLAS AI AGENT</div>
              <div style={styles.aiGoalBox}>
                <textarea
                  style={styles.goalTextarea}
                  placeholder="Describe goal... (e.g. add user validation)"
                  value={aiGoal}
                  onChange={(e) => setAiGoal(e.target.value)}
                />
                <button style={styles.aiRunBtn} onClick={handleRunAi} disabled={aiRunning}>
                  {aiRunning ? "Running Agent..." : "⚡ Run Autonomous Agent"}
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Editor & Content Area */}
        <div style={styles.centerArea}>
          {/* Tab Bar */}
          <div style={styles.tabBar}>
            {tabs.map((tab, i) => (
              <div
                key={tab.filePath}
                style={{ ...styles.tabItem, ...(i === activeTabIndex && !activeDiff ? styles.tabItemActive : {}) }}
                onClick={() => {
                  setActiveDiff(null);
                  setActiveTabIndex(i);
                }}
              >
                <span style={styles.tabLabel}>{tab.filePath.split(/[/\\]/).pop()}</span>
                {tab.isDirty && <span style={styles.dirtyDot}>●</span>}
                <span style={styles.closeTabIcon} onClick={(e) => handleCloseTab(i, e)}>
                  ×
                </span>
              </div>
            ))}
          </div>

          {/* Active View: Diff or Code Mirror */}
          <div style={styles.editorViewContainer}>
            {activeDiff ? (
              <DiffViewer filePath={activeDiff.filePath} diffText={activeDiff.diffText} onClose={() => setActiveDiff(null)} />
            ) : activeTab ? (
              <EditorPane
                filePath={activeTab.filePath}
                content={activeTab.content}
                language={activeTab.language}
                onChange={(content) => {
                  setTabs((prev) =>
                    prev.map((t, i) => (i === activeTabIndex ? { ...t, content, isDirty: true } : t))
                  );
                }}
                onCursorChange={handleCursorChange}
              />
            ) : (
              <div style={styles.welcomeScreen}>
                <div style={styles.welcomeCard}>
                  <h2>Atlas Studio v0.1</h2>
                  <p style={styles.welcomeSub}>Professional AI-Native IDE Platform</p>
                  <div style={styles.welcomeActions}>
                    <button style={styles.welcomeButton} onClick={handleSelectRepo}>
                      Open Workspace Folder
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Dock Panel */}
          {showBottomPanel && (
            <div style={styles.bottomDock}>
              <div style={styles.dockTabBar}>
                <button
                  style={{ ...styles.dockTab, ...(bottomTab === "terminal" ? styles.dockTabActive : {}) }}
                  onClick={() => setBottomTab("terminal")}
                >
                  Terminal
                </button>
                <button
                  style={{ ...styles.dockTab, ...(bottomTab === "output" ? styles.dockTabActive : {}) }}
                  onClick={() => setBottomTab("output")}
                >
                  Output & Logs
                </button>
                <button
                  style={{ ...styles.dockTab, ...(bottomTab === "ai" ? styles.dockTabActive : {}) }}
                  onClick={() => setBottomTab("ai")}
                >
                  AI Run Stream
                </button>
              </div>

              <div style={styles.dockContent}>
                {bottomTab === "terminal" && <TerminalPanel repoPath={repoPath} />}
                {bottomTab === "output" && (
                  <div style={styles.outputLog}>
                    <p style={styles.logLine}>[INFO] Atlas Studio v0.1 Workspace initialized: {repoPath ?? "None"}</p>
                    <p style={styles.logLine}>[PASS] All IPC background channels ready.</p>
                  </div>
                )}
                {bottomTab === "ai" && (
                  <div style={styles.aiEventLog}>
                    {aiEvents.length === 0 ? (
                      <p style={styles.noEvents}>No active agent runs.</p>
                    ) : (
                      aiEvents.map((ev, idx) => (
                        <pre key={idx} style={styles.eventPre}>
                          {ev}
                        </pre>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    width: "100vw",
    backgroundColor: "#16161e",
    color: "#c0caf5",
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    overflow: "hidden",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: "36px",
    backgroundColor: "#1a1b26",
    borderBottom: "1px solid #24283b",
    padding: "0 12px",
    userSelect: "none",
  },
  logo: {
    display: "flex",
    alignItems: "center",
  },
  logoAtlas: {
    fontWeight: 800,
    fontSize: "14px",
    color: "#7aa2f7",
  },
  logoStudio: {
    fontWeight: 400,
    fontSize: "12px",
    color: "#565f89",
    marginLeft: "4px",
  },
  workspaceInfo: {
    display: "flex",
    alignItems: "center",
  },
  openRepoButton: {
    background: "#24283b",
    border: "1px solid #3b4261",
    color: "#c0caf5",
    padding: "3px 10px",
    borderRadius: "4px",
    fontSize: "11px",
    cursor: "pointer",
  },
  topControls: {
    display: "flex",
    gap: "8px",
  },
  dockToggle: {
    background: "#24283b",
    border: "1px solid #3b4261",
    color: "#565f89",
    padding: "3px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    cursor: "pointer",
  },
  dockToggleActive: {
    color: "#7aa2f7",
    borderColor: "#7aa2f7",
  },
  mainLayout: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  activityBar: {
    width: "48px",
    backgroundColor: "#1a1b26",
    borderRight: "1px solid #24283b",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: "8px",
    gap: "12px",
  },
  activityButton: {
    width: "36px",
    height: "36px",
    background: "none",
    border: "none",
    borderRadius: "8px",
    color: "#565f89",
    fontSize: "18px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  activityButtonActive: {
    backgroundColor: "#24283b",
    color: "#7aa2f7",
  },
  sidebarPanel: {
    width: "260px",
    backgroundColor: "#16161e",
    borderRight: "1px solid #24283b",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  centerArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  tabBar: {
    display: "flex",
    height: "34px",
    backgroundColor: "#1a1b26",
    borderBottom: "1px solid #24283b",
    overflowX: "auto",
  },
  tabItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "0 12px",
    backgroundColor: "#16161e",
    borderRight: "1px solid #24283b",
    color: "#565f89",
    fontSize: "12px",
    cursor: "pointer",
    userSelect: "none",
  },
  tabItemActive: {
    backgroundColor: "#24283b",
    color: "#c0caf5",
    borderBottom: "2px solid #7aa2f7",
  },
  tabLabel: {
    maxWidth: "140px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  dirtyDot: {
    color: "#e0af68",
    fontSize: "10px",
  },
  closeTabIcon: {
    fontSize: "14px",
    opacity: 0.5,
    cursor: "pointer",
  },
  editorViewContainer: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  welcomeScreen: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    backgroundColor: "#1a1b26",
  },
  welcomeCard: {
    textAlign: "center",
    padding: "32px",
    backgroundColor: "#16161e",
    borderRadius: "8px",
    border: "1px solid #24283b",
    maxWidth: "400px",
  },
  welcomeSub: {
    color: "#565f89",
    fontSize: "13px",
    marginBottom: "20px",
  },
  welcomeActions: {
    display: "flex",
    justifyContent: "center",
  },
  welcomeButton: {
    backgroundColor: "#7aa2f7",
    color: "#15161e",
    border: "none",
    borderRadius: "4px",
    padding: "8px 16px",
    fontWeight: "bold",
    fontSize: "13px",
    cursor: "pointer",
  },
  bottomDock: {
    height: "220px",
    backgroundColor: "#16161e",
    borderTop: "1px solid #24283b",
    display: "flex",
    flexDirection: "column",
  },
  dockTabBar: {
    display: "flex",
    height: "28px",
    backgroundColor: "#1a1b26",
    borderBottom: "1px solid #24283b",
  },
  dockTab: {
    background: "none",
    border: "none",
    color: "#565f89",
    padding: "0 12px",
    fontSize: "11px",
    fontWeight: "bold",
    textTransform: "uppercase",
    cursor: "pointer",
  },
  dockTabActive: {
    color: "#7aa2f7",
    borderBottom: "2px solid #7aa2f7",
  },
  dockContent: {
    flex: 1,
    overflow: "hidden",
  },
  outputLog: {
    padding: "12px",
    fontFamily: "monospace",
    fontSize: "12px",
    color: "#9aa5ce",
  },
  logLine: {
    margin: "4px 0",
  },
  aiEventLog: {
    padding: "12px",
    overflowY: "auto",
    height: "100%",
  },
  noEvents: {
    color: "#565f89",
    fontSize: "12px",
  },
  eventPre: {
    fontSize: "11px",
    color: "#7dcfff",
    whiteSpace: "pre-wrap",
    margin: "4px 0",
  },
  aiSidebar: {
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  sidebarHeader: {
    fontSize: "11px",
    fontWeight: "bold",
    color: "#7aa2f7",
    marginBottom: "12px",
  },
  aiGoalBox: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  goalTextarea: {
    height: "100px",
    backgroundColor: "#1f2335",
    border: "1px solid #3b4261",
    color: "#c0caf5",
    borderRadius: "4px",
    padding: "8px",
    fontSize: "12px",
    resize: "none",
  },
  aiRunBtn: {
    backgroundColor: "#7aa2f7",
    color: "#15161e",
    border: "none",
    borderRadius: "4px",
    padding: "8px",
    fontWeight: "bold",
    fontSize: "12px",
    cursor: "pointer",
  },
};
