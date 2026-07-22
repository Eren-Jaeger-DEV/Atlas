import "./global.css";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { EditorPane } from "./components/EditorPane.js";
import { FileExplorer } from "./components/FileExplorer.js";
import { GlobalSearchPanel } from "./components/GlobalSearchPanel.js";
import { GitPanel } from "./components/GitPanel.js";
import { ImpactPanel } from "./components/ImpactPanel.js";
import { ProblemsPanel } from "./components/ProblemsPanel.js";
import { OutputPanel } from "./components/OutputPanel.js";
import { TerminalPanel } from "./components/TerminalPanel.js";
import { DiffViewer } from "./components/DiffViewer.js";
import { CommandPalette } from "./components/CommandPalette.js";
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
import { AccountPanel } from "./components/AccountPanel.js";
import { ReleaseManagerPanel } from "./components/ReleaseManagerPanel.js";
import { AboutAtlasModal } from "./components/AboutAtlasModal.js";
import { KeybindingsPanel, DEFAULT_KEYBINDINGS } from "./components/KeybindingsPanel.js";
import { ThemeSelectorPanel } from "./components/ThemeSelectorPanel.js";
import { ThemeManager } from "./components/ThemeManager.js";
import { OutlinePanel, DocumentSymbol } from "./components/OutlinePanel.js";
import { Tooltip } from "./components/Tooltip.js";
import logoImg from "./assets/logo.png";
import { CommandService, BrowserStorageProvider } from "@atlas/core";
const storageProvider = new BrowserStorageProvider();
function getSync(key: string) {
  const res = storageProvider.getItem(key);
  return res instanceof Promise ? null : res;
}

interface EditorTab { 
  filePath: string;
  isDirty?: boolean;
  content: string;
  language: string;
  targetLine?: number;
  targetColumn?: number;
  isBinary?: boolean;
}
type SidebarView = "explorer" | "search" | "git" | "debug" | "history" | "timeline" | "impact" | "graph" | "health" | "extensions" | "account" | "release" | "ai" | "settings" | "outline";
type BottomTab = "terminal" | "problems" | "output" | "ai";

interface MenuItem { label: string; shortcut?: string; action?: () => void; separator?: boolean; disabled?: boolean; }

