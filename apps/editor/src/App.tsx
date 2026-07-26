import "./global.css";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EditorPane } from "./components/EditorPane.js";
import { FileExplorer } from "./components/FileExplorer.js";
import { GlobalSearchPanel } from "./components/GlobalSearchPanel.js";
import { GitPanel } from "./components/GitPanel.js";
import { ImpactPanel } from "./components/ImpactPanel.js";
import { ProblemsPanel } from "./components/ProblemsPanel.js";
import { OutputPanel, logToOutput } from "./components/OutputPanel.js";
import { TerminalPanel } from "./components/TerminalPanel.js";
import { DiffViewer } from "./components/DiffViewer.js";
import { CommandPalette } from "./components/CommandPalette.js";
import { CommandPaletteQuickPicker } from "./components/CommandPaletteQuickPicker.js";
import { SettingsPanel, EditorSettings, DEFAULT_SETTINGS } from "./components/SettingsPanel.js";
import { Breadcrumb } from "./components/Breadcrumb.js";
import { StatusBar } from "./components/StatusBar.js";
import { DebugPanel } from "./components/DebugPanel.js";
import { AiSidebar } from "./components/AiSidebar.js";
import { DependencyGraph } from "./components/DependencyGraph.js";
import { ProjectHealth } from "./components/ProjectHealth.js";
import { ExtensionGallery } from "./components/ExtensionGallery.js";
import { onLspStatusChange, LSPStatus } from "./lsp/LSPClient.js";
import { GitHistoryPanel } from "./components/GitHistoryPanel.js";
import { TimelinePanel } from "./components/TimelinePanel.js";
import { MergeConflictEditor } from "./components/MergeConflictEditor.js";
import { AiSafetyModal } from "./components/AiSafetyModal.js";
import { InlineAiTool } from "./components/InlineAiTool.js";
import { PlanApprovalModal } from "./components/PlanApprovalModal.js";
import { AboutAtlasModal } from "./components/AboutAtlasModal.js";
import { KeybindingsPanel, DEFAULT_KEYBINDINGS } from "./components/KeybindingsPanel.js";
import { ThemeSelectorPanel } from "./components/ThemeSelectorPanel.js";
import { Files, Search, GitBranch, Bug, Blocks, Settings, X, Search as SearchIcon, X as XIcon, Menu, Bot } from "lucide-react";
import { ThemeManager } from "./components/ThemeManager.js";
import { OutlinePanel, DocumentSymbol } from "./components/OutlinePanel.js";
import { Tooltip } from "./components/Tooltip.js";
import { ParallelAgentsDashboard } from "./components/ParallelAgentsDashboard.js";
import logoImg from "./assets/logo.png";
import { CommandService, BrowserStorageProvider } from "@atlas/core";
import { DialogProvider } from "./components/DialogProvider.js";
import { ContextMenuProvider } from "./components/ContextMenuProvider.js";
import { NotificationProvider } from "./components/NotificationProvider.js";
import { QuickInputProvider } from "./components/QuickInputProvider.js";
const storageProvider = new BrowserStorageProvider();
function getSync(key: string) {
  const res = storageProvider.getItem(key);
  return res instanceof Promise ? null : res;
}

import { WebPreviewPanel } from "./components/WebPreviewPanel.js";

interface EditorTab { 
  filePath: string;
  isDirty?: boolean;
  content: string;
  language: string;
  targetLine?: number;
  targetColumn?: number;
  isBinary?: boolean;
}
type SidebarView = "explorer" | "search" | "git" | "debug" | "history" | "timeline" | "extensions" | "ai" | "settings" | "outline" | "parallel" | "preview";
type BottomTab = "terminal" | "problems" | "output" | "ai";

interface MenuItem { label: string; shortcut?: string; action?: () => void; separator?: boolean; disabled?: boolean; checked?: boolean; submenu?: MenuItem[]; }

