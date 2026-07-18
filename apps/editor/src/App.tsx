import { useState, useEffect } from "react";
import { EditorPane } from "./components/EditorPane.js";
import { FileExplorer } from "./components/FileExplorer.js";
import { GitPanel } from "./components/GitPanel.js";
import { ImpactPanel } from "./components/ImpactPanel.js";
import { TerminalPanel } from "./components/TerminalPanel.js";
import { DiffViewer } from "./components/DiffViewer.js";
import { CommandPalette, CommandItem } from "./components/CommandPalette.js";
import { SettingsPanel, EditorSettings, DEFAULT_SETTINGS } from "./components/SettingsPanel.js";
import { Breadcrumb } from "./components/Breadcrumb.js";
import { StatusBar } from "./components/StatusBar.js";
import { AiSidebar } from "./components/AiSidebar.js";
import logoImg from "./assets/logo.png";

interface EditorTab {
  filePath: string;
  content: string;
  language: string;
  isDirty: boolean;
}

type SidebarView = "explorer" | "git" | "impact" | "ai" | "settings";
type BottomTab = "terminal" | "output" | "ai";

function ExplorerNavIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function GitNavIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  );
}

function ImpactNavIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function AgentNavIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="15" x2="23" y2="15" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="15" x2="4" y2="15" />
    </svg>
  );
}

function SettingsNavIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function App() {
  const [repoPath, setRepoPath] = useState<string | undefined>();
  const [activeSidebar, setActiveSidebar] = useState<SidebarView>("explorer");
  const [bottomTab, setBottomTab] = useState<BottomTab>("terminal");
  const [showBottomPanel, setShowBottomPanel] = useState(true);
  const [showRightAiSidebar, setShowRightAiSidebar] = useState(true);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [settings, setSettings] = useState<EditorSettings>(DEFAULT_SETTINGS);

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
    const existingIndex = tabs.findIndex((t) => t.filePath === filePath);
    if (existingIndex >= 0) {
      setActiveDiff(null);
      setActiveTabIndex(existingIndex);
      return;
    }

    const api = (window as any).atlasAPI;
    let content = "";
    if (api?.readFile) {
      try {
        content = await api.readFile(filePath);
      } catch {
        content = "// File read error";
      }
    }

    const ext = filePath.split(".").pop() || "";
    const langMap: Record<string, string> = {
      ts: "typescript",
      tsx: "typescript",
      js: "javascript",
      jsx: "javascript",
      json: "json",
      py: "python",
      md: "markdown",
      html: "html",
      css: "css",
    };

    const newTab: EditorTab = {
      filePath,
      content,
      language: langMap[ext] || "plaintext",
      isDirty: false,
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveDiff(null);
    setActiveTabIndex(tabs.length);
  };

  const handleCloseTab = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabs((prev) => prev.filter((_, i) => i !== index));
    if (activeTabIndex >= index && activeTabIndex > 0) {
      setActiveTabIndex(activeTabIndex - 1);
    }
  };

  const handleViewDiff = async (filePath: string, staged: boolean) => {
    const api = (window as any).atlasAPI;
    if (api?.gitDiff && repoPath) {
      try {
        const diffText = await api.gitDiff(repoPath, filePath, staged);
        setActiveDiff({ filePath, diffText });
      } catch {
        setActiveDiff({ filePath, diffText: "Error fetching diff" });
      }
    }
  };

  const handleCursorChange = (lineContent: string) => {
    const match = lineContent.match(/\b([A-Za-z_][A-Za-z0-9_]*)\b/);
    if (match) {
      setCursorSymbol(match[1]);
    }
  };

  const handleRunAi = async () => {
    if (!aiGoal.trim() || !repoPath) return;
    const api = (window as any).atlasAPI;
    if (api?.runAgent) {
      setAiRunning(true);
      setAiEvents(["Agent initialized..."]);
      try {
        const result = await api.runAgent(aiGoal, repoPath);
        if (result.error) {
          setAiEvents((prev) => [...prev, `[FAIL] Error: ${result.error}`]);
        } else {
          setAiEvents((prev) => [...prev, `[PASS] Task completed successfully`]);
        }
      } catch (err) {
        setAiEvents((prev) => [...prev, `[FAIL] ${String(err)}`]);
      } finally {
        setAiRunning(false);
      }
    }
  };

  const commands: CommandItem[] = [
    {
      id: "toggle-ai-sidebar",
      label: "Toggle Atlas AI Chat Panel",
      shortcut: "Ctrl+L",
      action: () => setShowRightAiSidebar((prev) => !prev),
    },
    {
      id: "open-settings",
      label: "Open Settings",
      shortcut: "Ctrl+,",
      action: () => setActiveSidebar("settings"),
    },
    {
      id: "open-folder",
      label: "Open Workspace Folder",
      shortcut: "Ctrl+O",
      action: handleSelectRepo,
    },
    {
      id: "toggle-terminal",
      label: "Toggle Terminal Panel",
      shortcut: "Ctrl+`",
      action: () => setShowBottomPanel((prev) => !prev),
    },
    {
      id: "show-explorer",
      label: "Show File Explorer",
      shortcut: "Ctrl+Shift+E",
      action: () => setActiveSidebar("explorer"),
    },
    {
      id: "show-git",
      label: "Show Source Control",
      shortcut: "Ctrl+Shift+G",
      action: () => setActiveSidebar("git"),
    },
    {
      id: "show-impact",
      label: "Show Dependency Impact Graph",
      shortcut: "Ctrl+Shift+I",
      action: () => setActiveSidebar("impact"),
    },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        setActiveSidebar("settings");
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
        e.preventDefault();
        setShowRightAiSidebar((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Subscribe to native Electron menu bar actions
  useEffect(() => {
    const api = (window as any).atlasAPI;
    if (!api?.onMenuAction) return;
    const unsub = api.onMenuAction((action: string) => {
      switch (action) {
        case "menu:open-folder":       handleSelectRepo(); break;
        case "menu:command-palette":   setShowCommandPalette(true); break;
        case "menu:show-explorer":     setActiveSidebar("explorer"); break;
        case "menu:show-git":          setActiveSidebar("git"); break;
        case "menu:show-impact":       setActiveSidebar("impact"); break;
        case "menu:toggle-ai-sidebar": setShowRightAiSidebar((p) => !p); break;
        case "menu:open-settings":     setActiveSidebar("settings"); break;
        case "menu:toggle-terminal":   setShowBottomPanel((p) => !p); break;
        case "menu:new-terminal":      setShowBottomPanel(true); setBottomTab("terminal"); break;
        case "menu:close-tab":         setTabs((p) => p.filter((_, i) => i !== activeTabIndex)); break;
        default: break;
      }
    });
    return unsub;
  }, [activeTabIndex]);

  return (
    <div style={styles.root}>
      {/* VS Code-style Title Bar */}
      <header style={styles.topBar}>
        <div style={styles.logo}>
          <img src={logoImg} alt="Atlas Studio" style={styles.logoImg} />
          <span style={styles.logoAtlas}>ATLAS</span>
          <span style={styles.logoStudio}>STUDIO</span>
        </div>

        <div style={styles.centerBar}>
          <button style={styles.workspaceBtn} onClick={handleSelectRepo}>
            {repoPath ? repoPath.split(/[/\\]/).pop() : "Open Workspace Folder"}
          </button>
        </div>

        <div style={styles.topControls}>
          {/* Search */}
          <button style={styles.iconBtn} title="Search (Ctrl+F)" onClick={() => setShowCommandPalette(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          {/* Source Control */}
          <button style={styles.iconBtn} title="Source Control (Ctrl+Shift+G)" onClick={() => setActiveSidebar("git")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
          </button>
          {/* Layout panels toggle */}
          <button
            style={{ ...styles.iconBtn, ...(showBottomPanel ? styles.iconBtnActive : {}) }}
            title="Toggle Terminal Panel"
            onClick={() => setShowBottomPanel((p) => !p)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="15" x2="21" y2="15" />
            </svg>
          </button>
          {/* AI sidebar toggle */}
          <button
            style={{ ...styles.iconBtn, ...(showRightAiSidebar ? styles.iconBtnActive : {}) }}
            title="Toggle Atlas AI Chat (Ctrl+L)"
            onClick={() => setShowRightAiSidebar((p) => !p)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" />
            </svg>
          </button>
          {/* Settings */}
          <button style={styles.iconBtn} title="Settings (Ctrl+,)" onClick={() => setActiveSidebar("settings")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div style={styles.mainLayout}>
        {/* Left Activity Bar */}
        <nav style={styles.activityBar}>
          <div style={styles.activityTopGroup}>
            <button
              style={{ ...styles.activityButton, ...(activeSidebar === "explorer" ? styles.activityButtonActive : {}) }}
              onClick={() => setActiveSidebar("explorer")}
              title="Explorer (Ctrl+Shift+E)"
            >
              <ExplorerNavIcon />
            </button>
            <button
              style={{ ...styles.activityButton, ...(activeSidebar === "git" ? styles.activityButtonActive : {}) }}
              onClick={() => setActiveSidebar("git")}
              title="Source Control (Ctrl+Shift+G)"
            >
              <GitNavIcon />
            </button>
            <button
              style={{ ...styles.activityButton, ...(activeSidebar === "impact" ? styles.activityButtonActive : {}) }}
              onClick={() => setActiveSidebar("impact")}
              title="Dependency Impact Graph (Ctrl+Shift+I)"
            >
              <ImpactNavIcon />
            </button>
            <button
              style={{ ...styles.activityButton, ...(activeSidebar === "ai" ? styles.activityButtonActive : {}) }}
              onClick={() => setActiveSidebar("ai")}
              title="Atlas AI Agent (Ctrl+Shift+A)"
            >
              <AgentNavIcon />
            </button>
          </div>

          <div style={styles.activityBottomGroup}>
            <button
              style={{ ...styles.activityButton, ...(activeSidebar === "settings" ? styles.activityButtonActive : {}) }}
              onClick={() => setActiveSidebar("settings")}
              title="Settings (Ctrl+,)"
            >
              <SettingsNavIcon />
            </button>
          </div>
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
                  placeholder="Describe task goal..."
                  value={aiGoal}
                  onChange={(e) => setAiGoal(e.target.value)}
                />
                <button style={styles.aiRunBtn} onClick={handleRunAi} disabled={aiRunning}>
                  {aiRunning ? "Running Agent..." : "Run Autonomous Agent"}
                </button>
              </div>
            </div>
          )}
          {activeSidebar === "settings" && (
            <SettingsPanel settings={settings} onUpdateSettings={setSettings} />
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
                {tab.isDirty && <span style={styles.dirtyDot}>*</span>}
                <span style={styles.closeTabIcon} onClick={(e) => handleCloseTab(i, e)}>
                  x
                </span>
              </div>
            ))}
          </div>

          {/* Path Breadcrumb */}
          {activeTab && <Breadcrumb filePath={activeTab.filePath} repoPath={repoPath} />}

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
                  <img src={logoImg} alt="Atlas Studio Logo" style={styles.welcomeLogoImg} />
                  <h2>Atlas Studio v0.1</h2>
                  <p style={styles.welcomeSub}>Professional AI-Native IDE Platform</p>
                  <div style={styles.welcomeActions}>
                    <button style={styles.welcomeButton} onClick={handleSelectRepo}>
                      Open Workspace Folder
                    </button>
                    <button style={styles.settingsWelcomeBtn} onClick={() => setActiveSidebar("settings")}>
                      Open Settings (Ctrl+,)
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
                  TERMINAL
                </button>
                <button
                  style={{ ...styles.dockTab, ...(bottomTab === "output" ? styles.dockTabActive : {}) }}
                  onClick={() => setBottomTab("output")}
                >
                  OUTPUT & LOGS
                </button>
                <button
                  style={{ ...styles.dockTab, ...(bottomTab === "ai" ? styles.dockTabActive : {}) }}
                  onClick={() => setBottomTab("ai")}
                >
                  AI RUN STREAM
                </button>
              </div>

              <div style={styles.dockContent}>
                {bottomTab === "terminal" && <TerminalPanel repoPath={repoPath} />}
                {bottomTab === "output" && (
                  <div style={styles.logStream}>
                    <p style={styles.logLine}>[PASS] System initializing...</p>
                    <p style={styles.logLine}>[PASS] Graph database ready.</p>
                    {repoPath && <p style={styles.logLine}>[PASS] Workspace loaded: {repoPath}</p>}
                  </div>
                )}
                {bottomTab === "ai" && (
                  <div style={styles.logStream}>
                    {aiEvents.length === 0 ? (
                      <p style={styles.logEmpty}>No active agent runs.</p>
                    ) : (
                      aiEvents.map((ev, i) => (
                        <p key={i} style={styles.logLine}>
                          {ev}
                        </p>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right AI Sidebar Chat Panel */}
        {showRightAiSidebar && (
          <AiSidebar repoPath={repoPath} activeFilePath={activeTab?.filePath} />
        )}
      </div>

      {/* Bottom Status Bar */}
      <StatusBar repoPath={repoPath} activeLanguage={activeTab?.language} cursorSymbol={cursorSymbol} />

      {/* Command Palette Overlay */}
      <CommandPalette
        isOpen={showCommandPalette}
        commands={commands}
        onClose={() => setShowCommandPalette(false)}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    width: "100vw",
    backgroundColor: "#09090b",
    color: "#fafafa",
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    overflow: "hidden",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: "38px",
    padding: "0 10px",
    backgroundColor: "#0d0d10",
    borderBottom: "1px solid #27272a",
    fontSize: "12px",
    position: "relative" as const,
  },
  logo: {
    display: "flex",
    alignItems: "center",
  },
  logoImg: {
    width: "22px",
    height: "22px",
    marginRight: "8px",
    objectFit: "contain",
  },
  logoAtlas: {
    fontWeight: 800,
    fontSize: "12px",
    letterSpacing: "1px",
    color: "#fafafa",
  },
  logoStudio: {
    fontWeight: 500,
    fontSize: "11px",
    letterSpacing: "1px",
    color: "#71717a",
    marginLeft: "5px",
  },
  centerBar: {
    display: "flex",
    alignItems: "center",
    position: "absolute" as const,
    left: "50%",
    transform: "translateX(-50%)",
  },
  workspaceBtn: {
    background: "#18181b",
    border: "1px solid #27272a",
    color: "#e4e4e7",
    padding: "4px 16px",
    borderRadius: "4px",
    fontSize: "12px",
    cursor: "pointer",
    fontWeight: 500,
    maxWidth: "260px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  topControls: {
    display: "flex",
    gap: "2px",
    alignItems: "center",
  },
  iconBtn: {
    width: "30px",
    height: "30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    borderRadius: "4px",
    color: "#a1a1aa",
    cursor: "pointer",
  },
  iconBtnActive: {
    background: "#27272a",
    color: "#fafafa",
  },
  dockToggleActive: {
    background: "#27272a",
    borderColor: "#3f3f46",
    color: "#ffffff",
  },
  mainLayout: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  activityBar: {
    width: "48px",
    backgroundColor: "#09090b",
    borderRight: "1px solid #27272a",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "8px",
    paddingBottom: "8px",
  },
  activityTopGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    alignItems: "center",
  },
  activityBottomGroup: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  activityButton: {
    width: "36px",
    height: "36px",
    borderRadius: "6px",
    border: "none",
    background: "transparent",
    color: "#71717a",
    fontSize: "14px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s ease",
  },
  activityButtonActive: {
    background: "#18181b",
    color: "#fafafa",
    border: "1px solid #27272a",
  },
  sidebarPanel: {
    width: "280px",
    backgroundColor: "#0d0d10",
    display: "flex",
    flexDirection: "column",
  },
  centerArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#121215",
    overflow: "hidden",
  },
  tabBar: {
    display: "flex",
    height: "34px",
    backgroundColor: "#09090b",
    borderBottom: "1px solid #27272a",
    overflowX: "auto",
  },
  tabItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "0 14px",
    backgroundColor: "#0d0d10",
    borderRight: "1px solid #27272a",
    color: "#71717a",
    fontSize: "12px",
    cursor: "pointer",
    userSelect: "none",
    borderTop: "2px solid transparent",
  },
  tabItemActive: {
    backgroundColor: "#121215",
    color: "#fafafa",
    borderTop: "2px solid #fafafa",
  },
  tabLabel: {
    fontWeight: 500,
  },
  dirtyDot: {
    color: "#e4e4e7",
    fontWeight: "bold",
  },
  closeTabIcon: {
    fontSize: "12px",
    opacity: 0.6,
    padding: "2px",
  },
  editorViewContainer: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
  },
  welcomeScreen: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    backgroundColor: "#09090b",
  },
  welcomeCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "48px 64px",
    borderRadius: "12px",
    backgroundColor: "#0d0d10",
    border: "1px solid #27272a",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
  },
  welcomeLogoImg: {
    width: "110px",
    height: "110px",
    marginBottom: "20px",
    objectFit: "contain",
    filter: "drop-shadow(0 8px 16px rgba(0, 0, 0, 0.6))",
  },
  welcomeSub: {
    color: "#71717a",
    fontSize: "13px",
    marginBottom: "24px",
  },
  welcomeActions: {
    display: "flex",
    gap: "12px",
  },
  welcomeButton: {
    backgroundColor: "#fafafa",
    color: "#09090b",
    border: "none",
    padding: "10px 20px",
    borderRadius: "6px",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
  },
  settingsWelcomeBtn: {
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    color: "#fafafa",
    padding: "10px 20px",
    borderRadius: "6px",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
  },
  bottomDock: {
    height: "220px",
    backgroundColor: "#09090b",
    borderTop: "1px solid #27272a",
    display: "flex",
    flexDirection: "column",
  },
  dockTabBar: {
    display: "flex",
    height: "30px",
    backgroundColor: "#0d0d10",
    borderBottom: "1px solid #27272a",
  },
  dockTab: {
    background: "none",
    border: "none",
    borderRight: "1px solid #27272a",
    color: "#71717a",
    padding: "0 16px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
    borderBottom: "2px solid transparent",
  },
  dockTabActive: {
    color: "#fafafa",
    borderBottom: "2px solid #fafafa",
    backgroundColor: "#09090b",
  },
  dockContent: {
    flex: 1,
    overflow: "hidden",
  },
  logStream: {
    padding: "12px",
    fontFamily: "'JetBrains Mono', Consolas, monospace",
    fontSize: "12px",
    overflowY: "auto",
    height: "100%",
  },
  logLine: {
    color: "#e4e4e7",
    lineHeight: "1.6",
  },
  logEmpty: {
    color: "#71717a",
  },
  aiSidebar: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    padding: "12px",
    gap: "12px",
  },
  sidebarHeader: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.8px",
    color: "#fafafa",
  },
  aiGoalBox: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  goalTextarea: {
    width: "100%",
    height: "80px",
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    color: "#fafafa",
    borderRadius: "6px",
    padding: "8px",
    fontSize: "12px",
    resize: "none",
    fontFamily: "inherit",
  },
  aiRunBtn: {
    backgroundColor: "#fafafa",
    color: "#09090b",
    border: "none",
    borderRadius: "6px",
    padding: "8px",
    fontWeight: 600,
    fontSize: "12px",
    cursor: "pointer",
  },
};
