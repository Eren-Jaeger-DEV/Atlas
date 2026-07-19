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
import { CommandPalette, CommandItem } from "./components/CommandPalette.js";
import { SettingsPanel, EditorSettings, DEFAULT_SETTINGS } from "./components/SettingsPanel.js";
import { Breadcrumb } from "./components/Breadcrumb.js";
import { StatusBar } from "./components/StatusBar.js";
import { DebugPanel } from "./components/DebugPanel.js";
import { AiSidebar } from "./components/AiSidebar.js";
import { DependencyGraph } from "./components/DependencyGraph.js";
import { ProjectHealth } from "./components/ProjectHealth.js";
import { ExtensionGallery } from "./components/ExtensionGallery.js";
import { GitHistoryPanel } from "./components/GitHistoryPanel.js";
import { MergeConflictEditor } from "./components/MergeConflictEditor.js";
import { AiSafetyModal } from "./components/AiSafetyModal.js";
import { InlineAiTool } from "./components/InlineAiTool.js";
import { AccountPanel } from "./components/AccountPanel.js";
import { ReleaseManagerPanel } from "./components/ReleaseManagerPanel.js";
import { AboutAtlasModal } from "./components/AboutAtlasModal.js";
import logoImg from "./assets/logo.png";
import { CommandService } from "@atlas/core";

interface EditorTab { 
  filePath: string;
  isDirty?: boolean;
  content: string;
  language: string;
  targetLine?: number;
  targetColumn?: number;
}
type SidebarView = "explorer" | "search" | "git" | "debug" | "history" | "impact" | "graph" | "health" | "extensions" | "account" | "release" | "ai" | "settings";
type BottomTab = "terminal" | "problems" | "output" | "ai";

interface MenuItem { label: string; shortcut?: string; action?: () => void; separator?: boolean; disabled?: boolean; }

const api = () => (window as any).atlasAPI;