function BinaryFileView({ onOpenAnyway }: { onOpenAnyway: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', color: 'var(--text-main, #e4e4e7)', backgroundColor: '#09090b', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="1.5" style={{ marginBottom: 16 }}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <div style={{ fontSize: '15px', fontWeight: 600, color: '#f4f4f5', marginBottom: '8px' }}>Binary or Unsupported File</div>
      <p style={{ maxWidth: '420px', textAlign: 'center', fontSize: '13px', color: '#a1a1aa', lineHeight: '1.5', marginBottom: '24px' }}>
        The file cannot be displayed in the text editor because it is binary or uses an unsupported text encoding.
      </p>
      <button 
        style={{ padding: '8px 18px', backgroundColor: '#18181b', color: '#fafafa', border: '1px solid #3f3f46', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
        onClick={onOpenAnyway}
        onMouseOver={e => e.currentTarget.style.backgroundColor = '#27272a'}
        onMouseOut={e => e.currentTarget.style.backgroundColor = '#18181b'}
      >
        Open Text Editor Anyway
      </button>
    </div>
  );
}

import { useNotification } from "./components/NotificationProvider.js";
import { useContextMenu } from "./components/ContextMenuProvider.js";

const api = () => window.atlasAPI;

function AppInner() {
  const { showNotification } = useNotification();
  const { showContextMenu } = useContextMenu();
  const [repoPath, setRepoPath]             = useState<string | undefined>(() => {
    const last = getSync("atlas_last_repo");
    if (last) return last;
    try {
      const stored = JSON.parse(getSync("atlas_workspace_roots") || "[]");
      if (Array.isArray(stored) && stored.length > 0) return stored[0];
    } catch (err) {
      console.warn("[WARN] Failed to parse atlas_workspace_roots from localStorage:", err);
    }
    return "/home/victor/My projects/Atlas";
  });

  useEffect(() => {
    if (repoPath && api()?.setRepoPath) {
      api().setRepoPath(repoPath);
    }
  }, [repoPath]);
  const [workspaceRoots, setWorkspaceRoots] = useState<string[]>(() => {
    try { 
      const stored = JSON.parse(getSync("atlas_workspace_roots") || "[]");
      if (Array.isArray(stored) && stored.length > 0) return stored;
      const lastRepo = getSync("atlas_last_repo");
      return lastRepo ? [lastRepo] : [];
    } catch (err) {
      console.warn("[WARN] Failed to parse atlas_workspace_roots for initial state:", err);
      return [];
    }
  });
  const [recentProjects, setRecentProjects] = useState<string[]>(() => {
    try { return JSON.parse(getSync("atlas_recent_projects") || "[]"); } catch { return []; }
  });
  const [activeSidebar, setActiveSidebar]   = useState<SidebarView>("explorer");
  const [bottomTab, setBottomTab]           = useState<BottomTab>("terminal");
  const [lsStatus, setLsStatus]             = useState<LSPStatus>("ready");
  const [healthScore, setHealthScore]       = useState<number | null>(null);


  const [showBottomPanel, setShowBottomPanel]       = useState(true);
  const [termAddTrigger, setTermAddTrigger]         = useState(0);
  const [showRightAiSidebar, setShowRightAiSidebar] = useState(true);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [isSplit, setIsSplit]                       = useState(false);
  const [splitTabIndex, setSplitTabIndex]           = useState(0);
  const [showMergeConflict, setShowMergeConflict]   = useState(false);
  const [showAiSafety, setShowAiSafety]             = useState(false);
  const [aiSafetyData, setAiSafetyData]             = useState<any>(null);
   const [autoSaveEnabled, setAutoSaveEnabled]       = useState<boolean>(() => localStorage.getItem("atlas_auto_save") === "true");
  const [submenuOpen, setSubmenuOpen]               = useState<number | null>(null);
  const untitledCounterRef                           = useRef(1);

  // Plan Approval state
  const [pendingPlanApproval, setPendingPlanApproval] = useState<{ reqId: string, plan: any } | null>(null);
  const [showInlineAi, setShowInlineAi]             = useState(false);
  const [showAboutModal, setShowAboutModal]         = useState(false);
  const [showKeybindings, setShowKeybindings]       = useState(false);
  const [showThemeSelector, setShowThemeSelector]   = useState(false);
  const [activeCursorPos, setActiveCursorPos]       = useState({ line: 1, col: 1 });
  const [editorEol, setEditorEol]                   = useState<"LF" | "CRLF">("LF");
  const [editorTabSize, setEditorTabSize]            = useState(2);
  const [editorUseTabs, setEditorUseTabs]            = useState(false);
  const [sidebarWidth, setSidebarWidth]             = useState(240);
  const [rightSidebarWidth, setRightSidebarWidth]   = useState(320);
  const [bottomPanelHeight, setBottomPanelHeight]   = useState(220);
  const draggingRef = useRef<"sidebar" | "bottom" | "right-sidebar" | null>(null);

  const [settings, setSettings]       = useState<EditorSettings>(DEFAULT_SETTINGS);
  const [tabs, setTabs]               = useState<EditorTab[]>([]);

  useEffect(() => {
    localStorage.setItem("atlas_auto_save", String(autoSaveEnabled));
    if (!autoSaveEnabled) return;
    const timer = setInterval(() => {
      tabs.forEach(tab => {
        if (tab.isDirty && tab.filePath && !tab.filePath.startsWith("Untitled")) {
          api()?.writeFile(tab.filePath, tab.content).then(() => {
            setTabs(prev => prev.map(t => t.filePath === tab.filePath ? { ...t, isDirty: false } : t));
          }).catch(() => {});
        }
      });
    }, 1500);
    return () => clearInterval(timer);
  }, [autoSaveEnabled, tabs]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [activeDiff, setActiveDiff]   = useState<{ filePath: string; diffText: string } | null>(null);
  const [cursorSymbol, setCursorSymbol] = useState<string | undefined>();
  const [activeSymbols, setActiveSymbols] = useState<DocumentSymbol[]>([]);
  const [aiGoal, setAiGoal]           = useState("");
  const [aiRunning, setAiRunning]     = useState(false);
  const [aiEvents, setAiEvents]       = useState<string[]>([]);
  const [showTabActionsMenu, setShowTabActionsMenu] = useState(false);
  const [previewMode, setPreviewMode] = useState(true);
  const [groupLocked, setGroupLocked] = useState(false);
  const [openMenu, setOpenMenu]       = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const activeTab = tabs[activeTabIndex];
  const splitTab = tabs[splitTabIndex];

  useEffect(() => {
    if (activeTab?.filePath && api()?.emitEvent) {
      api().emitEvent("ActiveEditorChanged", { filePath: activeTab.filePath, language: activeTab.language });
    }
  }, [activeTab?.filePath, activeTab?.language]);
  const isWorkspaceLoaded = useRef(false);
  const activeEditorRef = useRef<any>(null);
  const splitEditorRef = useRef<any>(null);

  // Load Workspace State
  useEffect(() => {
    if (!repoPath) return;
    isWorkspaceLoaded.current = false;
    try {
      const saved = getSync("atlas_workspace_state_" + repoPath);
      if (saved) {
        const state = JSON.parse(saved);
        if (state.tabs && Array.isArray(state.tabs)) {
          const restoredTabs: EditorTab[] = state.tabs.map((path: string) => ({
            filePath: path,
            content: "",
            language: determineLanguage(path),
            isDirty: false
          }));
          setTabs(restoredTabs);
          setActiveTabIndex(state.activeTabIndex || 0);
          
          restoredTabs.forEach((tab, index) => {
            api().readFile(tab.filePath).then((content: string) => {
              setTabs(curr => {
                const updated = [...curr];
                if (updated[index] && updated[index].filePath === tab.filePath) {
                  updated[index] = { ...updated[index], content };
                }
                return updated;
              });
            }).catch(() => {});
          });
        } else {
          setTabs([]);
          setActiveTabIndex(0);
        }
        if (state.isSplit !== undefined) setIsSplit(state.isSplit);
        if (state.splitTabIndex !== undefined) setSplitTabIndex(state.splitTabIndex);
        if (state.activeSidebar !== undefined) setActiveSidebar(state.activeSidebar);
        if (state.ui) {
          if (state.ui.showBottomPanel !== undefined) setShowBottomPanel(Boolean(state.ui.showBottomPanel));
          if (state.ui.showRightAiSidebar !== undefined) setShowRightAiSidebar(Boolean(state.ui.showRightAiSidebar));
          if (state.ui.sidebarWidth !== undefined) {
            const restored = Number(state.ui.sidebarWidth);
            setSidebarWidth(restored > 380 ? 220 : Math.max(160, restored));
          }
          if (state.ui.rightSidebarWidth !== undefined) setRightSidebarWidth(Number(state.ui.rightSidebarWidth));
          if (state.ui.bottomPanelHeight !== undefined) setBottomPanelHeight(Number(state.ui.bottomPanelHeight));
        }
      } else {
        setTabs([]);
        setActiveTabIndex(0);
        setIsSplit(false);
      }
    } catch (err) {
      console.warn("Failed to restore workspace state:", err);
    }
    isWorkspaceLoaded.current = true;
  }, [repoPath]);

  useEffect(() => {
    if (isWorkspaceLoaded.current) return;
    showNotification({
      message: "Atlas Studio UI/UX Upgrade: Notifications system initialized.",
      type: "success",
      duration: 5000,
    });
  }, [showNotification]);

  useEffect(() => {
    const handleApplyCode = (e: any) => {
      const code = e.detail?.code;
      if (!code) return;
      if (tabs.length === 0 || activeTabIndex < 0) {
        showNotification({ message: "No active file open to apply code snippet.", type: "warning" });
        return;
      }
      setTabs((prev) => {
        const next = [...prev];
        const active = next[activeTabIndex];
        if (active) {
          next[activeTabIndex] = { ...active, content: code, isDirty: true };
        }
        return next;
      });
      showNotification({ message: "Code snippet applied to active editor!", type: "success" });
    };
    window.addEventListener("atlas:apply-code-snippet", handleApplyCode);
    return () => window.removeEventListener("atlas:apply-code-snippet", handleApplyCode);
  }, [tabs, activeTabIndex, showNotification]);

  // Save Workspace State
  useEffect(() => {
    if (!repoPath || !isWorkspaceLoaded.current) return;
    const timer = setTimeout(() => {
      const state = {
        tabs: tabs.map(t => t.filePath),
        activeTabIndex,
        isSplit,
        splitTabIndex,
        activeSidebar,
        ui: {
          showBottomPanel,
          showRightAiSidebar,
          sidebarWidth,
          rightSidebarWidth,
          bottomPanelHeight
        }
      };
      storageProvider.setItem("atlas_workspace_state_" + repoPath, JSON.stringify(state));
    }, 500);
    return () => clearTimeout(timer);
  }, [repoPath, tabs, activeTabIndex, isSplit, splitTabIndex, activeSidebar, showBottomPanel, showRightAiSidebar, sidebarWidth, rightSidebarWidth, bottomPanelHeight]);

  useEffect(() => {
    if (!repoPath) return;
    const fetchHealth = async () => {
      try {
        const todos = await (api().scanTodos ? api().scanTodos(repoPath) : Promise.resolve({ total: 0 }));
        const deps = await (api().scanDeps ? api().scanDeps(repoPath) : Promise.resolve({ deps: 0, outdated: 0 }));
        let score = 100;
        if (todos.total > 0) score -= Math.min(todos.total * 2, 30);
        if (deps.outdated > 0) score -= Math.min((deps.outdated / Math.max(deps.deps, 1)) * 100, 50);
        setHealthScore(Math.max(0, Math.floor(score)));
      } catch (e) {
        setHealthScore(null);
      }
    };
    fetchHealth();
    
    const unsubscribe = onLspStatusChange((status) => {
      setLsStatus(status);
    });
    
    return () => { unsubscribe(); };
  }, [repoPath, activeTab?.language]);

  const determineLanguage = (filePath: string) => {
    const ext = filePath.split(".").pop() ?? "";
    const lm: Record<string,string> = {ts:"typescript",tsx:"typescript",js:"javascript",jsx:"javascript",json:"json",py:"python",md:"markdown",html:"html",css:"css"};
    return lm[ext]||"plaintext";
  };

  const openFile = useCallback(async (filePath: string, targetLine?: number, targetColumn?: number) => {
    try {
      const content = await window.atlasAPI.readFile(filePath);
      const language = determineLanguage(filePath);
      const shortName = filePath.split(/[/\\]/).pop() ?? filePath;
      logToOutput("System", `Opened ${shortName}`, "info");
      setTabs(prev => {
        const idx = prev.findIndex(t => t.filePath === filePath);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], targetLine, targetColumn } as EditorTab;
          setActiveTabIndex(idx);
          return updated;
        }
        setActiveTabIndex(prev.length);
        return [...prev, { filePath, content, language, targetLine, targetColumn }];
      });
    } catch (err) {
      logToOutput("System", `Failed to open file: ${err}`, "error");
      console.error("Failed to open file:", err);
    }
  }, []);

  useEffect(() => {
    const handleOpenFileEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ filePath: string; line?: number }>;
      if (customEvent.detail?.filePath) {
        openFile(customEvent.detail.filePath, customEvent.detail.line);
      }
    };
    window.addEventListener("atlas:open-file", handleOpenFileEvent);

    const a = api();
    if (a?.onEvent) {
      a.onEvent((ev: any) => {
        if (ev.type === "file_changed") {
          window.dispatchEvent(new CustomEvent("atlas:file-changed", { detail: ev }));
        }
      });
    }

    return () => {
      window.removeEventListener("atlas:open-file", handleOpenFileEvent);
    };
  }, [openFile]);

  const saveRecentProject = useCallback((path: string) => {
    setRecentProjects(prev => {
      const updated = [path, ...prev.filter(p => p !== path)].slice(0, 10);
      storageProvider.setItem("atlas_recent_projects", JSON.stringify(updated));
      return updated;
    });
    storageProvider.setItem("atlas_last_repo", path);
  }, []);

  const handleSelectRepo = useCallback(async (customPath?: string) => {
    const a = api(); if (!a?.selectDirectory) return;
    const sel = customPath || (await a.selectDirectory());
    if (sel) {
      setRepoPath(sel);
      setWorkspaceRoots([sel]);
      storageProvider.setItem("atlas_workspace_roots", JSON.stringify([sel]));
      saveRecentProject(sel);
      const shortName = sel.split(/[/\\]/).pop() ?? sel;
      logToOutput("System", `Workspace opened: ${shortName}`, "success");
    }
  }, [saveRecentProject]);

  const handleAddFolder = useCallback(async () => {
    const a = api(); if (!a?.addDirectory) return;
    const sel = await a.addDirectory();
    if (sel) {
      setWorkspaceRoots(prev => {
        if (prev.includes(sel)) return prev;
        const next = [...prev, sel];
        storageProvider.setItem("atlas_workspace_roots", JSON.stringify(next));
        return next;
      });
      if (!repoPath) {
        setRepoPath(sel);
        saveRecentProject(sel);
      }
    }
  }, [repoPath, saveRecentProject]);

  const handleOpenRecent = (path: string) => {
    setRepoPath(path);
    setWorkspaceRoots([path]);
    storageProvider.setItem("atlas_workspace_roots", JSON.stringify([path]));
    saveRecentProject(path);
  };

  const handleSave = useCallback(async () => {
    if (!activeTab || !api()?.writeFile) return;
    
    let contentToSave = activeTab.content;
    
    // Format on save
    if (settings.formatOnSave) {
      const editor = activeEditorRef.current;
      if (editor) {
        try {
          await editor.getAction('editor.action.formatDocument')?.run();
          contentToSave = editor.getValue();
        } catch (err) {
          logToOutput("System", `Format on save failed: ${err}`, "warn");
          console.error("Format on save failed:", err);
        }
      }
    }
    
    await api().writeFile(activeTab.filePath, contentToSave);
    const shortName = activeTab.filePath.split(/[/\\]/).pop() ?? activeTab.filePath;
    logToOutput("System", `Saved ${shortName}`, "success");
    setTabs(p => p.map((t,i) => i===activeTabIndex ? {...t, content: contentToSave, isDirty:false} : t));
  }, [activeTab, activeTabIndex, settings.formatOnSave]);

  useEffect(() => {
    if (settings.autoSave === "afterDelay" && activeTab?.isDirty) {
      const timer = setTimeout(() => {
        handleSave();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [settings.autoSave, activeTab?.isDirty, activeTab?.content, handleSave]);

  useEffect(() => {
    if (settings.autoSave === "onFocusChange") {
      const handleBlur = () => {
        if (activeTab?.isDirty) handleSave();
      };
      window.addEventListener("blur", handleBlur);
      return () => window.removeEventListener("blur", handleBlur);
    }
  }, [settings.autoSave, activeTab, handleSave]);

  const handleOpenSettings = () => {
    api()?.openSettingsWindow?.();
  };

  const handleOpenFile = async (filePath: string, line?: number) => {
    const ei = tabs.findIndex(t => t.filePath === filePath);
    if (ei >= 0) {
      setActiveDiff(null);
      setActiveTabIndex(ei);
      return;
    }

    const binaryExts = new Set([".db", ".sqlite", ".sqlite3", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".pdf", ".zip", ".tar", ".gz", ".mp3", ".mp4", ".exe", ".dll", ".so", ".dylib", ".wasm", ".bin", ".woff", ".woff2", ".ttf", ".eot"]);
    const ext = filePath.substring(filePath.lastIndexOf(".")).toLowerCase();
    
    let content = "";
    let isBinary = false;
    if (binaryExts.has(ext)) {
      isBinary = true;
    } else {
      try { content = await api()?.readFile(filePath) ?? ""; } catch { content = "// read error"; }
    }
    
    const language = determineLanguage(filePath);
    setTabs(p => [...p, { filePath, content, language, isDirty: false, isBinary }]);
    setActiveTabIndex(tabs.length);
  };

  const handleCloseTab = (i: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabs(p => {
      const nextTabs = p.filter((_, j) => j !== i);
      if (nextTabs.length === 0) {
        setActiveTabIndex(0);
        setSplitTabIndex(0);
      } else {
        setActiveTabIndex(prev => (prev >= nextTabs.length ? Math.max(0, nextTabs.length - 1) : prev));
        setSplitTabIndex(prev => (prev >= nextTabs.length ? Math.max(0, nextTabs.length - 1) : prev));
      }
      return nextTabs;
    });
  };

  const handleViewDiff = async (filePath: string, staged: boolean) => {
    const a = api(); if (!a?.gitDiff || !repoPath) return;
    try { setActiveDiff({ filePath, diffText: await a.gitDiff(repoPath, filePath, staged) }); }
    catch { setActiveDiff({ filePath, diffText: "Error loading diff" }); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if ((file as any).path) handleOpenFile((file as any).path);
    }
  };

  const handleUpdateSettings = (newSettings: EditorSettings) => {
    setSettings(newSettings);
    api()?.updateSettings?.(newSettings);
  };

  useEffect(() => {
    const a = api();
    if (a?.getSettings) {
      a.getSettings().then((s: any) => {
        if (s) setSettings({ ...DEFAULT_SETTINGS, ...s, wordWrap: "off" });
      });
    }

    if (a?.onSettingsUpdated) {
      return a.onSettingsUpdated((newSettings: any) => {
        setSettings(newSettings);
      });
    }
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (draggingRef.current === "sidebar") {
        if (settings.sidebarPosition === "right") {
          setSidebarWidth(Math.max(100, Math.min(window.innerWidth - e.clientX - 40, 800)));
        } else {
          setSidebarWidth(Math.max(100, Math.min(e.clientX - 40, 800)));
        }
      } else if (draggingRef.current === "bottom") {
        if (settings.terminalPosition === "right") {
          setBottomPanelHeight(Math.max(100, Math.min(window.innerWidth - e.clientX, 800)));
        } else {
          setBottomPanelHeight(Math.max(100, Math.min(window.innerHeight - e.clientY - 22, 800)));
        }
      } else if (draggingRef.current === "right-sidebar") {
        setRightSidebarWidth(Math.max(200, Math.min(window.innerWidth - e.clientX, 800)));
      }
    };
    
    const handleMouseUp = () => {
      draggingRef.current = null;
      document.body.style.cursor = "default";
    };
    
    document.addEventListener("mousedown", h);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [settings.sidebarPosition, settings.terminalPosition]);

  useEffect(() => {
    ThemeManager.getInstance().setStorageProvider(storageProvider);
    ThemeManager.getInstance().loadSavedTheme();
  }, []);

  useEffect(() => {
    const tm = ThemeManager.getInstance();
    if (settings.theme === "custom") {
      if (settings.customThemeColors) {
        tm.setCustomTheme(settings.customThemeColors);
      }
      // If no customThemeColors, it's an imported VS Code theme handled by ThemeManager internally
    } else if (settings.theme === "light") {
      tm.setLightMode();
    } else {
      tm.setDarkMode(); 
    }
  }, [settings.theme, settings.customThemeColors]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      // First, get custom keybindings
      let customBindings: Record<string, string> = {};
      try {
        const saved = getSync("atlas_keybindings");
        if (saved) customBindings = JSON.parse(saved);
      } catch (err) {
        console.warn("Failed to parse custom keybindings:", err);
      }

      const getShortcut = (id: string) => {
        return customBindings[id] || DEFAULT_KEYBINDINGS.find(k => k.id === id)?.defaultKey || "";
      };

      const matchesCombo = (combo: string, evt: KeyboardEvent) => {
        const shortcut = combo.toLowerCase();
        if (!shortcut) return false;
        const parts = shortcut.split("+").map(p => p.trim());
        const needsCtrl = parts.includes("ctrl") || parts.includes("meta");
        const needsShift = parts.includes("shift");
        const needsAlt = parts.includes("alt");
        
        const hasCtrl = evt.ctrlKey || evt.metaKey;
        if (needsCtrl !== hasCtrl) return false;
        if (needsShift !== evt.shiftKey) return false;
        if (needsAlt !== evt.altKey) return false;
        
        const keyPart = parts[parts.length - 1];
        if (keyPart === "esc" && evt.key.toLowerCase() === "escape") return true;
        if (evt.key.toLowerCase() === keyPart) return true;
        return false;
      };

      const matchesShortcut = (id: string, evt: KeyboardEvent) => {
        return matchesCombo(getShortcut(id), evt);
      };



      if (matchesShortcut("commandPalette", e)) { e.preventDefault(); setShowCommandPalette(p=>!p); }
      else if (matchesShortcut("settings", e)) { e.preventDefault(); handleOpenSettings(); }
      else if (matchesShortcut("keybindings", e)) { e.preventDefault(); setShowKeybindings(true); }
      else if (matchesShortcut("toggleAi", e)) { e.preventDefault(); setShowRightAiSidebar(p=>!p); }
      else if (matchesShortcut("save", e)) { e.preventDefault(); handleSave(); }
      else if (matchesShortcut("splitEditor", e)) { e.preventDefault(); setIsSplit(p=>!p); }
      else if (matchesShortcut("inlineAi", e)) { e.preventDefault(); setShowInlineAi(p=>!p); }
      else if (matchesShortcut("explorer", e)) { e.preventDefault(); setActiveSidebar("explorer"); }
      else if (matchesShortcut("search", e)) { e.preventDefault(); setActiveSidebar("search"); }
      else if (matchesShortcut("git", e)) { e.preventDefault(); setActiveSidebar("git"); }
      else if (matchesShortcut("extensions", e)) { e.preventDefault(); setActiveSidebar("extensions"); }
      else if (matchesShortcut("toggleTerminal", e)) { e.preventDefault(); setShowBottomPanel(p=>!p); }
      else if (matchesShortcut("debug", e)) {
         e.preventDefault(); 
         if (tabs[activeTabIndex]?.filePath) {
           setActiveSidebar("debug");
           api()?.startDap(tabs[activeTabIndex].filePath);
         }
      }
      else if (e.key === "Escape") { 
         setOpenMenu(null); setShowCommandPalette(false); setShowInlineAi(false); setShowAboutModal(false); setShowKeybindings(false);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [handleSave, tabs, activeTabIndex, activeSidebar, showBottomPanel, showRightAiSidebar, showCommandPalette, showInlineAi, showAboutModal, showKeybindings]);

  useEffect(() => {
    const a = api(); if (!a?.onMenuAction) return;
    return a.onMenuAction((action: string) => {
      if (action==="menu:open-folder")       handleSelectRepo();
      else if (action==="menu:add-folder")   handleAddFolder();
      else if (action==="menu:command-palette")   setShowCommandPalette(true);
      else if (action==="menu:show-explorer")     setActiveSidebar("explorer");
      else if (action==="menu:show-git")          setActiveSidebar("git");
      else if (action==="menu:toggle-ai-sidebar") setShowRightAiSidebar(p=>!p);
      else if (action==="menu:open-settings")     handleOpenSettings();
      else if (action==="menu:toggle-terminal")   setShowBottomPanel(p=>!p);
    });
  }, [handleSelectRepo]);

  useEffect(() => {
    const a = api(); if (!a?.onOpenFileInEditor) return;
    return a.onOpenFileInEditor((filePath: string) => {
      handleOpenFile(filePath);
    });
  }, [handleOpenFile]);

  const menus: Record<string, MenuItem[]> = {
    File: [
      {
        label: "New Text File",
        shortcut: "Ctrl+N",
        action: () => {
          const untitledName = `Untitled-${untitledCounterRef.current++}.ts`;
          setTabs(prev => [...prev, { filePath: untitledName, content: "// New File\n", isDirty: true, isBinary: false, language: "typescript" }]);
          setActiveTabIndex(tabs.length);
        }
      },
      {
        label: "New File...",
        shortcut: "Ctrl+Alt+Super+N",
        action: () => {
          const fileName = prompt("Enter new file path (relative to workspace):", "src/newFile.ts");
          if (fileName) {
            handleOpenFile(fileName);
          }
        }
      },
      {
        label: "New Window",
        shortcut: "Ctrl+Shift+N",
        action: () => api()?.newWindow?.()
      },
      {
        label: "New Window with Profile",
        submenu: [
          { label: "Default Profile", action: () => api()?.newWindow?.({ profile: "default" }) },
          { label: "Web Development (React / TS)", action: () => api()?.newWindow?.({ profile: "webdev" }) },
          { label: "Python AI & Data Science", action: () => api()?.newWindow?.({ profile: "python" }) },
          { label: "Baremetal C / C++", action: () => api()?.newWindow?.({ profile: "cpp" }) },
        ]
      },
      { label: "sep1", separator: true },
      {
        label: "Open File...",
        shortcut: "Ctrl+O",
        action: async () => {
          const path = await api()?.openFileDialog?.();
          if (path) handleOpenFile(path);
        }
      },
      {
        label: "Open Folder...",
        shortcut: "Ctrl+K Ctrl+O",
        action: handleSelectRepo
      },
      {
        label: "Open Workspace from File...",
        action: async () => {
          const wsPath = await api()?.openWorkspaceFileDialog?.();
          if (wsPath) {
            try {
              const content = await api()?.readFile(wsPath);
              const data = JSON.parse(content || "{}");
              if (data.folders && Array.isArray(data.folders)) {
                const paths = data.folders.map((f: any) => f.path);
                setWorkspaceRoots(paths);
                if (paths[0]) handleSelectRepo(paths[0]);
              }
            } catch (e) {
              showNotification({ message: "Failed to parse workspace file", type: "error" });
            }
          }
        }
      },
      {
        label: "Open Recent",
        submenu: [
          ...recentProjects.map(p => ({
            label: p.split(/[/\\]/).pop() || p,
            shortcut: p.length > 25 ? "..." + p.slice(-20) : p,
            action: () => handleSelectRepo(p)
          })),
          { label: "sepRecent", separator: true },
          {
            label: "Clear Recent",
            action: () => {
              setRecentProjects([]);
              localStorage.removeItem("atlas_recent_projects");
              showNotification({ message: "Cleared recent workspace history", type: "info" });
            }
          }
        ]
      },
      { label: "sep2", separator: true },
      {
        label: "Add Folder to Workspace...",
        action: handleAddFolder
      },
      {
        label: "Save Workspace As...",
        action: async () => {
          const target = await api()?.saveWorkspaceAsDialog?.(repoPath ? `${repoPath}/workspace.atlas-workspace` : undefined);
          if (target) {
            const data = {
              folders: workspaceRoots.map(r => ({ path: r })),
              settings: {}
            };
            await api()?.writeFile(target, JSON.stringify(data, null, 2));
            showNotification({ message: `Workspace saved to ${target}`, type: "success" });
          }
        }
      },
      {
        label: "Duplicate Workspace",
        action: () => {
          if (repoPath) api()?.newWindow?.();
        }
      },
      { label: "sep3", separator: true },
      {
        label: "Save",
        shortcut: "Ctrl+S",
        action: handleSave
      },
      {
        label: "Save As...",
        shortcut: "Ctrl+Shift+S",
        action: async () => {
          if (!activeTab) return;
          const target = await api()?.saveFileAsDialog?.(activeTab.filePath);
          if (target) {
            await api()?.writeFile(target, activeTab.content);
            handleOpenFile(target);
            showNotification({ message: `Saved as ${target}`, type: "success" });
          }
        }
      },
      {
        label: "Save All",
        shortcut: "Ctrl+Alt+S",
        action: () => {
          tabs.forEach(tab => {
            if (tab.isDirty && tab.filePath) {
              api()?.writeFile(tab.filePath, tab.content);
            }
          });
          setTabs(prev => prev.map(t => ({ ...t, isDirty: false })));
          showNotification({ message: "All dirty files saved", type: "success" });
        }
      },
      { label: "sep4", separator: true },
      {
        label: "Share",
        submenu: [
          {
            label: "Export Code Snippet (Gist / Markdown)",
            action: () => {
              if (activeTab) {
                const markdown = `\`\`\`${activeTab.filePath.split('.').pop() || ''}\n// ${activeTab.filePath}\n${activeTab.content}\n\`\`\``;
                navigator.clipboard.writeText(markdown);
                showNotification({ message: "Copied code snippet markdown to clipboard!", type: "success" });
              }
            }
          },
          {
            label: "Export Trajectory Replay Log",
            action: () => {
              showNotification({ message: "Trajectory Replay exported to .atlas/brain/trajectory.json", type: "info" });
            }
          }
        ]
      },
      { label: "sep5", separator: true },
      {
        label: "Auto Save",
        checked: autoSaveEnabled,
        action: () => setAutoSaveEnabled(prev => !prev)
      },
      {
        label: "Preferences",
        submenu: [
          { label: "Editor Settings", action: handleOpenSettings },
          { label: "Atlas IDE Settings", shortcut: "Ctrl+,", action: handleOpenSettings },
          { label: "Keyboard Shortcuts", shortcut: "Ctrl+K Ctrl+S", action: () => setShowKeybindings(true) },
          { label: "Tasks", action: () => { setShowBottomPanel(true); setBottomTab("terminal"); } },
          {
            label: "Themes",
            submenu: [
              { label: "Color Theme", shortcut: "Ctrl+K Ctrl+T", action: () => setShowThemeSelector(true) },
              { label: "File Icon Theme", action: () => showNotification({ message: "Default Atlas File Icons active", type: "info" }) },
              { label: "Product Icon Theme", action: () => showNotification({ message: "Atlas Product Icons active", type: "info" }) }
            ]
          },
          { label: "Extensions", shortcut: "Ctrl+Shift+X", action: () => setActiveSidebar("extensions") },
        ]
      },
      { label: "sep6", separator: true },
      {
        label: "Revert File",
        action: async () => {
          if (!activeTab || !activeTab.filePath) return;
          try {
            const freshContent = await api()?.readFile(activeTab.filePath);
            if (freshContent !== undefined) {
              setTabs(prev => prev.map((t, idx) => idx === activeTabIndex ? { ...t, content: freshContent, isDirty: false } : t));
              showNotification({ message: "File reverted to disk version", type: "info" });
            }
          } catch (e) {}
        }
      },
      {
        label: "Close Editor",
        shortcut: "Ctrl+W",
        action: () => {
          if (tabs.length > 0) setTabs(prev => prev.filter((_, i) => i !== activeTabIndex));
        }
      },
      {
        label: "Close Folder",
        shortcut: "Ctrl+K F",
        action: () => {
          setWorkspaceRoots([]);
          setRepoPath(undefined);
          setTabs([]);
          showNotification({ message: "Workspace closed", type: "info" });
        }
      },
      {
        label: "Close Window",
        shortcut: "Alt+F4",
        action: () => api()?.windowClose?.()
      },
      { label: "sep7", separator: true },
      {
        label: "Exit",
        shortcut: "Ctrl+Q",
        action: () => api()?.windowClose?.()
      }
    ],
    Edit: [
      { label:"Undo",       shortcut:"Ctrl+Z",       action:()=>document.execCommand("undo") },
      { label:"Redo",       shortcut:"Ctrl+Y",       action:()=>document.execCommand("redo") },
      { label:"separator", separator:true },
      { label:"Cut",        shortcut:"Ctrl+X",       action:()=>document.execCommand("cut") },
      { label:"Copy",       shortcut:"Ctrl+C",       action:()=>document.execCommand("copy") },
      { label:"Paste",      shortcut:"Ctrl+V",       action:()=>document.execCommand("paste") },
    ],
    View: [
      { label:"Command Palette",     shortcut:"Ctrl+Shift+P", action:()=>setShowCommandPalette(true) },
      { label:"Inline AI Assistant", shortcut:"Ctrl+I",       action:()=>setShowInlineAi(p=>!p) },
      { label:"Split Editor",        shortcut:"Ctrl+\\",      action:()=>setIsSplit(p=>!p) },
      { label:"separator", separator:true },
      { label:"Explorer",            shortcut:"Ctrl+Shift+E", action:()=>setActiveSidebar("explorer") },
      { label:"Search",              shortcut:"Ctrl+Shift+F", action:()=>setActiveSidebar("search") },
      { label:"Source Control",      shortcut:"Ctrl+Shift+G", action:()=>setActiveSidebar("git") },
      { label:"Git History",         shortcut:"",             action:()=>setActiveSidebar("history") },
      { label:"3-Way Merge Resolver",shortcut:"",             action:()=>setShowMergeConflict(p=>!p) },
      { label:"Extensions Gallery",  shortcut:"Ctrl+Shift+X", action:()=>setActiveSidebar("extensions") },
      { label:"Toggle AI Sidebar",   shortcut:"Ctrl+L",       action:()=>setShowRightAiSidebar(p=>!p) },
      { label:"Toggle Panel",        shortcut:"Ctrl+`",       action:()=>setShowBottomPanel(p=>!p) },
    ],
    Terminal: [
      { label:"New Terminal",    shortcut:"Ctrl+`",       action:()=>{ setShowBottomPanel(true); setBottomTab("terminal"); } },
      { label:"Toggle Terminal", shortcut:"Ctrl+Shift+`", action:()=>setShowBottomPanel(p=>!p) },
    ],
    Run: [
      { label:"Start Debugging", shortcut:"F5", action:()=>{
         if (activeTab?.filePath) {
           setActiveSidebar("debug");
           api()?.startDap(activeTab.filePath);
         }
      } }
    ],
    Help: [
      { label:"Color Theme",       shortcut:"Ctrl+K Ctrl+T", action:()=>setShowThemeSelector(true) },
      { label:"Keyboard Shortcuts", shortcut:"Ctrl+K Ctrl+S", action:()=>setShowKeybindings(true) },
      { label:"separator", separator:true },
      { label:"About Atlas Studio", shortcut:"",             action:()=>setShowAboutModal(true) },
      { label:"Command Palette",   shortcut:"Ctrl+Shift+P", action:()=>setShowCommandPalette(true) },
    ],
  };

  const commandService = React.useMemo(() => new CommandService(), []);

  useEffect(() => {
    const unregisters = [
      commandService.registerCommand("about-atlas", "About Atlas Studio v1.0", () => setShowAboutModal(true)),
      commandService.registerCommand("open-settings", "Open Settings", handleOpenSettings, "Ctrl+,"),
      commandService.registerCommand("open-folder", "Open Workspace Folder", handleSelectRepo, "Ctrl+O"),
      commandService.registerCommand("add-folder", "Add Folder to Workspace", handleAddFolder),
      commandService.registerCommand("split-editor", "Toggle Split Editor", () => setIsSplit(p=>!p), "Ctrl+\\"),
      commandService.registerCommand("inline-ai", "Inline AI Assistant", () => setShowInlineAi(p=>!p), "Ctrl+I"),
      commandService.registerCommand("ai-safety", "AI Proposed Edit Preview", () => setShowAiSafety(true)),
      commandService.registerCommand("show-history", "Git History & Graph", () => setActiveSidebar("history")),
      commandService.registerCommand("merge-resolver", "3-Way Merge Conflict Resolver", () => setShowMergeConflict(p=>!p)),
      commandService.registerCommand("show-extensions", "Extensions Marketplace", () => setActiveSidebar("extensions"), "Ctrl+Shift+X"),
      commandService.registerCommand("toggle-terminal", "Toggle Terminal", () => setShowBottomPanel(p=>!p), "Ctrl+`"),
      commandService.registerCommand("show-explorer", "Explorer", () => setActiveSidebar("explorer"), "Ctrl+Shift+E"),
      commandService.registerCommand("show-search", "Search", () => setActiveSidebar("search"), "Ctrl+Shift+F"),
      commandService.registerCommand("show-git", "Source Control", () => setActiveSidebar("git"), "Ctrl+Shift+G"),
      commandService.registerCommand("toggle-ai", "Toggle AI Chat", () => setShowRightAiSidebar(p=>!p), "Ctrl+L"),
      commandService.registerCommand("open-keybindings", "Open Keyboard Shortcuts", () => setShowKeybindings(true), "Ctrl+K Ctrl+S"),
      commandService.registerCommand("open-theme-selector", "Color Theme", () => setShowThemeSelector(true), "Ctrl+K Ctrl+T"),
    ];
    return () => unregisters.forEach(fn => fn());
  }, [commandService, handleSelectRepo]);

  useEffect(() => {
    const unreg = api().onExtensionRegisteredCommand?.(({ id, label }: { id: string, label: string }) => {
      commandService.registerCommand(id, label || id, () => {
        api().executeExtensionCommand(id).catch((err: any) => console.error("Extension command failed", err));
      });
    });
    return () => unreg?.();
  }, [commandService]);

  // File System Watcher (Hot Reloading)
  useEffect(() => {
    if (!(api() as any).onFileChanged) return;
    return (api() as any).onFileChanged(async ({ path, event }: { path: string; event: string }) => {
      if (event === "change") {
        setTabs((prevTabs) => {
          const tabIndex = prevTabs.findIndex((t) => {
             return t.filePath.replace(/\\/g, "/") === path;
          });
          if (tabIndex === -1) return prevTabs;
          
          const tab = prevTabs[tabIndex];
          if (!tab || tab.isDirty) return prevTabs;
          
          api().readFile(tab.filePath).then((newContent: string) => {
            setTabs((currentTabs) => {
              const i = currentTabs.findIndex((t) => t.filePath.replace(/\\/g, "/") === path);
              if (i === -1 || !currentTabs[i] || currentTabs[i]!.isDirty) return currentTabs;
              const next = [...currentTabs];
              next[i] = { ...currentTabs[i]!, content: newContent };
              return next;
            });
          }).catch((err: any) => console.error("Hot reload failed:", err));
          
          return prevTabs;
        });
      }
    });
  }, []);

  // Tasks registration
  useEffect(() => {
    if (!repoPath) return;
    const a = api();
    if (a?.getTasks) {
      let unregisters: Array<() => void> = [];
      a.getTasks(repoPath).then((tasks: any[]) => {
        unregisters = tasks.map((task) => 
          commandService.registerCommand(
            `task:${task.id}`,
            `Task: ${task.name}`,
            () => {
              // Open bottom panel if closed
              setShowBottomPanel(true);
              setBottomTab("terminal");
              // Run in terminal
              a.terminalInput("term-1", task.command + "\r");
            }
          )
        );
      });
      return () => unregisters.forEach((fn) => fn());
    }
  }, [repoPath, commandService]);

  useEffect(() => {
    const handleRequestPermission = (_e: any, req: any) => {
      setAiSafetyData(req);
      setShowAiSafety(true);
    };
    
    const handlePlanApprovalRequest = (payload: { reqId: string, plan: any }) => {
      setPendingPlanApproval(payload);
    };

    if (window.atlasAPI) {
      const ipc = (window as any).electron?.ipcRenderer;
      if (ipc) {
        ipc.on("atlas:request-permission", handleRequestPermission);
        
        const cleanupPlanReq = window.atlasAPI.onRequestPlanApproval(handlePlanApprovalRequest);

        return () => {
          ipc.removeListener("atlas:request-permission", handleRequestPermission);
          cleanupPlanReq();
        };
      }
    }
  }, []);

  const handleCursorChange = useCallback((lineContent: string, line: number, col: number) => {
    setActiveCursorPos({ line, col });
    const m = lineContent.match(/\b([A-Za-z_]\w*)\b/);
    if(m) setCursorSymbol(m[1]);
    
    // Globally emit for extensions
    if (api()?.emitEvent) {
      api().emitEvent("CursorMoved", { line, col });
    }
  }, []);

  const handleSymbolsChange = useCallback((symbols: any[], currentSymbol?: string) => {
    setActiveSymbols(symbols);
    if(currentSymbol) setCursorSymbol(currentSymbol);
  }, []);

  const wname = repoPath ? repoPath.split(/[/\\]/).pop() : "Atlas Studio";
  const nodrag: React.CSSProperties = { WebkitAppRegion:"no-drag" } as any;

  return (
    <div style={s.root}>

      <header style={s.titlebar}>
        <div ref={menuRef} style={{ ...s.tbLeft, ...nodrag }}>
          <img src={logoImg} alt="Atlas" style={s.logo} />
          {Object.keys(menus).map(name => (
            <div key={name} style={s.menuWrapper}>
              <button
                className="menu-btn"
                style={{ ...s.menuItem, ...(openMenu===name ? s.menuItemOn : {}) }}
                onClick={() => setOpenMenu(openMenu===name ? null : name)}
                onMouseEnter={() => { if (openMenu && openMenu!==name) setOpenMenu(name); }}
              >
                {name}
              </button>
              {openMenu === name && (
                <div style={s.dropdown}>
                  {menus[name]!.map((item, i) => (
                    item.separator
                      ? <div key={i} style={s.dropSep} />
                      : <div
                          key={i}
                          style={{ position: "relative" }}
                          onMouseEnter={() => setSubmenuOpen(item.submenu ? i : null)}
                        >
                          <button
                            className="drop-item"
                            style={{ ...s.dropItem, ...(item.disabled ? s.dropDisabled : {}), display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}
                            disabled={item.disabled}
                            onClick={() => {
                              if (!item.submenu) {
                                item.action?.();
                                setOpenMenu(null);
                                setSubmenuOpen(null);
                              }
                            }}
                          >
                            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              {item.checked !== undefined ? (
                                <span style={{ width: "12px", display: "inline-block", color: "#38bdf8", fontWeight: "bold", fontSize: "11px" }}>
                                  {item.checked ? "✓" : ""}
                                </span>
                              ) : null}
                              <span>{item.label}</span>
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              {item.shortcut && <span style={s.dropShortcut}>{item.shortcut}</span>}
                              {item.submenu && <span style={{ opacity: 0.6, fontSize: "9px" }}>▶</span>}
                            </div>
                          </button>

                          {/* Nested Submenu Dropdown */}
                          {item.submenu && submenuOpen === i && (
                            <div
                              style={{
                                position: "absolute",
                                left: "100%",
                                top: "0",
                                marginTop: "-4px",
                                marginLeft: "2px",
                                backgroundColor: "var(--bg-glass-strong, rgba(14, 14, 18, 0.98))",
                                backdropFilter: "blur(20px)",
                                border: "1px solid var(--border-strong, #27272a)",
                                borderRadius: "6px",
                                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                                padding: "4px",
                                minWidth: "190px",
                                zIndex: 100000
                              }}
                              onMouseLeave={() => setSubmenuOpen(null)}
                            >
                              {item.submenu.map((sub, j) => (
                                sub.separator ? (
                                  <div key={j} style={s.dropSep} />
                                ) : (
                                  <button
                                    key={j}
                                    className="drop-item"
                                    style={{ ...s.dropItem, ...(sub.disabled ? s.dropDisabled : {}), display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}
                                    disabled={sub.disabled}
                                    onClick={() => {
                                      sub.action?.();
                                      setSubmenuOpen(null);
                                      setOpenMenu(null);
                                    }}
                                  >
                                    <span>{sub.label}</span>
                                    {sub.shortcut && <span style={s.dropShortcut}>{sub.shortcut}</span>}
                                  </button>
                                )
                              ))}
                            </div>
                          )}
                        </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

          <div style={{ ...s.tbCenter, cursor: "pointer" }} onClick={() => setShowCommandPalette(true)} className="hover-scale">
            <SearchIcon size={12} color="var(--text-faint)" />
            <span style={s.centerTxt}>{wname}</span>
          </div>

        <div style={{ ...s.tbRight, ...nodrag }}>
          <Tooltip content="Search (Ctrl+K)" position="bottom">
            <button style={s.iconBtn} onClick={()=>setShowCommandPalette(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
          </Tooltip>
          <Tooltip content="Toggle Split Editor (Ctrl+\)" position="bottom">
            <button style={{...s.iconBtn, ...(isSplit ? s.iconOn : {})}} onClick={()=>setIsSplit(p=>!p)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="1.5"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
            </button>
          </Tooltip>
          <Tooltip content="Toggle Explorer" position="bottom">
            <button style={s.iconBtn} onClick={()=>setActiveSidebar("explorer")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="1.5"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
            </button>
          </Tooltip>
          <Tooltip content="Toggle Terminal" position="bottom">
            <button style={{...s.iconBtn,...(showBottomPanel?s.iconOn:{})}} onClick={()=>setShowBottomPanel(p=>!p)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="1.5"/><line x1="3" y1="16" x2="21" y2="16"/></svg>
            </button>
          </Tooltip>
          <Tooltip content="Toggle AI Chat (Ctrl+L)" position="bottom">
            <button style={{...s.iconBtn,...(showRightAiSidebar?s.iconOn:{})}} onClick={()=>setShowRightAiSidebar(p=>!p)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
            </button>
          </Tooltip>
          <Tooltip content="Settings (Ctrl+,)" position="bottom">
            <button style={s.iconBtn} onClick={handleOpenSettings}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-2.82-1.17l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 2.82 1.17l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 2z"/></svg>
            </button>
          </Tooltip>
          <div style={s.winSep}/>
          <Tooltip content="Minimize" position="bottom">
            <button style={s.wc} onClick={()=>api()?.windowMinimize()}>
              <svg width="10" height="1" viewBox="0 0 10 1"><line x1="0" y1="0.5" x2="10" y2="0.5" stroke="currentColor" strokeWidth="1.5"/></svg>
            </button>
          </Tooltip>
          <Tooltip content="Maximize" position="bottom">
            <button style={s.wc} onClick={()=>api()?.windowMaximize()}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="0.75" y="0.75" width="8.5" height="8.5" rx="0.5" stroke="currentColor" strokeWidth="1.5"/></svg>
            </button>
          </Tooltip>
          <Tooltip content="Close" position="bottom">
            <button style={{...s.wc,...s.wcClose}} onClick={()=>api()?.windowClose()}>
              <svg width="10" height="10" viewBox="0 0 10 10"><line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5"/><line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.5"/></svg>
            </button>
          </Tooltip>
        </div>
      </header>

      <div style={{...s.body, flexDirection: settings.sidebarPosition === "right" ? "row-reverse" : "row"}}>
        <nav 
          style={{ ...s.actBar, borderRight: settings.sidebarPosition === "right" ? "1px solid #27272a" : "none" }}
          onContextMenu={(e) => {
            e.preventDefault();
            const toggleSidebar = (id: SidebarView) => {
              if (activeSidebar === id) setActiveSidebar(null as any);
              else setActiveSidebar(id);
            };
            showContextMenu({
              x: e.clientX,
              y: e.clientY,
              items: [
                { label: "Explorer", onClick: () => toggleSidebar("explorer") },
                { label: "Code Search", onClick: () => toggleSidebar("search") },
                { label: "Source Control", onClick: () => toggleSidebar("git") },
                { label: "Run and Debug", onClick: () => toggleSidebar("debug") },
                { label: "Extensions", onClick: () => toggleSidebar("extensions") },
                { separator: true },
                { 
                  label: settings.sidebarPosition === "right" ? "Move Primary Side Bar Left" : "Move Primary Side Bar Right", 
                  onClick: () => {
                    setSettings(prev => ({ ...prev, sidebarPosition: prev.sidebarPosition === "right" ? "left" : "right" }));
                  } 
                },
                { 
                  label: "Hide Primary Side Bar", 
                  onClick: () => setActiveSidebar(null as any) 
                }
              ]
            });
          }}
        >
          <div style={s.actTop}>
            {([
              {id:"explorer",  lbl:"Explorer",icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>},
              {id:"search",    lbl:"Search",  icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>},
              {id:"git",       lbl:"Git",     icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>},
              {id:"debug",     lbl:"Debug",   icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>},
              {id:"history",   lbl:"History", icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>},
              {id:"timeline",  lbl:"Timeline",icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h16M4 12h16M4 18h7"/></svg>},
              {id:"extensions",lbl:"Market",  icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>},
              {id:"ai",        lbl:"Agent",   icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="15" x2="23" y2="15"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="15" x2="4" y2="15"/></svg>},
              {id:"parallel",  lbl:"Parallel Agents", icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="5" y1="3" x2="5" y2="21"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="19" y1="3" x2="19" y2="21"/><line x1="5" y1="7" x2="12" y2="7"/><line x1="12" y1="13" x2="19" y2="13"/><circle cx="5" cy="7" r="1.5" fill="currentColor"/><circle cx="12" cy="13" r="1.5" fill="currentColor"/><circle cx="19" cy="17" r="1.5" fill="currentColor"/></svg>},
            ] as {id:SidebarView;lbl:string;icon:React.ReactNode}[]).map(({id,lbl,icon})=>(
              <Tooltip key={id} content={lbl} position={settings.sidebarPosition === "right" ? "left" : "right"}>
                <button 
                  className="sidebar-action-btn"
                  style={{...s.actBtn, position: "relative", color: activeSidebar === id ? "var(--text-main)" : "#64748b"}} 
                  onClick={()=>setActiveSidebar(activeSidebar===id ? null as any : id)}
                >
                  {activeSidebar === id && <div className="active-indicator" style={{ [settings.sidebarPosition === "right" ? "right" : "left"]: 0, left: settings.sidebarPosition === "right" ? "auto" : 0 }} />}
                  <span style={{ opacity: activeSidebar===id ? 1 : 0.6 }}>{icon}</span>
                </button>
              </Tooltip>
            ))}
          </div>
          <div style={s.actBot}>
            <Tooltip content="Settings" position={settings.sidebarPosition === "right" ? "left" : "right"}>
              <button className="sidebar-action-btn" style={s.actBtn} onClick={handleOpenSettings}>
                <span style={{ opacity: 0.6 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-2.82-1.17l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 2.82 1.17l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 2z"/></svg>
                </span>
              </button>
            </Tooltip>
          </div>
        </nav>

        <AnimatePresence initial={false}>
          {activeSidebar && (
            <motion.aside 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: sidebarWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{ ...s.sidebar, borderRight: settings.sidebarPosition === "right" ? "none" : "1px solid var(--border-subtle)", borderLeft: settings.sidebarPosition === "right" ? "1px solid var(--border-subtle)" : "none" }}
            >
              {activeSidebar==="explorer"   && <FileExplorer workspaceRoots={workspaceRoots} onOpenFile={handleOpenFile} onSelectRepo={handleSelectRepo} onAddFolder={handleAddFolder} onOpenInTerminal={(dir) => { setActiveSidebar("explorer"); setBottomTab("terminal"); setShowBottomPanel(true); /* terminal cwd change handled by TerminalPanel via focusTerminal event */ window.dispatchEvent(new CustomEvent("atlas:open-terminal-at", { detail: { cwd: dir } })); }}/>}
              {activeSidebar==="search"     && <GlobalSearchPanel workspaceRoot={repoPath!} onFileSelect={(f, l) => handleOpenFile(f, l)} />}
              {activeSidebar==="git"        && <GitPanel repoPath={repoPath} onViewDiff={handleViewDiff}/>}
              {activeSidebar==="debug"      && <DebugPanel />}
              {activeSidebar==="history"    && <GitHistoryPanel repoPath={repoPath}/>}
              {activeSidebar==="timeline"   && <TimelinePanel repoPath={repoPath}/>}
              {activeSidebar==="parallel"   && <ParallelAgentsDashboard repoPath={repoPath} />}
              {activeSidebar==="outline"    && <OutlinePanel symbols={activeSymbols} activeLine={activeCursorPos.line} onSymbolClick={(sym) => { if(activeTab) openFile(activeTab.filePath, sym.range.start.line + 1, sym.range.start.character + 1); }} />}
              {activeSidebar==="extensions" && <ExtensionGallery />}
              {activeSidebar==="ai"         && (
                <div style={s.agentPane}>
                  <p style={s.paneHdr}>ATLAS AI AGENT</p>
                  <textarea style={s.agentArea} placeholder="Describe task..." value={aiGoal} onChange={e=>setAiGoal(e.target.value)}/>
                  <button style={s.agentBtn} disabled={aiRunning} onClick={async()=>{
                    if(!aiGoal.trim()||!repoPath) return;
                    const a=api(); if(!a?.run) return;
                    setAiRunning(true);
                    logToOutput("Agent", `Starting: ${aiGoal.slice(0,80)}${aiGoal.length>80?"...":""}`, "info");
                    try {
                      const r=await a.run(aiGoal);
                      const msg = r.error ? `[FAIL] ${r.error}` : "[PASS] Done";
                      setAiEvents(p=>[...p, msg]);
                      logToOutput("Agent", msg, r.error ? "error" : "success");
                    }
                    catch(e){
                      setAiEvents(p=>[...p,`[FAIL] ${e}`]);
                      logToOutput("Agent", `[FAIL] ${e}`, "error");
                    }
                    setAiRunning(false);
                  }}>
                    {aiRunning?"Running...":"Run (Enter)"}
                  </button>
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>

        <div className="resizer-x" style={s.resizerX} onMouseDown={e => { e.preventDefault(); draggingRef.current = "sidebar"; document.body.style.cursor = "col-resize"; }} onDoubleClick={() => setSidebarWidth(220)} title="Drag to resize sidebar, double-click to reset width" />

        <div style={{...s.center, flexDirection: settings.terminalPosition === "right" ? "row" : "column"}} onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div style={s.tabBar}>
            <div style={{ display: "flex", flex: 1, overflowX: "auto", height: "100%", alignItems: "center" }}>
              {tabs.map((tab,i)=>(
                <div
                  key={tab.filePath}
                  className="editor-tab anim-slide-right"
                  style={{...s.tab,...(i===activeTabIndex&&!activeDiff?s.tabOn:{})}} 
                  onClick={()=>{setActiveDiff(null);setActiveTabIndex(i);}}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    showContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      items: [
                        { label: "Close", onClick: () => handleCloseTab(i, e) },
                        { label: "Close Others", onClick: () => {
                            setTabs([tab]);
                            setActiveTabIndex(0);
                        }},
                        { label: "Close All", onClick: () => {
                            setTabs([]);
                            setActiveTabIndex(0);
                        }},
                        { separator: true },
                        { label: "Copy Path", onClick: () => {
                            navigator.clipboard.writeText(tab.filePath);
                            showNotification({ message: "Path copied to clipboard", type: "success" });
                        }}
                      ]
                    });
                  }}
                >
                  <span style={s.tabName}>{tab.filePath.split(/[/\\]/).pop()}</span>
                  {tab.isDirty && <span style={s.tabDot} title="Unsaved changes">&#x25CF;</span>}
                  <span
                    className="tab-close-btn"
                    style={s.tabX}
                    title="Close"
                    onClick={e=>{ e.stopPropagation(); handleCloseTab(i,e); }}
                  >
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/>
                    </svg>
                  </span>
                </div>
              ))}
            </div>

            {/* Top Right Tab Controls matching Screenshot 2 & 3 */}
            <div style={{ display: "flex", alignItems: "center", height: "100%", paddingRight: "8px", gap: "2px", flexShrink: 0, position: "relative" }}>
              {/* Split Editor Button */}
              <button
                className="hover-scale"
                style={{
                  background: "none", border: "none", color: isSplit ? "#38bdf8" : "var(--text-muted, #a1a1aa)",
                  cursor: "pointer", padding: "4px 6px", borderRadius: "4px", display: "flex", alignItems: "center"
                }}
                onClick={() => setIsSplit(!isSplit)}
                title="Split Editor Right"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18"/></svg>
              </button>

              {/* Live Web Preview Button */}
              <button
                className="hover-scale"
                style={{
                  background: activeSidebar === "preview" ? "rgba(56, 189, 248, 0.2)" : "none",
                  border: activeSidebar === "preview" ? "1px solid rgba(56, 189, 248, 0.4)" : "none",
                  color: activeSidebar === "preview" ? "#38bdf8" : "var(--text-muted, #a1a1aa)",
                  cursor: "pointer", padding: "4px 8px", borderRadius: "4px", display: "flex", alignItems: "center", gap: "5px",
                  fontSize: "11px", fontWeight: 600, fontFamily: "var(--font-mono)"
                }}
                onClick={() => setActiveSidebar(activeSidebar === "preview" ? "explorer" : "preview")}
                title="Toggle Live Web App Preview"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                <span>Preview</span>
              </button>

              {/* Navigate Back <- */}
              <button
                className="hover-scale"
                style={{
                  background: "none", border: "none", color: activeTabIndex > 0 ? "var(--text-muted, #a1a1aa)" : "var(--border-strong, #3f3f46)",
                  cursor: activeTabIndex > 0 ? "pointer" : "default", padding: "4px 6px", borderRadius: "4px", display: "flex", alignItems: "center"
                }}
                onClick={() => { if (activeTabIndex > 0) setActiveTabIndex(activeTabIndex - 1); }}
                disabled={activeTabIndex <= 0}
                title="Navigate to Previous Tab"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              </button>

              {/* Navigate Forward -> */}
              <button
                className="hover-scale"
                style={{
                  background: "none", border: "none", color: activeTabIndex < tabs.length - 1 ? "var(--text-muted, #a1a1aa)" : "var(--border-strong, #3f3f46)",
                  cursor: activeTabIndex < tabs.length - 1 ? "pointer" : "default", padding: "4px 6px", borderRadius: "4px", display: "flex", alignItems: "center"
                }}
                onClick={() => { if (activeTabIndex < tabs.length - 1) setActiveTabIndex(activeTabIndex + 1); }}
                disabled={activeTabIndex >= tabs.length - 1}
                title="Navigate to Next Tab"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>

              {/* 3-Dot More Actions Button */}
              <button
                className="hover-scale"
                style={{
                  background: "none",
                  border: "none", color: "var(--text-muted, #a1a1aa)", cursor: "pointer", padding: "4px 6px", borderRadius: "4px", display: "flex", alignItems: "center"
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  showContextMenu({
                    x: Math.max(10, rect.right - 210),
                    y: rect.bottom + 4,
                    items: [
                      {
                        label: "Show Opened Editors",
                        onClick: () => setShowCommandPalette(true),
                      },
                      { separator: true },
                      {
                        label: "Close All",
                        shortcut: "Ctrl+K W",
                        onClick: () => {
                          setTabs([]);
                          setActiveTabIndex(0);
                        },
                      },
                      {
                        label: "Close Saved",
                        shortcut: "Ctrl+K U",
                        onClick: () => {
                          setTabs(prev => prev.filter(t => t.isDirty));
                          setActiveTabIndex(0);
                        },
                      },
                      { separator: true },
                      {
                        label: `${previewMode ? "✓  " : "    "}Enable Preview Editors`,
                        onClick: () => setPreviewMode(prev => !prev),
                      },
                      { separator: true },
                      {
                        label: `${groupLocked ? "✓  " : "    "}Lock Group`,
                        onClick: () => setGroupLocked(prev => !prev),
                      },
                      { separator: true },
                      {
                        label: "Configure Editors",
                        onClick: () => api()?.openSettingsWindow?.(),
                      },
                    ]
                  });
                }}
                title="More Editor Actions..."
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
              </button>
            </div>
          </div>

          {activeTab && (
            <Breadcrumb
              filePath={activeTab.filePath}
              repoPath={repoPath}
              cursorSymbol={cursorSymbol}
              onFind={() => activeEditorRef.current?.getAction?.("actions.find")?.run()}
            />
          )}

          <div style={s.editorArea}>
            {showInlineAi && (
              <InlineAiTool
                onExplain={() => {}}
                onGenerateTests={() => {
                  if (activeTab) {
                    const testPath = activeTab.filePath.replace(/\.ts$/, ".test.ts");
                    handleOpenFile(testPath);
                  }
                  setShowInlineAi(false);
                }}
                onGenerateDocs={() => {
                  setShowInlineAi(false);
                }}
                onClose={() => setShowInlineAi(false)}
              />
            )}

            {activeSidebar === "preview" ? (
              <WebPreviewPanel onClose={() => setActiveSidebar("explorer")} />
            ) : showMergeConflict ? (
              <MergeConflictEditor filePath={activeTab?.filePath || "src/index.ts"} onComplete={()=>setShowMergeConflict(false)}/>
            ) : activeDiff ? (
              <DiffViewer filePath={activeDiff.filePath} diffText={activeDiff.diffText} onClose={()=>setActiveDiff(null)}/>
            ) : tabs.length > 0 ? (
              <div style={{ display: "flex", width: "100%", height: "100%" }}>
                <div style={{ flex: 1, borderRight: isSplit ? "1px solid #27272a" : "none", height: "100%", overflow: "auto" }}>
                  {activeTab && (
                      activeTab.isBinary ? (
                        <BinaryFileView onOpenAnyway={async () => {
                          const c = await api()?.readFile(activeTab.filePath).catch(()=>"// read error") || "";
                          setTabs(p => p.map((t,i) => i === activeTabIndex ? {...t, isBinary: false, content: c} : t));
                        }} />
                      ) : (
                      <EditorPane
                        filePath={activeTab.filePath}
                        repoPath={repoPath}
                        content={activeTab.content}
                        language={activeTab.language}
                        targetLine={activeTab.targetLine}
                        targetColumn={activeTab.targetColumn}
                        onChange={c=>setTabs(p=>p.map((t,i)=>i===activeTabIndex?{...t,content:c,isDirty:true}:t))}
                        onCursorChange={handleCursorChange}
                        onSymbolsChange={handleSymbolsChange}
                        onEditorMount={(editor) => {
                          activeEditorRef.current = editor;
                        }}
                        settings={settings}
                      />
                      )
                  )}
                </div>

                {isSplit && (
                  <div style={{ flex: 1, height: "100%", overflow: "auto" }}>
                    {splitTab ? (
                      splitTab.isBinary ? (
                        <BinaryFileView onOpenAnyway={async () => {
                          const c = await api()?.readFile(splitTab.filePath).catch(()=>"// read error") || "";
                          setTabs(p => p.map((t,i) => i === splitTabIndex ? {...t, isBinary: false, content: c} : t));
                        }} />
                      ) : (
                        <EditorPane
                          filePath={splitTab.filePath}
                          repoPath={repoPath}
                          content={splitTab.content}
                          language={splitTab.language}
                          targetLine={splitTab.targetLine}
                          targetColumn={splitTab.targetColumn}
                          onChange={c=>setTabs(p=>p.map((t,i)=>i===splitTabIndex?{...t,content:c,isDirty:true}:t))}
                          onEditorMount={(editor) => {
                            splitEditorRef.current = editor;
                          }}
                          settings={settings}
                        />
                      )
                    ) : (
                      <div style={s.splitPlaceholder}>Select tab to view in split pane</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={s.welcome}>
                <img src={logoImg} alt="Atlas" style={s.welcomeLogoBg}/>
                <div style={s.welcomeCard}>
                  <h2 style={s.welcomeH2}>Atlas Studio</h2>
                  <p style={s.welcomeP}>The Developer-First Independent IDE Platform</p>
                  
                  <div style={s.welcomeRow}>
                    <button 
                      style={s.wBtnLink} 
                      onClick={() => handleSelectRepo()} 
                      onMouseOver={(e)=>e.currentTarget.style.textDecoration="underline"}
                      onMouseOut={(e)=>e.currentTarget.style.textDecoration="none"}
                    >
                      Open Workspace Folder...
                    </button>
                    <button 
                      style={s.wBtnLink} 
                      onClick={handleOpenSettings}
                      onMouseOver={(e)=>e.currentTarget.style.textDecoration="underline"}
                      onMouseOut={(e)=>e.currentTarget.style.textDecoration="none"}
                    >
                      Settings...
                    </button>
                  </div>

                  {recentProjects.length > 0 && (
                    <div style={s.recentBox}>
                      <p style={s.recentHdr}>RECENT WORKSPACES</p>
                      {recentProjects.map(path => (
                        <button key={path} style={s.recentItem} onClick={() => handleOpenRecent(path)}
                          onMouseOver={(e)=>e.currentTarget.style.opacity="0.8"}
                          onMouseOut={(e)=>e.currentTarget.style.opacity="1"}
                        >
                          <span style={s.recentName}>{path.split(/[/\\]/).pop()}</span>
                          <span style={s.recentPath}>{path}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          </div>

          {showBottomPanel && <div className={settings.terminalPosition === "right" ? "resizer-x" : "resizer-y"} style={settings.terminalPosition === "right" ? s.resizerX : s.resizerY} onMouseDown={e => { e.preventDefault(); draggingRef.current = "bottom"; document.body.style.cursor = settings.terminalPosition === "right" ? "col-resize" : "row-resize"; }} />}

          <AnimatePresence initial={false}>
            {showBottomPanel && (
              <motion.div 
                initial={settings.terminalPosition === "right" ? { width: 0, opacity: 0 } : { height: 0, opacity: 0 }}
                animate={settings.terminalPosition === "right" ? { width: bottomPanelHeight, opacity: 1 } : { height: bottomPanelHeight, opacity: 1 }}
                exit={settings.terminalPosition === "right" ? { width: 0, opacity: 0 } : { height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                style={{ ...s.dock, borderTop: settings.terminalPosition === "right" ? "none" : "1px solid var(--border-subtle)", borderLeft: settings.terminalPosition === "right" ? "1px solid var(--border-subtle)" : "none" }}
              >
                <div style={s.dockTabs}>
                  {(["problems", "output", "debug", "terminal", "ports"] as const).map(t => {
                    const isActive = bottomTab === (t as any);
                    const label = t === "problems" ? "Problems" : t === "output" ? "Output" : t === "debug" ? "Debug Console" : t === "terminal" ? "Terminal" : "Ports";
                    return (
                      <button
                        key={t}
                        style={{
                          ...s.dockTab,
                          color: isActive ? "#fafafa" : "var(--text-muted, #a1a1aa)",
                          borderBottom: isActive ? "2px solid #f97316" : "2px solid transparent",
                          fontWeight: isActive ? 600 : 400,
                          textTransform: "none",
                        }}
                        onClick={() => setBottomTab(t as any)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          showContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            items: [
                              { label: "Hide Panel", onClick: () => setShowBottomPanel(false) },
                              { 
                                label: settings.terminalPosition === "right" ? "Move Panel to Bottom" : "Move Panel Right", 
                                onClick: () => {
                                  setSettings(prev => ({ ...prev, terminalPosition: prev.terminalPosition === "right" ? "bottom" : "right" }));
                                }
                              }
                            ]
                          });
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}

                  {/* Right Actions matching Screenshot 1 */}
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px", paddingRight: "8px" }}>
                    <button
                      className="hover-scale"
                      style={{ background: "none", border: "none", color: "#a1a1aa", cursor: "pointer", padding: "2px 4px", fontSize: "14px", display: "flex", alignItems: "center" }}
                      title="New Terminal"
                      onClick={() => { setBottomTab("terminal"); setTermAddTrigger(n => n + 1); }}
                    >
                      +
                    </button>
                    <button
                      className="hover-scale"
                      style={{ background: "none", border: "none", color: "#a1a1aa", cursor: "pointer", padding: "2px 4px", fontSize: "12px", display: "flex", alignItems: "center" }}
                      title="More Actions"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        showContextMenu({
                          x: rect.right - 180,
                          y: rect.bottom + 4,
                          items: [
                            { label: "Hide Panel", onClick: () => setShowBottomPanel(false) },
                            { 
                              label: settings.terminalPosition === "right" ? "Move Panel to Bottom" : "Move Panel Right", 
                              onClick: () => {
                                setSettings(prev => ({ ...prev, terminalPosition: prev.terminalPosition === "right" ? "bottom" : "right" }));
                              }
                            }
                          ]
                        });
                      }}
                    >
                      ...
                    </button>
                    <button
                      className="hover-scale"
                      style={{ background: "none", border: "none", color: "#a1a1aa", cursor: "pointer", padding: "2px 4px", fontSize: "12px", display: "flex", alignItems: "center" }}
                      title="Toggle Maximize Panel"
                      onClick={() => setBottomPanelHeight(h => h > 400 ? 220 : 500)}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                    </button>
                    <button
                      className="hover-scale"
                      style={{ background: "none", border: "none", color: "#a1a1aa", cursor: "pointer", padding: "2px 4px", fontSize: "12px", display: "flex", alignItems: "center" }}
                      title="Close Panel"
                      onClick={() => setShowBottomPanel(false)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div style={{flex:1, overflow:"hidden"}}>
                  {bottomTab==="terminal" && <TerminalPanel repoPath={repoPath} addTrigger={termAddTrigger}/>}
                  {bottomTab==="problems" && <ProblemsPanel onJump={(p,l,c) => openFile(p,l,c)}/>}
                  {bottomTab==="output"   && <OutputPanel/>}
                  {bottomTab==="ai"       && <div style={s.log}>{aiEvents.length===0?<p style={s.logDim}>No agent runs.</p>:aiEvents.map((e,i)=><p key={i} style={s.logLine}>{e}</p>)}</div>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {showRightAiSidebar && <div className="resizer-x" style={s.resizerX} onMouseDown={e => { e.preventDefault(); draggingRef.current = "right-sidebar"; document.body.style.cursor = "col-resize"; }} />}
        {showRightAiSidebar && <AiSidebar width={rightSidebarWidth} repoPath={repoPath} activeFilePath={activeTab?.filePath} activeContent={activeTab?.content} openTabs={tabs.map(t => ({ filePath: t.filePath, content: t.content }))} cursorLine={activeCursorPos?.line} cursorSymbol={cursorSymbol} onClose={() => setShowRightAiSidebar(false)} onOpenSettings={handleOpenSettings} />}
      </div>

      {showAboutModal && <AboutAtlasModal onClose={()=>setShowAboutModal(false)} />}
      
      {showKeybindings && <KeybindingsPanel onClose={() => setShowKeybindings(false)} />}

      {showThemeSelector && (
        <ThemeSelectorPanel
          onClose={() => setShowThemeSelector(false)}
          onSelectTheme={(theme) => handleUpdateSettings({ ...settings, theme: theme as any })}
        />
      )}

      {showAiSafety && aiSafetyData && (
        <AiSafetyModal
          filePath={aiSafetyData.data?.filePath || "Unknown target"}
          proposedCode={aiSafetyData.data?.content || "No preview"}
          onApprove={() => {
            api()?.respondPermission(aiSafetyData.reqId, true);
            setShowAiSafety(false);
            setAiSafetyData(null);
          }}
          onReject={() => {
            api()?.respondPermission(aiSafetyData.reqId, false);
            setShowAiSafety(false);
            setAiSafetyData(null);
          }}
        />
      )}

      {/* Plan Approval Modal */}
      {pendingPlanApproval && (
        <PlanApprovalModal
          reqId={pendingPlanApproval.reqId}
          plan={pendingPlanApproval.plan}
          onApprove={(reqId) => {
            api()?.sendPlanDecision(reqId, true);
            setPendingPlanApproval(null);
          }}
          onReject={(reqId) => {
            api()?.sendPlanDecision(reqId, false);
            setPendingPlanApproval(null);
          }}
        />
      )}

      <StatusBar
        repoPath={repoPath}
        activeLanguage={activeTab?.language}
        cursorSymbol={cursorSymbol}
        cursorLine={activeCursorPos.line}
        cursorCol={activeCursorPos.col}
        lsStatus={lsStatus}
        healthScore={healthScore}
        tabSize={editorTabSize}
        useTabs={editorUseTabs}
        eol={editorEol}
        onChangeLanguage={(lang) => {
          if (!activeTab) return;
          setTabs(p => p.map((t, i) => i === activeTabIndex ? { ...t, language: lang } : t));
        }}
        onChangeIndentation={(size, useTab) => {
          setEditorTabSize(size);
          setEditorUseTabs(useTab);
          handleUpdateSettings({ ...settings, tabSize: size });
          activeEditorRef.current?.updateOptions({ tabSize: size, insertSpaces: !useTab });
        }}
        onChangeEol={(eol) => {
          setEditorEol(eol);
          const model = activeEditorRef.current?.getModel?.();
          if (model) model.setEOL(eol === "CRLF" ? 0 : 1);
        }}
        onGoToLine={() => { activeEditorRef.current?.getAction?.("editor.action.gotoLine")?.run(); }}
      />
      <CommandPaletteQuickPicker
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
      />
    </div>
  );
}

export function App() {
  return (
    <QuickInputProvider>
      <NotificationProvider>
        <DialogProvider>
          <ContextMenuProvider>
            <AppInner />
          </ContextMenuProvider>
        </DialogProvider>
      </NotificationProvider>
    </QuickInputProvider>
  );
}

const tabDropdownItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "6px 10px",
  fontSize: "12px",
  color: "#fafafa",
  borderRadius: "4px",
  cursor: "pointer",
  transition: "background 0.1s ease",
};

const s: Record<string,React.CSSProperties> = {
  /* ---- Root Shell ---- */
  root:{ display:"flex",flexDirection:"column",height:"100vh",width:"100vw",backgroundColor:"var(--bg-base)",color:"var(--text-main)",fontFamily:"var(--font-ui)",overflow:"hidden",userSelect:"none" },

  /* ---- Titlebar ---- */
  titlebar:{ display:"flex",alignItems:"center",height:"36px",backgroundColor:"var(--bg-header)",borderBottom:"1px solid var(--border-subtle)",flexShrink:0,WebkitAppRegion:"drag" } as any,
  tbLeft:{ display:"flex",alignItems:"center",flexShrink:0,paddingLeft:"12px",gap:"4px" },
  logo:{ width:"16px",height:"16px",objectFit:"contain",marginRight:"8px",flexShrink:0,opacity:0.9 },
  menuWrapper:{ position:"relative" as const },
  menuItem:{ background:"none",border:"none",color:"var(--text-secondary)",fontSize:"13px",cursor:"pointer",padding:"4px 10px",borderRadius:"var(--radius-sm)",transition:"all 0.15s ease",WebkitAppRegion:"no-drag",fontWeight:500 } as any,
  menuItemOn:{ backgroundColor:"var(--bg-hover-strong)",color:"var(--text-main)" },
  dropdown:{ position:"absolute" as const,top:"34px",left:"0",backgroundColor:"var(--bg-glass-strong)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",border:"1px solid var(--border-medium)",borderRadius:"var(--radius-md)",minWidth:"240px",zIndex:9999,boxShadow:"var(--shadow-lg), var(--shadow-panel)",padding:"6px 0",WebkitAppRegion:"no-drag",animation:"slideDownFade 0.2s cubic-bezier(0.16,1,0.3,1) forwards" } as any,
  dropItem:{ display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",background:"none",border:"none",color:"var(--text-secondary)",fontSize:"13px",padding:"8px 16px",cursor:"pointer",textAlign:"left" as const,gap:"24px",transition:"all 0.1s",borderRadius:"0" },
  dropDisabled:{ color:"var(--text-faint)",cursor:"default" },
  dropSep:{ height:"1px",backgroundColor:"var(--border-medium)",margin:"6px 12px" },
  dropShortcut:{ color:"var(--text-faint)",fontSize:"11px",flexShrink:0,fontFamily:"var(--font-mono)" },
  tbCenter:{ position:"absolute" as const,left:"50%",transform:"translateX(-50%)",pointerEvents:"none",display:"flex",alignItems:"center",justifyContent:"center",padding:"4px 80px",backgroundColor:"var(--bg-glass)",backdropFilter:"blur(8px)",borderRadius:"var(--radius-md)",border:"1px solid var(--border-medium)",boxShadow:"var(--shadow-sm)",minWidth:"320px",transition:"all 0.2s" },
  centerTxt:{ fontSize:"12px",color:"var(--text-main)",whiteSpace:"nowrap" as const,letterSpacing:"0.2px",fontWeight:500 },
  tbRight:{ display:"flex",alignItems:"center",marginLeft:"auto",gap:"2px",paddingRight:"4px" },
  iconBtn:{ width:"32px",height:"32px",background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"var(--radius-sm)",transition:"all 0.15s",WebkitAppRegion:"no-drag" } as any,
  iconOn:{ color:"var(--text-main)", backgroundColor:"var(--bg-hover)" },
  winSep:{ width:"1px",height:"16px",backgroundColor:"var(--border-medium)",margin:"0 6px",flexShrink:0 },
  wc:{ width:"46px",height:"32px",background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",WebkitAppRegion:"no-drag",borderRadius:"0" } as any,
  wcClose:{ },

  /* ---- Body ---- */
  body:{ display:"flex",flex:1,overflow:"hidden", backgroundColor:"var(--bg-base)" },

  /* ---- Activity Bar ---- */
  actBar:{ width:"52px",backgroundColor:"var(--bg-activity)",borderRight:"1px solid var(--border-subtle)",display:"flex",flexDirection:"column",justifyContent:"space-between",paddingTop:"12px",paddingBottom:"12px",flexShrink:0,zIndex:2 },
  actTop:{ display:"flex",flexDirection:"column",gap:"8px",alignItems:"center" },
  actBot:{ display:"flex",flexDirection:"column",alignItems:"center",gap:"8px" },
  actBtn:{ width:"48px",height:"48px",border:"none",background:"transparent",color:"var(--text-faint)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s var(--ease-out)",position:"relative" as const, borderRadius:"var(--radius-md)", margin:"0 2px" },
  actOn:{ color:"var(--text-main)", backgroundColor:"var(--bg-hover)" },
  actLbl:{ display:"none" },

  /* ---- Sidebar ---- */
  sidebar:{ backgroundColor:"var(--bg-panel)",borderRight:"1px solid var(--border-subtle)",display:"flex",flexDirection:"column",overflow:"hidden",flexShrink:0,boxShadow:"var(--shadow-sm)" },

  /* ---- Resizers ---- */
  resizerX:{ width:"4px",backgroundColor:"transparent",cursor:"col-resize",zIndex:10,transition:"background-color 0.2s",flexShrink:0 },
  resizerY:{ height:"4px",backgroundColor:"transparent",cursor:"row-resize",zIndex:10,transition:"background-color 0.2s",flexShrink:0 },

  /* ---- Editor Area ---- */
  center:{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden",backgroundColor:"var(--bg-base)" },
  tabBar:{ display:"flex",height:"32px",backgroundColor:"var(--bg-panel)",borderBottom:"1px solid var(--border-subtle)",alignItems:"center",padding:"0", overflowX:"auto", overflowY:"hidden" },
  tab:{ display:"flex",alignItems:"center",gap:"6px",padding:"0 10px 0 12px",minWidth:"120px",maxWidth:"200px",height:"100%",backgroundColor:"var(--bg-panel)",borderRight:"1px solid var(--border-subtle)",color:"var(--text-faint)",fontSize:"12px",cursor:"pointer",borderTop:"2px solid transparent",flexShrink:0,transition:"all 0.15s ease",position:"relative" as const },
  tabOn:{ backgroundColor:"var(--bg-base)",color:"var(--accent)",borderTop:"2px solid var(--accent)", boxShadow:"inset 0 1px 0 rgba(255,255,255,0.05)" },
  tabName:{ flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const,fontWeight:500,letterSpacing:"0.2px" },
  tabDot:{ color:"var(--text-main)",fontSize:"12px",lineHeight:"1",flexShrink:0 },
  tabX:{ fontSize:"14px",color:"var(--text-muted)",padding:"4px",cursor:"pointer",borderRadius:"var(--radius-sm)",transition:"all 0.15s ease",opacity:0,lineHeight:"1",display:"flex",alignItems:"center" },
  editorArea:{ flex:1,overflow:"hidden",position:"relative" as const },
  splitPlaceholder:{ display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:"var(--text-faint)",fontSize:"13px",backgroundColor:"var(--bg-base)", fontWeight:500 },

  /* ---- Welcome Screen ---- */
  welcome:{ display:"flex",alignItems:"center",justifyContent:"center",height:"100%",backgroundColor:"var(--bg-base)",position:"relative" as const },
  welcomeLogoBg:{ position:"absolute" as const,width:"420px",height:"420px",objectFit:"contain",opacity:0.02,pointerEvents:"none" as const,top:"50%",left:"50%",transform:"translate(-50%, -50%)",filter:"blur(0px)" },
  welcomeCard:{ display:"flex",flexDirection:"column",alignItems:"flex-start",padding:"32px",maxWidth:"480px",width:"100%",zIndex:1, backgroundColor:"var(--bg-panel)", borderRadius:"var(--radius-lg)", border:"1px solid var(--border-medium)", boxShadow:"var(--shadow-lg)" },
  welcomeH2:{ margin:"0 0 8px",fontSize:"28px",fontWeight:400,color:"var(--text-main)",letterSpacing:"-0.5px" },
  welcomeP:{ margin:"0 0 32px",fontSize:"14px",color:"var(--text-muted)",lineHeight:"1.6" },
  welcomeRow:{ display:"flex",flexDirection:"column" as const,gap:"8px",width:"100%",alignItems:"flex-start" },
  wBtnLink:{ background:"transparent",border:"none",color:"var(--accent)",padding:"0",fontSize:"14px",cursor:"pointer",textDecoration:"none",transition:"all 0.15s",opacity:0.9, fontWeight:500 },
  recentBox:{ marginTop:"40px",width:"100%",display:"flex",flexDirection:"column",gap:"4px" },
  recentHdr:{ fontSize:"11px",fontWeight:700,color:"var(--text-faint)",margin:"0 0 12px",letterSpacing:"1px",textTransform:"uppercase" as const },
  recentItem:{ display:"flex",flexDirection:"column" as const,alignItems:"flex-start",backgroundColor:"transparent",padding:"10px 14px",cursor:"pointer",textAlign:"left" as const,transition:"all 0.15s ease",borderRadius:"var(--radius-md)",width:"100%", border:"1px solid transparent" },
  recentName:{ fontSize:"14px",color:"var(--text-main)",marginBottom:"4px",fontWeight:600 },
  recentPath:{ fontSize:"12px",color:"var(--text-faint)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const,width:"100%" },

  /* ---- Bottom Dock ---- */
  dock:{ backgroundColor:"var(--bg-panel)",borderTop:"1px solid var(--border-subtle)",display:"flex",flexDirection:"column",flexShrink:0, boxShadow:"var(--shadow-sm)" },
  dockTabs:{ display:"flex",height:"32px",backgroundColor:"transparent",borderBottom:"1px solid var(--border-subtle)",flexShrink:0,paddingLeft:"8px", gap:"4px", alignItems:"center" },
  dockTab:{ background:"none",border:"none",borderBottom:"2px solid transparent",color:"var(--text-faint)",padding:"0 16px",height:"100%",fontSize:"11px",cursor:"pointer",transition:"all 0.15s ease",letterSpacing:"0.5px",fontWeight:600, textTransform:"uppercase" as const },
  dockOn:{ color:"var(--accent)",borderBottom:"2px solid var(--accent)" },
  dockContent:{ flex:1,overflow:"hidden", backgroundColor:"var(--bg-base)" },
  log:{ padding:"12px 16px",fontFamily:"var(--font-mono)",fontSize:"13px",overflowY:"auto" as const,height:"100%" },
  logLine:{ color:"var(--text-secondary)",lineHeight:"1.8",margin:0 },
  logDim:{ color:"var(--text-faint)",margin:0 },

  /* ---- Agent Pane ---- */
  agentPane:{ display:"flex",flexDirection:"column",height:"100%",padding:"12px",gap:"12px" },
  paneHdr:{ fontSize:"11px",fontWeight:700,letterSpacing:"1px",color:"var(--text-muted)",margin:0,textTransform:"uppercase" as const },
  agentArea:{ flex:1,maxHeight:"120px",backgroundColor:"var(--bg-base)",border:"1px solid var(--border-medium)",color:"var(--text-main)",borderRadius:"var(--radius-md)",padding:"10px 12px",fontSize:"13px",resize:"none" as const,fontFamily:"inherit",lineHeight:"1.6", transition:"all 0.2s", boxShadow:"inset 0 2px 4px rgba(0,0,0,0.2)" },
  agentBtn:{ backgroundColor:"var(--accent)",color:"#fff",border:"none",borderRadius:"var(--radius-md)",padding:"8px 16px",fontWeight:600,fontSize:"13px",cursor:"pointer",transition:"all 0.15s", boxShadow:"var(--shadow-sm)" },
};