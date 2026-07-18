import { useState, useEffect, useRef, useCallback } from "react";
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
import { DependencyGraph } from "./components/DependencyGraph.js";
import { ProjectHealth } from "./components/ProjectHealth.js";
import { ExtensionGallery } from "./components/ExtensionGallery.js";
import { GitHistoryPanel } from "./components/GitHistoryPanel.js";
import { MergeConflictEditor } from "./components/MergeConflictEditor.js";
import { AiSafetyModal } from "./components/AiSafetyModal.js";
import { InlineAiTool } from "./components/InlineAiTool.js";
import { AccountPanel } from "./components/AccountPanel.js";
import logoImg from "./assets/logo.png";

interface EditorTab { filePath: string; content: string; language: string; isDirty: boolean; }
type SidebarView = "explorer" | "git" | "history" | "impact" | "graph" | "health" | "extensions" | "account" | "ai" | "settings";
type BottomTab = "terminal" | "output" | "ai";

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
    await api().writeFile(activeTab.filePath, activeTab.content);
    setTabs(p => p.map((t,i) => i===activeTabIndex ? {...t, isDirty:false} : t));
  }, [activeTab, activeTabIndex]);

  const handleOpenFile = async (filePath: string) => {
    const ei = tabs.findIndex(t => t.filePath === filePath);
    if (ei >= 0) { setActiveDiff(null); setActiveTabIndex(ei); return; }
    let content = "";
    try { content = await api()?.readFile(filePath) ?? ""; } catch { content = "// read error"; }
    const ext = filePath.split(".").pop() ?? "";
    const lm: Record<string,string> = {ts:"typescript",tsx:"typescript",js:"javascript",jsx:"javascript",json:"json",py:"python",md:"markdown",html:"html",css:"css"};
    setTabs(p => [...p, { filePath, content, language: lm[ext]||"plaintext", isDirty: false }]);
    setActiveDiff(null); setActiveTabIndex(tabs.length);
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
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
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
      else if (e.key==="Escape")                           { setOpenMenu(null); setShowCommandPalette(false); setShowInlineAi(false); }
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
      { label:"Source Control",      shortcut:"Ctrl+Shift+G", action:()=>setActiveSidebar("git") },
      { label:"Git History",         shortcut:"",             action:()=>setActiveSidebar("history") },
      { label:"3-Way Merge Resolver",shortcut:"",             action:()=>setShowMergeConflict(p=>!p) },
      { label:"Dependency Graph",    shortcut:"",             action:()=>setActiveSidebar("graph") },
      { label:"Project Health",      shortcut:"",             action:()=>setActiveSidebar("health") },
      { label:"Account & Cloud Sync",shortcut:"",             action:()=>setActiveSidebar("account") },
      { label:"Extensions Gallery",  shortcut:"Ctrl+Shift+X", action:()=>setActiveSidebar("extensions") },
      { label:"Toggle AI Sidebar",   shortcut:"Ctrl+L",       action:()=>setShowRightAiSidebar(p=>!p) },
      { label:"Toggle Panel",        shortcut:"Ctrl+`",       action:()=>setShowBottomPanel(p=>!p) },
    ],
    Terminal: [
      { label:"New Terminal",    shortcut:"Ctrl+`",       action:()=>{ setShowBottomPanel(true); setBottomTab("terminal"); } },
      { label:"Toggle Terminal", shortcut:"Ctrl+Shift+`", action:()=>setShowBottomPanel(p=>!p) },
    ],
    Help: [
      { label:"Command Palette",     shortcut:"Ctrl+Shift+P", action:()=>setShowCommandPalette(true) },
    ],
  };

  const commands: CommandItem[] = [
    { id:"open-settings",   label:"Open Settings",         shortcut:"Ctrl+,",       action:()=>setActiveSidebar("settings") },
    { id:"open-folder",     label:"Open Workspace Folder", shortcut:"Ctrl+O",       action:handleSelectRepo },
    { id:"split-editor",    label:"Toggle Split Editor",   shortcut:"Ctrl+\\",      action:()=>setIsSplit(p=>!p) },
    { id:"show-account",    label:"Account & Cloud Sync",  shortcut:"",             action:()=>setActiveSidebar("account") },
    { id:"inline-ai",       label:"Inline AI Assistant",   shortcut:"Ctrl+I",       action:()=>setShowInlineAi(p=>!p) },
    { id:"ai-safety",       label:"AI Proposed Edit Preview",shortcut:"",           action:()=>setShowAiSafety(true) },
    { id:"show-history",    label:"Git History & Graph",   shortcut:"",             action:()=>setActiveSidebar("history") },
    { id:"merge-resolver",  label:"3-Way Merge Conflict Resolver",shortcut:"",     action:()=>setShowMergeConflict(p=>!p) },
    { id:"show-graph",      label:"Dependency Graph",      shortcut:"",             action:()=>setActiveSidebar("graph") },
    { id:"show-health",     label:"Project Health",        shortcut:"",             action:()=>setActiveSidebar("health") },
    { id:"show-extensions", label:"Extensions Marketplace",shortcut:"Ctrl+Shift+X", action:()=>setActiveSidebar("extensions") },
    { id:"toggle-terminal", label:"Toggle Terminal",        shortcut:"Ctrl+`",       action:()=>setShowBottomPanel(p=>!p) },
    { id:"show-explorer",   label:"Explorer",               shortcut:"Ctrl+Shift+E", action:()=>setActiveSidebar("explorer") },
    { id:"show-git",        label:"Source Control",         shortcut:"Ctrl+Shift+G", action:()=>setActiveSidebar("git") },
    { id:"toggle-ai",       label:"Toggle AI Chat",         shortcut:"Ctrl+L",       action:()=>setShowRightAiSidebar(p=>!p) },
  ];

  const wname = repoPath ? repoPath.split(/[/\\]/).pop() : "Atlas Studio";
  const nodrag: React.CSSProperties = { WebkitAppRegion:"no-drag" } as any;

  return (
    <div style={s.root} onDragOver={e => e.preventDefault()} onDrop={handleDrop}>

      {/* Titlebar */}
      <header style={s.titlebar}>
        <div ref={menuRef} style={{ ...s.tbLeft, ...nodrag }}>
          <img src={logoImg} alt="Atlas" style={s.logo} />
          {Object.keys(menus).map(name => (
            <div key={name} style={s.menuWrapper}>
              <button
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

      {/* Main Content Body */}
      <div style={s.body}>
        <nav style={s.actBar}>
          <div style={s.actTop}>
            {([
              {id:"explorer",  lbl:"Explorer",icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>},
              {id:"git",       lbl:"Git",     icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>},
              {id:"history",   lbl:"History", icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>},
              {id:"impact",    lbl:"Impact",  icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>},
              {id:"graph",     lbl:"Graph",   icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/></svg>},
              {id:"health",    lbl:"Health",  icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>},
              {id:"account",   lbl:"Account", icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>},
              {id:"extensions",lbl:"Market",  icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>},
              {id:"ai",        lbl:"Agent",   icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="15" x2="23" y2="15"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="15" x2="4" y2="15"/></svg>},
            ] as {id:SidebarView;lbl:string;icon:React.ReactNode}[]).map(({id,lbl,icon})=>(
              <button key={id} style={{...s.actBtn,...(activeSidebar===id?s.actOn:{})}} onClick={()=>setActiveSidebar(id)} title={lbl}>
                {icon}<span style={s.actLbl}>{lbl}</span>
              </button>
            ))}
          </div>
          <div style={s.actBot}>
            <button style={{...s.actBtn,...(activeSidebar==="settings"?s.actOn:{})}} onClick={()=>setActiveSidebar("settings")} title="Settings">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-2.82-1.17l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 2.82 1.17l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 2z"/></svg>
              <span style={s.actLbl}>Settings</span>
            </button>
          </div>
        </nav>

        <aside style={s.sidebar}>
          {activeSidebar==="explorer"   && <FileExplorer repoPath={repoPath} onOpenFile={handleOpenFile} onSelectRepo={handleSelectRepo}/>}
          {activeSidebar==="git"        && <GitPanel repoPath={repoPath} onViewDiff={handleViewDiff}/>}
          {activeSidebar==="history"    && <GitHistoryPanel repoPath={repoPath}/>}
          {activeSidebar==="impact"     && <ImpactPanel filePath={activeTab?.filePath} symbolName={cursorSymbol}/>}
          {activeSidebar==="graph"      && <DependencyGraph repoPath={repoPath}/>}
          {activeSidebar==="health"     && <ProjectHealth repoPath={repoPath}/>}
          {activeSidebar==="account"    && <AccountPanel />}
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

        {/* Central Editor Area */}
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
                      content={activeTab.content}
                      language={activeTab.language}
                      onChange={c=>setTabs(p=>p.map((t,i)=>i===activeTabIndex?{...t,content:c,isDirty:true}:t))}
                      onCursorChange={l=>{ const m=l.match(/\b([A-Za-z_]\w*)\b/); if(m) setCursorSymbol(m[1]); }}
                    />
                  )}
                </div>

                {isSplit && (
                  <div style={{ flex: 1, height: "100%" }}>
                    {splitTab ? (
                      <EditorPane
                        filePath={splitTab.filePath}
                        content={splitTab.content}
                        language={splitTab.language}
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
                  <p style={s.welcomeP}>Developer-First Independent IDE Platform</p>
                  
                  <div style={s.welcomeRow}>
                    <button style={s.wBtn} onClick={handleSelectRepo}>Open Workspace Folder</button>
                    <button style={s.wBtnO} onClick={()=>setActiveSidebar("settings")}>Settings</button>
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

          {showBottomPanel && (
            <div style={s.dock}>
              <div style={s.dockTabs}>
                {(["terminal","output","ai"] as BottomTab[]).map(t=>(
                  <button key={t} style={{...s.dockTab,...(bottomTab===t?s.dockOn:{})}} onClick={()=>setBottomTab(t)}>
                    {t==="terminal"?"TERMINAL":t==="output"?"OUTPUT":"AI STREAM"}
                  </button>
                ))}
                <button style={{...s.dockTab,marginLeft:"auto",fontSize:"10px"}} onClick={()=>setShowBottomPanel(false)}>x</button>
              </div>
              <div style={s.dockContent}>
                {bottomTab==="terminal" && <TerminalPanel repoPath={repoPath}/>}
                {bottomTab==="output"   && <div style={s.log}><p style={s.logLine}>[PASS] Workspace loaded: {repoPath || "None"}</p></div>}
                {bottomTab==="ai"       && <div style={s.log}>{aiEvents.length===0?<p style={s.logDim}>No agent runs.</p>:aiEvents.map((e,i)=><p key={i} style={s.logLine}>{e}</p>)}</div>}
              </div>
            </div>
          )}
        </div>

        {showRightAiSidebar && <AiSidebar repoPath={repoPath} activeFilePath={activeTab?.filePath}/>}
      </div>

      {showAiSafety && (
        <AiSafetyModal
          filePath={activeTab?.filePath || "src/index.ts"}
          proposedCode="// Proposed AI modification\nexport function example() { return true; }"
          onApprove={() => setShowAiSafety(false)}
          onReject={() => setShowAiSafety(false)}
        />
      )}

      <StatusBar repoPath={repoPath} activeLanguage={activeTab?.language} cursorSymbol={cursorSymbol}/>
      <CommandPalette isOpen={showCommandPalette} commands={commands} onClose={()=>setShowCommandPalette(false)}/>
    </div>
  );
}

const s: Record<string,React.CSSProperties> = {
  root:{ display:"flex",flexDirection:"column",height:"100vh",width:"100vw",backgroundColor:"#09090b",color:"#e4e4e7",fontFamily:"Inter,-apple-system,'Segoe UI',sans-serif",overflow:"hidden",userSelect:"none" },
  titlebar:{ display:"flex",alignItems:"center",height:"30px",backgroundColor:"#141417",borderBottom:"1px solid #27272a",flexShrink:0,WebkitAppRegion:"drag" } as any,
  tbLeft:{ display:"flex",alignItems:"center",flexShrink:0,paddingLeft:"6px",gap:"0" },
  logo:{ width:"16px",height:"16px",objectFit:"contain",marginRight:"6px",flexShrink:0 },
  menuWrapper:{ position:"relative" as const },
  menuItem:{ background:"none",border:"none",color:"#a1a1aa",fontSize:"12px",padding:"0 8px",height:"30px",cursor:"pointer",display:"flex",alignItems:"center",whiteSpace:"nowrap" as const },
  menuItemOn:{ backgroundColor:"rgba(255,255,255,0.08)",color:"#fafafa" },
  dropdown:{ position:"absolute" as const,top:"30px",left:"0",backgroundColor:"#1c1c1f",border:"1px solid #27272a",borderRadius:"4px",minWidth:"220px",zIndex:9999,boxShadow:"0 8px 32px rgba(0,0,0,0.6)",padding:"4px 0",WebkitAppRegion:"no-drag" } as any,
  dropItem:{ display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",background:"none",border:"none",color:"#e4e4e7",fontSize:"12px",padding:"5px 16px",cursor:"pointer",textAlign:"left" as const,gap:"24px" },
  dropDisabled:{ color:"#52525b",cursor:"default" },
  dropSep:{ height:"1px",backgroundColor:"#27272a",margin:"3px 8px" },
  dropShortcut:{ color:"#71717a",fontSize:"11px",flexShrink:0 },
  tbCenter:{ position:"absolute" as const,left:"50%",transform:"translateX(-50%)",pointerEvents:"none" },
  centerTxt:{ fontSize:"12px",color:"#71717a",whiteSpace:"nowrap" as const },
  tbRight:{ display:"flex",alignItems:"center",marginLeft:"auto",gap:"0" },
  iconBtn:{ width:"30px",height:"30px",background:"none",border:"none",color:"#71717a",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"4px" },
  iconOn:{ color:"#e4e4e7" },
  winSep:{ width:"1px",height:"14px",backgroundColor:"#27272a",margin:"0 4px" },
  wc:{ width:"46px",height:"30px",background:"none",border:"none",color:"#71717a",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" },
  wcClose:{ },
  body:{ display:"flex",flex:1,overflow:"hidden" },
  actBar:{ width:"48px",backgroundColor:"#141417",borderRight:"1px solid #27272a",display:"flex",flexDirection:"column",justifyContent:"space-between",paddingTop:"4px",paddingBottom:"4px",flexShrink:0 },
  actTop:{ display:"flex",flexDirection:"column",gap:"0",alignItems:"center" },
  actBot:{ display:"flex",flexDirection:"column",alignItems:"center" },
  actBtn:{ width:"48px",padding:"8px 0",border:"none",background:"transparent",color:"#52525b",cursor:"pointer",display:"flex",flexDirection:"column" as const,alignItems:"center",gap:"4px",borderRadius:"0" },
  actOn:{ color:"#e4e4e7",borderLeft:"2px solid #e4e4e7" },
  actLbl:{ fontSize:"9px",fontWeight:600,letterSpacing:"0.3px" },
  sidebar:{ width:"240px",backgroundColor:"#0f0f13",display:"flex",flexDirection:"column",borderRight:"1px solid #27272a",overflow:"hidden",flexShrink:0 },
  center:{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden" },
  tabBar:{ display:"flex",height:"35px",backgroundColor:"#0f0f13",borderBottom:"1px solid #27272a",overflowX:"auto" as const,flexShrink:0 },
  tab:{ display:"flex",alignItems:"center",gap:"5px",padding:"0 12px",minWidth:"80px",maxWidth:"160px",backgroundColor:"#141417",borderRight:"1px solid #27272a",color:"#71717a",fontSize:"12px",cursor:"pointer",borderTop:"2px solid transparent",flexShrink:0 },
  tabOn:{ backgroundColor:"#09090b",color:"#e4e4e7",borderTop:"2px solid #e4e4e7" },
  tabName:{ flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const,fontWeight:500 },
  tabDot:{ color:"#e4e4e7",fontSize:"14px" },
  tabX:{ fontSize:"12px",opacity:0.5,padding:"0 2px",cursor:"pointer" },
  editorArea:{ flex:1,overflow:"hidden",position:"relative" as const },
  splitPlaceholder:{ display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:"#52525b",fontSize:"12px",backgroundColor:"#09090b" },
  welcome:{ display:"flex",alignItems:"center",justifyContent:"center",height:"100%",backgroundColor:"#09090b" },
  welcomeCard:{ display:"flex",flexDirection:"column",alignItems:"center",padding:"40px 52px",borderRadius:"12px",backgroundColor:"#141417",border:"1px solid #27272a",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",maxWidth:"480px",width:"100%" },
  welcomeLogo:{ width:"64px",height:"64px",objectFit:"contain",marginBottom:"14px" },
  welcomeH2:{ margin:"0 0 4px",fontSize:"18px",fontWeight:800,color:"#fafafa" },
  welcomeP:{ margin:"0 0 20px",fontSize:"12px",color:"#71717a" },
  welcomeRow:{ display:"flex",gap:"10px",width:"100%",justifyContent:"center" },
  wBtn:{ backgroundColor:"fafafa",color:"#09090b",border:"none",padding:"8px 18px",borderRadius:"6px",fontWeight:700,fontSize:"12px",cursor:"pointer" },
  wBtnO:{ backgroundColor:"transparent",color:"#e4e4e7",border:"1px solid #3f3f46",padding:"8px 18px",borderRadius:"6px",fontWeight:600,fontSize:"13px",cursor:"pointer" },
  recentBox:{ marginTop:"24px",width:"100%",display:"flex",flexDirection:"column",gap:"6px" },
  recentHdr:{ fontSize:"10px",fontWeight:700,letterSpacing:"0.8px",color:"#71717a",margin:"0 0 4px" },
  recentItem:{ display:"flex",flexDirection:"column" as const,alignItems:"flex-start",backgroundColor:"#18181b",border:"1px solid #27272a",borderRadius:"6px",padding:"8px 12px",cursor:"pointer",textAlign:"left" as const },
  recentName:{ fontSize:"12px",fontWeight:600,color:"#e4e4e7" },
  recentPath:{ fontSize:"10px",color:"#71717a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const,width:"100%" },
  dock:{ height:"220px",backgroundColor:"#0f0f13",borderTop:"1px solid #27272a",display:"flex",flexDirection:"column",flexShrink:0 },
  dockTabs:{ display:"flex",height:"30px",backgroundColor:"#141417",borderBottom:"1px solid #27272a",flexShrink:0 },
  dockTab:{ background:"none",border:"none",borderBottom:"2px solid transparent",borderRight:"1px solid #27272a",color:"#71717a",padding:"0 14px",fontSize:"11px",fontWeight:700,cursor:"pointer",letterSpacing:"0.4px" },
  dockOn:{ color:"#e4e4e7",borderBottom:"2px solid #e4e4e7" },
  dockContent:{ flex:1,overflow:"hidden" },
  log:{ padding:"6px 12px",fontFamily:"'JetBrains Mono',Consolas,monospace",fontSize:"12px",overflowY:"auto" as const,height:"100%" },
  logLine:{ color:"#e4e4e7",lineHeight:"1.6",margin:0 },
  logDim:{ color:"#52525b",margin:0 },
  agentPane:{ display:"flex",flexDirection:"column",height:"100%",padding:"10px",gap:"8px" },
  paneHdr:{ fontSize:"11px",fontWeight:700,letterSpacing:"0.8px",color:"#e4e4e7",margin:0 },
  agentArea:{ flex:1,maxHeight:"100px",backgroundColor:"#1a1a1e",border:"1px solid #27272a",color:"#e4e4e7",borderRadius:"6px",padding:"8px",fontSize:"12px",resize:"none" as const,fontFamily:"inherit" },
  agentBtn:{ backgroundColor:"#e4e4e7",color:"#09090b",border:"none",borderRadius:"6px",padding:"8px",fontWeight:700,fontSize:"12px",cursor:"pointer" },
};