export function App() {
  const [repoPath, setRepoPath]             = useState<string | undefined>(() => localStorage.getItem("atlas_last_repo") || undefined);
  const [recentProjects, setRecentProjects] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("atlas_recent_projects") || "[]"); } catch { return []; }
  });
  const [activeSidebar, setActiveSidebar]   = useState<SidebarView>("explorer");
  const [bottomTab, setBottomTab]           = useState<BottomTab>("terminal");
  const [showBottomPanel, setShowBottomPanel]       = useState(true);
  const [showRightAiSidebar, setShowRightAiSidebar] = useState(true);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [isSplit, setIsSplit]                       = useState(false);
  const [splitTabIndex, setSplitTabIndex]           = useState(0);
  const [showMergeConflict, setShowMergeConflict]   = useState(false);
  const [showAiSafety, setShowAiSafety]             = useState(false);
  const [showInlineAi, setShowInlineAi]             = useState(false);
  const [showAboutModal, setShowAboutModal]         = useState(false);
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
  const [aiGoal, setAiGoal]           = useState("");
  const [aiRunning, setAiRunning]     = useState(false);
  const [aiEvents, setAiEvents]       = useState<string[]>([]);
  const [openMenu, setOpenMenu]       = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const activeTab = tabs[activeTabIndex];
  const splitTab = tabs[splitTabIndex];

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
          updated[idx] = { ...updated[idx], targetLine, targetColumn };
          setActiveTabIndex(idx);
          return updated;
        }
        setActiveTabIndex(prev.length);
        return [...prev, { filePath, content, language, targetLine, targetColumn }];
      });
    } catch (err) {
      console.error("Failed to open file:", err);
    }
  }, []);

  const saveRecentProject = useCallback((path: string) => {
    setRecentProjects(prev => {
      const updated = [path, ...prev.filter(p => p !== path)].slice(0, 10);
      localStorage.setItem("atlas_recent_projects", JSON.stringify(updated));
      return updated;
    });
    localStorage.setItem("atlas_last_repo", path);
  }, []);

  const handleSelectRepo = useCallback(async () => {
    const a = api(); if (!a?.selectDirectory) return;
    const sel = await a.selectDirectory();
    if (sel) {
      setRepoPath(sel);
      saveRecentProject(sel);
    }
  }, [saveRecentProject]);

  const handleOpenRecent = (path: string) => {
    setRepoPath(path);
    saveRecentProject(path);
  };

  const handleSave = useCallback(async () => {
    if (!activeTab || !api()?.writeFile) return;
    
    let contentToSave = activeTab.content;
    
    // Format on save
    if (settings.formatOnSave && api()?.formatCode && repoPath) {
      try {
        contentToSave = await api().formatCode(repoPath, activeTab.filePath, contentToSave);
      } catch (err) {
        console.error("Format on save failed:", err);
      }
    }
    
    await api().writeFile(activeTab.filePath, contentToSave);
    setTabs(p => p.map((t,i) => i===activeTabIndex ? {...t, content: contentToSave, isDirty:false} : t));
  }, [activeTab, activeTabIndex, settings.formatOnSave, repoPath]);

  const handleOpenFile = async (filePath: string, line?: number) => {
    const ei = tabs.findIndex(t => t.filePath === filePath);
    if (ei >= 0) {
      setActiveDiff(null);
      setActiveTabIndex(ei);
      return;
    }

    let content = "";
    try { content = await api()?.readFile(filePath) ?? ""; } catch { content = "// read error"; }
    const language = determineLanguage(filePath);
    setTabs(p => [...p, { filePath, content, language, isDirty: false }]);
    setActiveTabIndex(tabs.length);
  };

  const handleCloseTab = (i: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabs(p => p.filter((_,j) => j !== i));
    if (activeTabIndex >= i && activeTabIndex > 0) setActiveTabIndex(activeTabIndex - 1);
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
    const h = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.shiftKey && e.key.toLowerCase()==="p") { e.preventDefault(); setShowCommandPalette(p=>!p); }
      else if (ctrl && e.key===",")                        { e.preventDefault(); setActiveSidebar("settings"); }
      else if (ctrl && e.key.toLowerCase()==="l")          { e.preventDefault(); setShowRightAiSidebar(p=>!p); }
      else if (ctrl && e.key.toLowerCase()==="k")          { e.preventDefault(); setShowCommandPalette(p=>!p); }
      else if (ctrl && e.key.toLowerCase()==="s")          { e.preventDefault(); handleSave(); }
      else if (ctrl && e.key.toLowerCase()==="\\")         { e.preventDefault(); setIsSplit(p=>!p); }
      else if (ctrl && e.key.toLowerCase()==="i")          { e.preventDefault(); setShowInlineAi(p=>!p); }
      else if (e.key==="F5") { 
         e.preventDefault(); 
         if (tabs[activeTabIndex]?.filePath) {
           setActiveSidebar("debug");
           api()?.startDap(tabs[activeTabIndex].filePath);
         }
      }
      else if (e.key==="Escape")                           { setOpenMenu(null); setShowCommandPalette(false); setShowInlineAi(false); setShowAboutModal(false); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [handleSave]);

  useEffect(() => {
    const a = api(); if (!a?.onMenuAction) return;
    return a.onMenuAction((action: string) => {
      if (action==="menu:open-folder")       handleSelectRepo();
      else if (action==="menu:command-palette")   setShowCommandPalette(true);
      else if (action==="menu:show-explorer")     setActiveSidebar("explorer");
      else if (action==="menu:show-git")          setActiveSidebar("git");
      else if (action==="menu:toggle-ai-sidebar") setShowRightAiSidebar(p=>!p);
      else if (action==="menu:open-settings")     setActiveSidebar("settings");
      else if (action==="menu:toggle-terminal")   setShowBottomPanel(p=>!p);
    });
  }, [handleSelectRepo]);

  const menus: Record<string, MenuItem[]> = {
    File: [
      { label:"New File",              shortcut:"Ctrl+N",       action:()=>{} },
      { label:"Open Workspace Folder", shortcut:"Ctrl+O",       action:handleSelectRepo },
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
      { label:"About Atlas Studio", shortcut:"",             action:()=>setShowAboutModal(true) },
      { label:"Command Palette",   shortcut:"Ctrl+Shift+P", action:()=>setShowCommandPalette(true) },
    ],
  };

  const commandService = React.useMemo(() => new CommandService(), []);

  useEffect(() => {
    const unregisters = [
      commandService.registerCommand("about-atlas", "About Atlas Studio v1.0", () => setShowAboutModal(true)),
      commandService.registerCommand("open-settings", "Open Settings", () => setActiveSidebar("settings"), "Ctrl+,"),
      commandService.registerCommand("open-folder", "Open Workspace Folder", handleSelectRepo, "Ctrl+O"),
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

  const wname = repoPath ? repoPath.split(/[/\\]/).pop() : "Atlas Studio";
  const nodrag: React.CSSProperties = { WebkitAppRegion:"no-drag" } as any;

  return (
    <div style={s.root} onDragOver={e => e.preventDefault()} onDrop={handleDrop}>

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
                  {menus[name].map((item, i) => (
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
          <button style={s.iconBtn} title="Search (Ctrl+K)" onClick={()=>setShowCommandPalette(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
          <button style={{...s.iconBtn, ...(isSplit ? s.iconOn : {})}} title="Toggle Split Editor (Ctrl+\)" onClick={()=>setIsSplit(p=>!p)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="1.5"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
          </button>
          <button style={s.iconBtn} title="Toggle Explorer" onClick={()=>setActiveSidebar("explorer")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="1.5"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
          </button>
          <button style={{...s.iconBtn,...(showBottomPanel?s.iconOn:{})}} title="Toggle Terminal" onClick={()=>setShowBottomPanel(p=>!p)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="1.5"/><line x1="3" y1="16" x2="21" y2="16"/></svg>
          </button>
          <button style={{...s.iconBtn,...(showRightAiSidebar?s.iconOn:{})}} title="Toggle AI Chat (Ctrl+L)" onClick={()=>setShowRightAiSidebar(p=>!p)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="1.5"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
          </button>
          <button style={s.iconBtn} title="Settings (Ctrl+,)" onClick={()=>setActiveSidebar("settings")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-2.82-1.17l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 2.82 1.17l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 2z"/></svg>
          </button>
          <div style={s.winSep}/>
          <button style={s.wc} title="Minimize" onClick={()=>api()?.windowMinimize()}>
            <svg width="10" height="1" viewBox="0 0 10 1"><line x1="0" y1="0.5" x2="10" y2="0.5" stroke="currentColor" strokeWidth="1.5"/></svg>
          </button>
          <button style={s.wc} title="Maximize" onClick={()=>api()?.windowMaximize()}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="0.75" y="0.75" width="8.5" height="8.5" rx="0.5" stroke="currentColor" strokeWidth="1.5"/></svg>
          </button>
          <button style={{...s.wc,...s.wcClose}} title="Close" onClick={()=>api()?.windowClose()}>
            <svg width="10" height="10" viewBox="0 0 10 10"><line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5"/><line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.5"/></svg>
          </button>
        </div>
      </header>

      <div style={s.body}>
        <nav style={s.actBar}>
          <div style={s.actTop}>
            {([
              {id:"explorer",  lbl:"Explorer",icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>},
              {id:"search",    lbl:"Search",  icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>},
              {id:"git",       lbl:"Git",     icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>},
              {id:"debug",     lbl:"Debug",   icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>},
              {id:"history",   lbl:"History", icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>},
              {id:"impact",    lbl:"Impact",  icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>},
              {id:"graph",     lbl:"Graph",   icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/></svg>},
              {id:"health",    lbl:"Health",  icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>},
              {id:"account",   lbl:"Account", icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>},
              {id:"release",   lbl:"Release", icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>},
              {id:"extensions",lbl:"Market",  icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>},
              {id:"ai",        lbl:"Agent",   icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="15" x2="23" y2="15"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="15" x2="4" y2="15"/></svg>},
            ] as {id:SidebarView;lbl:string;icon:React.ReactNode}[]).map(({id,lbl,icon})=>(
              <button key={id} style={{...s.actBtn,...(activeSidebar===id?s.actOn:{})}} onClick={()=>setActiveSidebar(id)} title={lbl}>
                {icon}
              </button>
            ))}
          </div>
          <div style={s.actBot}>
            <button style={{...s.actBtn,...(activeSidebar==="settings"?s.actOn:{})}} onClick={()=>setActiveSidebar("settings")} title="Settings">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-2.82-1.17l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 2.82 1.17l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 2z"/></svg>
            </button>
          </div>
        </nav>

        <aside style={{ ...s.sidebar, width: `${sidebarWidth}px` }}>
          {activeSidebar==="explorer"   && <FileExplorer repoPath={repoPath} onOpenFile={handleOpenFile} onSelectRepo={handleSelectRepo}/>}
          {activeSidebar==="search"     && <GlobalSearchPanel workspaceRoot={repoPath!} onFileSelect={(f, l) => handleOpenFile(f, l)} />}
          {activeSidebar==="git"        && <GitPanel repoPath={repoPath} onViewDiff={handleViewDiff}/>}
          {activeSidebar==="debug"      && <DebugPanel />}
          {activeSidebar==="history"    && <GitHistoryPanel repoPath={repoPath}/>}
          {activeSidebar==="impact"     && <ImpactPanel filePath={activeTab?.filePath} symbolName={cursorSymbol}/>}
          {activeSidebar==="graph"      && <DependencyGraph repoPath={repoPath}/>}
          {activeSidebar==="health"     && <ProjectHealth repoPath={repoPath}/>}
          {activeSidebar==="account"    && <AccountPanel />}
          {activeSidebar==="release"    && <ReleaseManagerPanel />}
          {activeSidebar==="extensions" && <ExtensionGallery />}
          {activeSidebar==="ai"         && (
            <div style={s.agentPane}>
              <p style={s.paneHdr}>ATLAS AI AGENT</p>
              <textarea style={s.agentArea} placeholder="Describe task..." value={aiGoal} onChange={e=>setAiGoal(e.target.value)}/>
              <button style={s.agentBtn} disabled={aiRunning} onClick={async()=>{
                if(!aiGoal.trim()||!repoPath) return;
                const a=api(); if(!a?.runAgent) return;
                setAiRunning(true); setAiEvents(["Agent initialized..."]);
                try { const r=await a.runAgent(aiGoal,repoPath); setAiEvents(p=>[...p,r.error?`[FAIL] ${r.error}`:"[PASS] Done"]); }
                catch(e){ setAiEvents(p=>[...p,`[FAIL] ${e}`]); } finally { setAiRunning(false); }
              }}>{aiRunning?"Running...":"Run Agent"}</button>
            </div>
          )}
          {activeSidebar==="settings"   && <SettingsPanel settings={settings} onUpdateSettings={setSettings}/>}
        </aside>

        <div style={s.resizerX} onMouseDown={e => { e.preventDefault(); draggingRef.current = "sidebar"; document.body.style.cursor = "col-resize"; }} />

        <div style={s.center}>
          <div style={s.tabBar}>
            {tabs.map((tab,i)=>(
              <div key={tab.filePath} style={{...s.tab,...(i===activeTabIndex&&!activeDiff?s.tabOn:{})}} onClick={()=>{setActiveDiff(null);setActiveTabIndex(i);}}>
                <span style={s.tabName}>{tab.filePath.split(/[/\\]/).pop()}</span>
                {tab.isDirty && <span style={s.tabDot}>*</span>}
                <span style={s.tabX} onClick={e=>handleCloseTab(i,e)}>x</span>
              </div>
            ))}
          </div>

          {activeTab && <Breadcrumb filePath={activeTab.filePath} repoPath={repoPath}/>}

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
                <div style={{ flex: 1, borderRight: isSplit ? "1px solid #27272a" : "none", height: "100%" }}>
                  {activeTab && (
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
                    />
                  )}
                </div>

                {isSplit && (
                  <div style={{ flex: 1, height: "100%" }}>
                    {splitTab ? (
                      <EditorPane
                        filePath={splitTab.filePath}
                        repoPath={repoPath}
                        content={splitTab.content}
                        language={splitTab.language}
                        targetLine={splitTab.targetLine}
                        targetColumn={splitTab.targetColumn}
                        onChange={c=>setTabs(p=>p.map((t,i)=>i===splitTabIndex?{...t,content:c,isDirty:true}:t))}
                      />
                    ) : (
                      <div style={s.splitPlaceholder}>Select tab to view in split pane</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={s.welcome}>
                <div style={s.welcomeCard}>
                  <img src={logoImg} alt="Atlas" style={s.welcomeLogo}/>
                  <h2 style={s.welcomeH2}>Atlas Studio</h2>
                  <p style={s.welcomeP}>The Developer-First Independent IDE Platform</p>
                  
                  <div style={s.welcomeRow}>
                    <button style={s.wBtn} onClick={handleSelectRepo}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight:"6px"}}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                      Open Workspace Folder
                    </button>
                    <button style={s.wBtnO} onClick={()=>setActiveSidebar("settings")}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight:"6px"}}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-2.82-1.17l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 2.82 1.17l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 2z"/></svg>
                      Settings
                    </button>
                  </div>

                  {recentProjects.length > 0 && (
                    <div style={s.recentBox}>
                      <p style={s.recentHdr}>RECENT WORKSPACES</p>
                      {recentProjects.map(path => (
                        <button key={path} style={s.recentItem} onClick={() => handleOpenRecent(path)}>
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

          {showBottomPanel && <div style={s.resizerY} onMouseDown={e => { e.preventDefault(); draggingRef.current = "bottom"; document.body.style.cursor = "row-resize"; }} />}

          {showBottomPanel && (
            <div style={{ ...s.dock, height: `${bottomPanelHeight}px` }}>
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
        {showRightAiSidebar && <AiSidebar width={rightSidebarWidth} repoPath={repoPath} activeFilePath={activeTab?.filePath} onClose={() => setShowRightAiSidebar(false)} />}
      </div>

      {showAboutModal && <AboutAtlasModal onClose={()=>setShowAboutModal(false)} />}

      {showAiSafety && (
        <AiSafetyModal
          filePath={activeTab?.filePath || "src/index.ts"}
          proposedCode="// Proposed AI modification\nexport function example() { return true; }"
          onApprove={() => {
            api()?.grantPermission("atlas-agent", ["workspace.write"]);
            setShowAiSafety(false);
          }}
          onReject={() => {
            api()?.revokePermission("atlas-agent");
            setShowAiSafety(false);
          }}
        />
      )}

      <StatusBar repoPath={repoPath} activeLanguage={activeTab?.language} cursorSymbol={cursorSymbol} cursorLine={activeCursorPos.line} cursorCol={activeCursorPos.col} />
      <CommandPalette isOpen={showCommandPalette} commandService={commandService} onClose={()=>setShowCommandPalette(false)}/>
    </div>
  );
}

const s: Record<string,React.CSSProperties> = {
  root:{ display:"flex",flexDirection:"column",height:"100vh",width:"100vw",backgroundColor:"#000000",color:"#e4e4e7",fontFamily:"Inter,-apple-system,'Segoe UI',sans-serif",overflow:"hidden",userSelect:"none" },
  titlebar:{ display:"flex",alignItems:"center",height:"28px",backgroundColor:"#000000",borderBottom:"1px solid #38bdf8",flexShrink:0,WebkitAppRegion:"drag" } as any,
  tbLeft:{ display:"flex",alignItems:"center",flexShrink:0,paddingLeft:"6px",gap:"0" },
  logo:{ width:"16px",height:"16px",objectFit:"contain",marginRight:"6px",flexShrink:0 },
  menuWrapper:{ position:"relative" as const },
  menuItem:{ background:"none",border:"none",color:"#a1a1aa",fontSize:"12px",padding:"0 8px",height:"28px",cursor:"pointer",display:"flex",alignItems:"center",whiteSpace:"nowrap" as const,transition:"all 0.2s cubic-bezier(0.4,0,0.2,1)" },
  menuItemOn:{ backgroundColor:"#27272a",color:"#38bdf8" },
  dropdown:{ position:"absolute" as const,top:"28px",left:"0",backgroundColor:"#050505",border:"1px solid #38bdf8",borderRadius:"4px",minWidth:"220px",zIndex:9999,boxShadow:"0 8px 32px rgba(0,0,0,0.6)",padding:"4px 0",WebkitAppRegion:"no-drag" } as any,

  dropItem:{ display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",background:"none",border:"none",color:"#e4e4e7",fontSize:"12px",padding:"5px 16px",cursor:"pointer",textAlign:"left" as const,gap:"24px",transition:"background 0.15s" },
  dropDisabled:{ color:"#52525b",cursor:"default" },
  dropSep:{ height:"1px",backgroundColor:"#27272a",margin:"3px 8px" },
  dropShortcut:{ color:"#94a3b8",fontSize:"11px",flexShrink:0 },
  tbCenter:{ position:"absolute" as const,left:"50%",transform:"translateX(-50%)",pointerEvents:"none" },
  centerTxt:{ fontSize:"12px",color:"#94a3b8",whiteSpace:"nowrap" as const },
  tbRight:{ display:"flex",alignItems:"center",marginLeft:"auto",gap:"0" },
  iconBtn:{ width:"28px",height:"28px",background:"none",border:"none",color:"#94a3b8",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"4px",transition:"all 0.2s cubic-bezier(0.4,0,0.2,1)" },
  iconOn:{ color:"#38bdf8" },
  winSep:{ width:"1px",height:"14px",backgroundColor:"#27272a",margin:"0 4px" },
  wc:{ width:"46px",height:"28px",background:"none",border:"none",color:"#94a3b8",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.2s" },
  wcClose:{ },
  body:{ display:"flex",flex:1,overflow:"hidden" },
  actBar:{ width:"40px",backgroundColor:"#000000",borderRight:"1px solid #38bdf8",display:"flex",flexDirection:"column",justifyContent:"space-between",paddingTop:"4px",paddingBottom:"4px",flexShrink:0 },
  actTop:{ display:"flex",flexDirection:"column",gap:"0",alignItems:"center" },
  actBot:{ display:"flex",flexDirection:"column",alignItems:"center" },
  actBtn:{ width:"40px",padding:"8px 0",border:"none",background:"transparent",color:"#64748b",cursor:"pointer",display:"flex",flexDirection:"column" as const,alignItems:"center",gap:"4px",borderRadius:"0",transition:"all 0.2s cubic-bezier(0.4,0,0.2,1)" },
  actOn:{ color:"#fafafa",borderLeft:"2px solid #38bdf8" },
  actLbl:{ display:"none" },
  sidebar:{ backgroundColor:"#050505",display:"flex",flexDirection:"column",overflow:"hidden",flexShrink:0 },
  resizerX: { width: "4px", backgroundColor: "transparent", cursor: "col-resize", zIndex: 10, transition: "background-color 0.2s" },
  resizerY: { height: "4px", backgroundColor: "transparent", cursor: "row-resize", zIndex: 10, transition: "background-color 0.2s" },
  center:{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden" },
  tabBar:{ display:"flex",height:"30px",backgroundColor:"#000000",borderBottom:"1px solid #38bdf8",overflowX:"auto" as const,flexShrink:0 },
  tab:{ display:"flex",alignItems:"center",gap:"5px",padding:"0 12px",minWidth:"80px",maxWidth:"160px",backgroundColor:"#050505",borderRight:"1px solid #38bdf8",color:"#94a3b8",fontSize:"12px",cursor:"pointer",borderTop:"2px solid transparent",flexShrink:0,transition:"all 0.2s cubic-bezier(0.4,0,0.2,1)" },
  tabOn:{ backgroundColor:"#000000",color:"#e4e4e7",borderTop:"2px solid #38bdf8" },
  tabName:{ flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const,fontWeight:500 },
  tabDot:{ color:"#38bdf8",fontSize:"14px" },
  tabX:{ fontSize:"12px",opacity:0.5,padding:"0 2px",cursor:"pointer",transition:"opacity 0.2s" },
  editorArea:{ flex:1,overflow:"hidden",position:"relative" as const },
  splitPlaceholder:{ display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:"#64748b",fontSize:"12px",backgroundColor:"#000000" },
  welcome:{ display:"flex",alignItems:"center",justifyContent:"center",height:"100%",backgroundColor:"#000000",backgroundImage:"radial-gradient(circle at center, rgba(56,189,248,0.05) 0%, transparent 60%)" },
  welcomeCard:{ display:"flex",flexDirection:"column",alignItems:"center",padding:"50px 60px",borderRadius:"16px",backgroundColor:"#050505",border:"1px solid #38bdf8",boxShadow:"0 25px 65px rgba(0,0,0,0.6)",maxWidth:"520px",width:"100%" },
  welcomeLogo:{ width:"80px",height:"80px",objectFit:"contain",marginBottom:"16px",filter:"drop-shadow(0 4px 12px rgba(56,189,248,0.3))" },
  welcomeH2:{ margin:"0 0 8px",fontSize:"22px",fontWeight:800,background:"linear-gradient(90deg, #fafafa 0%, #a1a1aa 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" },
  welcomeP:{ margin:"0 0 28px",fontSize:"13px",color:"#94a3b8" },
  welcomeRow:{ display:"flex",gap:"12px",width:"100%",justifyContent:"center" },
  wBtn:{ display:"flex",alignItems:"center",backgroundColor:"#38bdf8",color:"#000000",border:"none",padding:"10px 22px",borderRadius:"8px",fontWeight:700,fontSize:"12px",cursor:"pointer",boxShadow:"0 4px 14px rgba(56,189,248,0.25)",transition:"all 0.2s" },
  wBtnO:{ display:"flex",alignItems:"center",backgroundColor:"transparent",color:"#e4e4e7",border:"1px solid #38bdf8",padding:"10px 22px",borderRadius:"8px",fontWeight:600,fontSize:"12px",cursor:"pointer",transition:"all 0.2s" },
  recentBox:{ marginTop:"32px",width:"100%",display:"flex",flexDirection:"column",gap:"8px" },
  recentHdr:{ fontSize:"10px",fontWeight:700,letterSpacing:"1px",color:"#64748b",margin:"0 0 6px" },
  recentItem:{ display:"flex",flexDirection:"column" as const,alignItems:"flex-start",backgroundColor:"#000000",border:"1px solid #27272a",borderRadius:"8px",padding:"10px 14px",cursor:"pointer",textAlign:"left" as const,transition:"border-color 0.2s" },
  recentName:{ fontSize:"13px",fontWeight:600,color:"#e4e4e7",marginBottom:"2px" },
  recentPath:{ fontSize:"11px",color:"#64748b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const,width:"100%" },
  dock:{ backgroundColor:"#050505",borderTop:"1px solid #38bdf8",display:"flex",flexDirection:"column",flexShrink:0 },
  dockTabs:{ display:"flex",height:"26px",backgroundColor:"#000000",borderBottom:"1px solid #38bdf8",flexShrink:0 },
  dockTab:{ background:"none",border:"none",borderBottom:"2px solid transparent",borderRight:"1px solid #38bdf8",color:"#94a3b8",padding:"0 14px",fontSize:"11px",fontWeight:700,cursor:"pointer",letterSpacing:"0.4px",transition:"all 0.2s" },
  dockOn:{ color:"#38bdf8",borderBottom:"2px solid #38bdf8" },
  dockContent:{ flex:1,overflow:"hidden" },
  log:{ padding:"6px 12px",fontFamily:"'JetBrains Mono',Consolas,monospace",fontSize:"12px",overflowY:"auto" as const,height:"100%" },
  logLine:{ color:"#e4e4e7",lineHeight:"1.6",margin:0 },
  logDim:{ color:"#52525b",margin:0 },
  agentPane:{ display:"flex",flexDirection:"column",height:"100%",padding:"10px",gap:"8px" },
  paneHdr:{ fontSize:"11px",fontWeight:700,letterSpacing:"0.8px",color:"#e4e4e7",margin:0 },
  agentArea:{ flex:1,maxHeight:"100px",backgroundColor:"#1a1a1e",border:"1px solid #27272a",color:"#e4e4e7",borderRadius:"6px",padding:"8px",fontSize:"12px",resize:"none" as const,fontFamily:"inherit" },
  agentBtn:{ backgroundColor:"#e4e4e7",color:"#09090b",border:"none",borderRadius:"6px",padding:"8px",fontWeight:700,fontSize:"12px",cursor:"pointer" },
};