function BinaryFileView({ onOpenAnyway }: { onOpenAnyway: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', color: 'var(--text-main, #e4e4e7)', backgroundColor: '#000000', fontFamily: 'system-ui' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px', color: '#fbbf24' }}>[WARN]</div>
      <p style={{ maxWidth: '400px', textAlign: 'center', lineHeight: '1.5', marginBottom: '24px' }}>
        The file is not displayed in the text editor because it is either binary or uses an unsupported text encoding.
      </p>
      <button 
        style={{ padding: '8px 16px', backgroundColor: 'transparent', color: 'var(--text-main, #e4e4e7)', border: '1px solid #27272a', borderRadius: '2px', cursor: 'pointer' }}
        onClick={onOpenAnyway}
        onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--border-color, #27272a)'}
        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        Open Anyway
      </button>
    </div>
  );
}

const api = () => window.atlasAPI;

export function App() {
  const [repoPath, setRepoPath]             = useState<string | undefined>(() => {
    const last = getSync("atlas_last_repo");
    if (last) return last;
    try {
      const stored = JSON.parse(getSync("atlas_workspace_roots") || "[]");
      if (Array.isArray(stored) && stored.length > 0) return stored[0];
    } catch (err) {
      console.warn("[WARN] Failed to parse atlas_workspace_roots from localStorage:", err);
    }
    return undefined;
  });
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
  const [showRightAiSidebar, setShowRightAiSidebar] = useState(true);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [isSplit, setIsSplit]                       = useState(false);
  const [splitTabIndex, setSplitTabIndex]           = useState(0);
  const [showMergeConflict, setShowMergeConflict]   = useState(false);
  const [showAiSafety, setShowAiSafety]             = useState(false);
  const [aiSafetyData, setAiSafetyData]             = useState<any>(null);
  
  // Plan Approval state
  const [pendingPlanApproval, setPendingPlanApproval] = useState<{ reqId: string, plan: any } | null>(null);
  const [showInlineAi, setShowInlineAi]             = useState(false);
  const [showAboutModal, setShowAboutModal]         = useState(false);
  const [showKeybindings, setShowKeybindings]       = useState(false);
  const [showThemeSelector, setShowThemeSelector]   = useState(false);
  const [activeCursorPos, setActiveCursorPos]       = useState({ line: 1, col: 1 });
  const [sidebarWidth, setSidebarWidth]             = useState(240);
  const [rightSidebarWidth, setRightSidebarWidth]   = useState(320);
  const [bottomPanelHeight, setBottomPanelHeight]   = useState(220);
  const draggingRef = useRef<"sidebar" | "bottom" | "right-sidebar" | null>(null);

  const [settings, setSettings]       = useState<EditorSettings>(DEFAULT_SETTINGS);
  const [tabs, setTabs]               = useState<EditorTab[]>([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [activeDiff, setActiveDiff]   = useState<{ filePath: string; diffText: string } | null>(null);
  const [cursorSymbol, setCursorSymbol] = useState<string | undefined>();
  const [activeSymbols, setActiveSymbols] = useState<DocumentSymbol[]>([]);
  const [aiGoal, setAiGoal]           = useState("");
  const [aiRunning, setAiRunning]     = useState(false);
  const [aiEvents, setAiEvents]       = useState<string[]>([]);
  const [openMenu, setOpenMenu]       = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const activeTab = tabs[activeTabIndex];
  const splitTab = tabs[splitTabIndex];
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
          if (state.ui.sidebarWidth !== undefined) setSidebarWidth(Number(state.ui.sidebarWidth));
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
      console.error("Failed to open file:", err);
    };
  }, []);

  const saveRecentProject = useCallback((path: string) => {
    setRecentProjects(prev => {
      const updated = [path, ...prev.filter(p => p !== path)].slice(0, 10);
      storageProvider.setItem("atlas_recent_projects", JSON.stringify(updated));
      return updated;
    });
    storageProvider.setItem("atlas_last_repo", path);
  }, []);

  const handleSelectRepo = useCallback(async () => {
    const a = api(); if (!a?.selectDirectory) return;
    const sel = await a.selectDirectory();
    if (sel) {
      setRepoPath(sel);
      setWorkspaceRoots([sel]);
      storageProvider.setItem("atlas_workspace_roots", JSON.stringify([sel]));
      saveRecentProject(sel);
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
          console.error("Format on save failed:", err);
        }
      }
    }
    
    await api().writeFile(activeTab.filePath, contentToSave);
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
        if (s) setSettings(s);
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
        setSidebarWidth(Math.max(100, Math.min(e.clientX - 40, 800)));
      } else if (draggingRef.current === "bottom") {
        setBottomPanelHeight(Math.max(100, Math.min(window.innerHeight - e.clientY - 22, 800)));
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
  }, []);

  useEffect(() => {
    ThemeManager.getInstance().setStorageProvider(storageProvider);
    ThemeManager.getInstance().loadSavedTheme();
  }, []);

  useEffect(() => {
    const tm = ThemeManager.getInstance();
    if (settings.theme === "custom" && settings.customThemeColors) {
      tm.setCustomTheme(settings.customThemeColors);
    } else if (settings.theme === "light") {
      tm.setLightMode();
    } else {
      tm.setDarkMode(); // obsidian, midnight, monokai handle variants internally or we just default to dark UI
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
      { label:"New File",              shortcut:"Ctrl+N",       action:()=>{} },
      { label:"Open Workspace Folder", shortcut:"Ctrl+O",       action:handleSelectRepo },
      { label:"Add Folder to Workspace...",                     action:handleAddFolder },
      { label:"separator", separator:true },
      { label:"Save",                  shortcut:"Ctrl+S",       action:handleSave },
      { label:"Save All",              shortcut:"Ctrl+Shift+S", action:handleSave },
      { label:"separator2", separator:true },
      { label:"Close Editor",          shortcut:"Ctrl+W",       action:()=>{ if(tabs.length>0) setTabs(p=>p.filter((_,i)=>i!==activeTabIndex)); } },
      { label:"separator3", separator:true },
      { label:"Exit",                  shortcut:"Alt+F4",       action:()=>api()?.windowClose() },
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
      { label:"Dependency Graph",    shortcut:"",             action:()=>setActiveSidebar("graph") },
      { label:"Project Health",      shortcut:"",             action:()=>setActiveSidebar("health") },
      { label:"Account & Cloud Sync",shortcut:"",             action:()=>setActiveSidebar("account") },
      { label:"Release Engineering", shortcut:"",             action:()=>setActiveSidebar("release") },
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
      commandService.registerCommand("show-account", "Account & Cloud Sync", () => setActiveSidebar("account")),
      commandService.registerCommand("show-release", "Release Engineering & Updates", () => setActiveSidebar("release")),
      commandService.registerCommand("inline-ai", "Inline AI Assistant", () => setShowInlineAi(p=>!p), "Ctrl+I"),
      commandService.registerCommand("ai-safety", "AI Proposed Edit Preview", () => setShowAiSafety(true)),
      commandService.registerCommand("show-history", "Git History & Graph", () => setActiveSidebar("history")),
      commandService.registerCommand("merge-resolver", "3-Way Merge Conflict Resolver", () => setShowMergeConflict(p=>!p)),
      commandService.registerCommand("show-graph", "Dependency Graph", () => setActiveSidebar("graph")),
      commandService.registerCommand("show-health", "Project Health", () => setActiveSidebar("health")),
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
                      : <button
                          key={i}
                          className="drop-item"
                          style={{ ...s.dropItem, ...(item.disabled ? s.dropDisabled : {}) }}
                          disabled={item.disabled}
                          onClick={() => { item.action?.(); setOpenMenu(null); }}
                        >
                          <span>{item.label}</span>
                          {item.shortcut && <span style={s.dropShortcut}>{item.shortcut}</span>}
                        </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={s.tbCenter}>
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
        <nav style={s.actBar}>
          <div style={s.actTop}>
            {([
              {id:"explorer",  lbl:"Explorer",icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>},
              {id:"search",    lbl:"Search",  icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>},
              {id:"git",       lbl:"Git",     icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>},
              {id:"debug",     lbl:"Debug",   icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>},
              {id:"history",   lbl:"History", icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>},
              {id:"timeline",  lbl:"Timeline",icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h16M4 12h16M4 18h7"/></svg>},
              {id:"impact",    lbl:"Impact",  icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>},
              {id:"graph",     lbl:"Graph",   icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/></svg>},
              {id:"health",    lbl:"Health",  icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>},
              {id:"account",   lbl:"Account", icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>},
              {id:"release",   lbl:"Release", icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>},
              {id:"extensions",lbl:"Market",  icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>},
              {id:"ai",        lbl:"Agent",   icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="15" x2="23" y2="15"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="15" x2="4" y2="15"/></svg>},
            ] as {id:SidebarView;lbl:string;icon:React.ReactNode}[]).map(({id,lbl,icon})=>(
              <Tooltip key={id} content={lbl} position={settings.sidebarPosition === "right" ? "left" : "right"}>
                <button style={{...s.actBtn,...(activeSidebar===id?s.actOn:{})}} onClick={()=>setActiveSidebar(id)}>
                  <span style={{ opacity: activeSidebar===id ? 1 : 0.6 }}>{icon}</span>
                </button>
              </Tooltip>
            ))}
          </div>
          <div style={s.actBot}>
            <Tooltip content="Settings" position={settings.sidebarPosition === "right" ? "left" : "right"}>
              <button style={s.actBtn} onClick={handleOpenSettings}>
                <span style={{ opacity: 0.6 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-2.82-1.17l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 2.82 1.17l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 2z"/></svg>
                </span>
              </button>
            </Tooltip>
          </div>
        </nav>

        <aside style={{ ...s.sidebar, width: `${sidebarWidth}px`, borderRight: settings.sidebarPosition === "right" ? "none" : "1px solid #27272a", borderLeft: settings.sidebarPosition === "right" ? "1px solid #27272a" : "none" }}>
          {activeSidebar==="explorer"   && <FileExplorer workspaceRoots={workspaceRoots} onOpenFile={handleOpenFile} onSelectRepo={handleSelectRepo} onAddFolder={handleAddFolder}/>}
          {activeSidebar==="search"     && <GlobalSearchPanel workspaceRoot={repoPath!} onFileSelect={(f, l) => handleOpenFile(f, l)} />}
          {activeSidebar==="git"        && <GitPanel repoPath={repoPath} onViewDiff={handleViewDiff}/>}
          {activeSidebar==="debug"      && <DebugPanel />}
          {activeSidebar==="history"    && <GitHistoryPanel repoPath={repoPath}/>}
          {activeSidebar==="timeline"   && <TimelinePanel repoPath={repoPath}/>}
          {activeSidebar==="impact"     && <ImpactPanel filePath={activeTab?.filePath} symbolName={cursorSymbol}/>}
          {activeSidebar==="graph"      && <DependencyGraph repoPath={repoPath}/>}
          {activeSidebar==="outline"    && <OutlinePanel symbols={activeSymbols} activeLine={activeCursorPos.line} onSymbolClick={(sym) => { if(activeTab) openFile(activeTab.filePath, sym.range.start.line + 1, sym.range.start.character + 1); }} />}
          {activeSidebar==="health"     && <ProjectHealth repoPath={repoPath} />}
          {activeSidebar==="account"    && <AccountPanel repoPath={repoPath} />}
          {activeSidebar==="release"    && <ReleaseManagerPanel />}
          {activeSidebar==="extensions" && <ExtensionGallery />}
          {activeSidebar==="ai"         && (
            <div style={s.agentPane}>
              <p style={s.paneHdr}>ATLAS AI AGENT</p>
              <textarea style={s.agentArea} placeholder="Describe task..." value={aiGoal} onChange={e=>setAiGoal(e.target.value)}/>
              <button style={s.agentBtn} disabled={aiRunning} onClick={async()=>{
                if(!aiGoal.trim()||!repoPath) return;
                const a=api(); if(!a?.run) return;
                setAiRunning(true);
                try { const r=await a.run(aiGoal); setAiEvents(p=>[...p,r.error?`[FAIL] ${r.error}`:"[PASS] Done"]); }
                catch(e){ setAiEvents(p=>[...p,`[FAIL] ${e}`]); } finally { setAiRunning(false); }
              }}>{aiRunning?"Running...":"Run Agent"}</button>
            </div>
          )}
        </aside>

        <div style={s.resizerX} onMouseDown={e => { e.preventDefault(); draggingRef.current = "sidebar"; document.body.style.cursor = "col-resize"; }} />

        <div style={{...s.center, flexDirection: settings.terminalPosition === "right" ? "row" : "column"}} onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div style={s.tabBar}>
            {tabs.map((tab,i)=>(
              <div key={tab.filePath} style={{...s.tab,...(i===activeTabIndex&&!activeDiff?s.tabOn:{})}} onClick={()=>{setActiveDiff(null);setActiveTabIndex(i);}}>
                <span style={s.tabName}>{tab.filePath.split(/[/\\]/).pop()}</span>
                {tab.isDirty && <span style={s.tabDot}>*</span>}
                <span style={s.tabX} onClick={e=>handleCloseTab(i,e)}>x</span>
              </div>
            ))}
          </div>

          {activeTab && <Breadcrumb filePath={activeTab.filePath} repoPath={repoPath} cursorSymbol={cursorSymbol} />}

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

            {showMergeConflict ? (
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
                        onCursorChange={(l, line, col)=>{ 
                          setActiveCursorPos({ line, col });
                          const m=l.match(/\b([A-Za-z_]\w*)\b/); 
                          if(m) setCursorSymbol(m[1]); 
                        }}
                        onSymbolsChange={(symbols, currentSymbol) => {
                          setActiveSymbols(symbols);
                          if(currentSymbol) setCursorSymbol(currentSymbol);
                        }}
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
                      onClick={handleSelectRepo} 
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

          {showBottomPanel && <div style={settings.terminalPosition === "right" ? s.resizerX : s.resizerY} onMouseDown={e => { e.preventDefault(); draggingRef.current = "bottom"; document.body.style.cursor = settings.terminalPosition === "right" ? "col-resize" : "row-resize"; }} />}

          {showBottomPanel && (
            <div style={{ ...s.dock, width: settings.terminalPosition === "right" ? `${bottomPanelHeight}px` : undefined, height: settings.terminalPosition === "right" ? "100%" : `${bottomPanelHeight}px`, borderTop: settings.terminalPosition === "right" ? "none" : "1px solid var(--border-color, #27272a)", borderLeft: settings.terminalPosition === "right" ? "1px solid var(--border-color, #27272a)" : "none" }}>
              <div style={s.dockTabs}>
                {(["terminal","problems","output","ai"] as BottomTab[]).map(t=>(
                  <button key={t} style={{...s.dockTab,...(bottomTab===t?s.dockOn:{})}} onClick={()=>setBottomTab(t)}>
                    {t==="terminal"?"TERMINAL":t==="problems"?"PROBLEMS":t==="output"?"OUTPUT":"AI STREAM"}
                  </button>
                ))}
                <button style={{...s.dockTab,marginLeft:"auto",fontSize:"10px"}} onClick={()=>setShowBottomPanel(false)}>x</button>
              </div>
              <div style={{flex:1, overflow:"hidden"}}>
                {bottomTab==="terminal" && <TerminalPanel repoPath={repoPath}/>}
                {bottomTab==="problems" && <ProblemsPanel onJump={(p,l,c) => openFile(p,l,c)}/>}
                {bottomTab==="output"   && <OutputPanel/>}
                {bottomTab==="ai"       && <div style={s.log}>{aiEvents.length===0?<p style={s.logDim}>No agent runs.</p>:aiEvents.map((e,i)=><p key={i} style={s.logLine}>{e}</p>)}</div>}
              </div>
            </div>
          )}
        </div>

        {showRightAiSidebar && <div style={s.resizerX} onMouseDown={e => { e.preventDefault(); draggingRef.current = "right-sidebar"; document.body.style.cursor = "col-resize"; }} />}
        {showRightAiSidebar && <AiSidebar width={rightSidebarWidth} repoPath={repoPath} activeFilePath={activeTab?.filePath} activeContent={activeTab?.content} openTabs={tabs.map(t => ({ filePath: t.filePath, content: t.content }))} cursorLine={activeCursorPos?.line} cursorSymbol={cursorSymbol} onClose={() => setShowRightAiSidebar(false)} />}
      </div>

      {showAboutModal && <AboutAtlasModal onClose={()=>setShowAboutModal(false)} />}
      
      {showKeybindings && <KeybindingsPanel onClose={() => setShowKeybindings(false)} />}

      {showThemeSelector && <ThemeSelectorPanel onClose={() => setShowThemeSelector(false)} />}

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
      />
      <CommandPalette isOpen={showCommandPalette} commandService={commandService} onClose={()=>setShowCommandPalette(false)}/>
    </div>
  );
}

const s: Record<string,React.CSSProperties> = {
  root:{ display:"flex",flexDirection:"column",height:"100vh",width:"100vw",backgroundColor:"#000000",color:"var(--text-main, #e4e4e7)",fontFamily:"Inter,-apple-system,'Segoe UI',sans-serif",overflow:"hidden",userSelect:"none" },
  titlebar:{ display:"flex",alignItems:"center",height:"28px",backgroundColor:"#000000",borderBottom:"1px solid #27272a",flexShrink:0,WebkitAppRegion:"drag" } as any,
  tbLeft:{ display:"flex",alignItems:"center",flexShrink:0,paddingLeft:"6px",gap:"0" },
  logo:{ width:"16px",height:"16px",objectFit:"contain",marginRight:"6px",flexShrink:0 },
  menuWrapper:{ position:"relative" as const },
  menuItem:{ background:"none",border:"none",color:"var(--text-muted, #a1a1aa)",fontSize:"12px",padding:"0 8px",height:"28px",cursor:"pointer",display:"flex",alignItems:"center",whiteSpace:"nowrap" as const,transition:"all 0.2s cubic-bezier(0.4,0,0.2,1)" },
  menuItemOn:{ backgroundColor:"var(--border-color, #27272a)",color:"var(--text-main, #fafafa)" },
  dropdown:{ position:"absolute" as const,top:"28px",left:"0",backgroundColor:"#050505",border:"1px solid #27272a",minWidth:"220px",zIndex:9999,boxShadow:"0 8px 32px rgba(0,0,0,0.6)",padding:"4px 0",WebkitAppRegion:"no-drag" } as any,

  dropItem:{ display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",background:"none",border:"none",color:"var(--text-main, #e4e4e7)",fontSize:"12px",padding:"5px 16px",cursor:"pointer",textAlign:"left" as const,gap:"24px",transition:"background 0.15s" },
  dropDisabled:{ color:"#52525b",cursor:"default" },
  dropSep:{ height:"1px",backgroundColor:"var(--border-color, #27272a)",margin:"3px 8px" },
  dropShortcut:{ color:"#94a3b8",fontSize:"11px",flexShrink:0 },
  tbCenter:{ position:"absolute" as const,left:"50%",transform:"translateX(-50%)",pointerEvents:"none" },
  centerTxt:{ fontSize:"12px",color:"#94a3b8",whiteSpace:"nowrap" as const },
  tbRight:{ display:"flex",alignItems:"center",marginLeft:"auto",gap:"0" },
  iconBtn:{ width:"28px",height:"28px",background:"none",border:"none",color:"#94a3b8",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"0",transition:"color 0.2s" },
  iconOn:{ color:"var(--text-main, #fafafa)" },
  winSep:{ width:"1px",height:"14px",backgroundColor:"var(--border-color, #27272a)",margin:"0 4px" },
  wc:{ width:"46px",height:"28px",background:"none",border:"none",color:"#94a3b8",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.2s" },
  wcClose:{ },
  body:{ display:"flex",flex:1,overflow:"hidden" },
  actBar:{ width:"48px",backgroundColor:"#000000",borderRight:"1px solid #27272a",display:"flex",flexDirection:"column",justifyContent:"space-between",paddingTop:"4px",paddingBottom:"4px",flexShrink:0 },
  actTop:{ display:"flex",flexDirection:"column",gap:"0",alignItems:"center" },
  actBot:{ display:"flex",flexDirection:"column",alignItems:"center" },
  actBtn:{ width:"48px",padding:"10px 0",border:"none",background:"transparent",color:"#64748b",cursor:"pointer",display:"flex",flexDirection:"column" as const,alignItems:"center",gap:"4px",borderRadius:"0",transition:"color 0.1s" },
  actOn:{ color:"var(--text-main, #fafafa)",borderLeft:"2px solid #38bdf8" },
  actLbl:{ display:"none" },
  sidebar:{ backgroundColor:"#000000",borderRight:"1px solid #27272a",display:"flex",flexDirection:"column",overflow:"hidden",flexShrink:0 },
  resizerX: { width: "4px", backgroundColor: "transparent", cursor: "col-resize", zIndex: 10, transition: "background-color 0.2s" },
  resizerY: { height: "4px", backgroundColor: "transparent", cursor: "row-resize", zIndex: 10, transition: "background-color 0.2s" },
  center:{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden" },
  tabBar:{ display:"flex",height:"35px",backgroundColor:"#000000",borderBottom:"1px solid #27272a",overflowX:"auto" as const,flexShrink:0 },
  tab:{ display:"flex",alignItems:"center",gap:"5px",padding:"0 12px",minWidth:"80px",maxWidth:"160px",backgroundColor:"#000000",borderRight:"1px solid #27272a",color:"#94a3b8",fontSize:"13px",cursor:"pointer",borderTop:"2px solid transparent",flexShrink:0,transition:"all 0.1s" },
  tabOn:{ backgroundColor:"var(--bg-base, #09090b)",color:"var(--text-main, #e4e4e7)",borderTop:"2px solid #38bdf8" },
  tabName:{ flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const,fontWeight:400 },
  tabDot:{ color:"var(--text-main, #fafafa)",fontSize:"14px" },
  tabX:{ fontSize:"12px",opacity:0.5,padding:"0 2px",cursor:"pointer",transition:"opacity 0.2s" },
  editorArea:{ flex:1,overflow:"hidden",position:"relative" as const },
  splitPlaceholder:{ display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:"#64748b",fontSize:"12px",backgroundColor:"#000000" },
  welcome:{ display:"flex",alignItems:"center",justifyContent:"center",height:"100%",backgroundColor:"#000000",position:"relative" as const },
  welcomeLogoBg:{ position:"absolute" as const,width:"400px",height:"400px",objectFit:"contain",opacity:0.02,pointerEvents:"none" as const,top:"50%",left:"50%",transform:"translate(-50%, -50%)" },
  welcomeCard:{ display:"flex",flexDirection:"column",alignItems:"flex-start",padding:"20px",maxWidth:"400px",width:"100%",zIndex:1 },
  welcomeH2:{ margin:"0 0 8px",fontSize:"22px",fontWeight:400,color:"var(--text-main, #fafafa)" },
  welcomeP:{ margin:"0 0 24px",fontSize:"13px",color:"#64748b" },
  welcomeRow:{ display:"flex",flexDirection:"column" as const,gap:"8px",width:"100%",alignItems:"flex-start" },
  wBtnLink:{ background:"transparent",border:"none",color:"var(--accent, #38bdf8)",padding:"0",fontSize:"13px",cursor:"pointer",textDecoration:"none",transition:"color 0.1s" },
  recentBox:{ marginTop:"32px",width:"100%",display:"flex",flexDirection:"column",gap:"4px" },
  recentHdr:{ fontSize:"11px",fontWeight:600,color:"var(--text-main, #e4e4e7)",margin:"0 0 6px" },
  recentItem:{ display:"flex",flexDirection:"column" as const,alignItems:"flex-start",backgroundColor:"transparent",border:"none",padding:"6px 0",cursor:"pointer",textAlign:"left" as const,transition:"opacity 0.2s" },
  recentName:{ fontSize:"13px",color:"var(--accent, #38bdf8)",marginBottom:"2px" },
  recentPath:{ fontSize:"11px",color:"#64748b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const,width:"100%" },
  dock:{ backgroundColor:"#000000",borderTop:"1px solid #27272a",display:"flex",flexDirection:"column",flexShrink:0 },
  dockTabs:{ display:"flex",height:"24px",backgroundColor:"#000000",borderBottom:"1px solid #27272a",flexShrink:0 },
  dockTab:{ background:"none",border:"none",borderBottom:"1px solid transparent",borderRight:"1px solid transparent",color:"#94a3b8",padding:"0 12px",fontSize:"11px",cursor:"pointer",transition:"color 0.1s" },
  dockOn:{ color:"var(--text-main, #fafafa)",borderBottom:"1px solid #38bdf8" },
  dockContent:{ flex:1,overflow:"hidden" },
  log:{ padding:"6px 12px",fontFamily:"'JetBrains Mono',Consolas,monospace",fontSize:"12px",overflowY:"auto" as const,height:"100%" },
  logLine:{ color:"var(--text-main, #e4e4e7)",lineHeight:"1.6",margin:0 },
  logDim:{ color:"#52525b",margin:0 },
  agentPane:{ display:"flex",flexDirection:"column",height:"100%",padding:"10px",gap:"8px" },
  paneHdr:{ fontSize:"11px",fontWeight:700,letterSpacing:"0.8px",color:"var(--text-main, #e4e4e7)",margin:0 },
  agentArea:{ flex:1,maxHeight:"100px",backgroundColor:"#1a1a1e",border:"1px solid #27272a",color:"var(--text-main, #e4e4e7)",borderRadius:"6px",padding:"8px",fontSize:"12px",resize:"none" as const,fontFamily:"inherit" },
  agentBtn:{ backgroundColor:"var(--text-main, #e4e4e7)",color:"var(--bg-base, #09090b)",border:"none",borderRadius:"6px",padding:"8px",fontWeight:700,fontSize:"12px",cursor:"pointer" },
};