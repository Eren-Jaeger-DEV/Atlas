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

interface EditorTab { filePath: string; content: string; language: string; isDirty: boolean; }
type SidebarView = "explorer" | "git" | "impact" | "ai" | "settings";
type BottomTab = "terminal" | "output" | "ai";

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
    if (api?.selectDirectory) { const s = await api.selectDirectory(); if (s) setRepoPath(s); }
  };

  const handleOpenFile = async (filePath: string) => {
    const ei = tabs.findIndex(t => t.filePath === filePath);
    if (ei >= 0) { setActiveDiff(null); setActiveTabIndex(ei); return; }
    const api = (window as any).atlasAPI;
    let content = "";
    if (api?.readFile) { try { content = await api.readFile(filePath); } catch { content = "// read error"; } }
    const ext = filePath.split(".").pop() || "";
    const lm: Record<string, string> = { ts:"typescript",tsx:"typescript",js:"javascript",jsx:"javascript",json:"json",py:"python",md:"markdown",html:"html",css:"css" };
    setTabs(p => [...p, { filePath, content, language: lm[ext]||"plaintext", isDirty: false }]);
    setActiveDiff(null); setActiveTabIndex(tabs.length);
  };

  const handleCloseTab = (i: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabs(p => p.filter((_,j) => j !== i));
    if (activeTabIndex >= i && activeTabIndex > 0) setActiveTabIndex(activeTabIndex - 1);
  };

  const handleViewDiff = async (filePath: string, staged: boolean) => {
    const api = (window as any).atlasAPI;
    if (api?.gitDiff && repoPath) {
      try { setActiveDiff({ filePath, diffText: await api.gitDiff(repoPath, filePath, staged) }); }
      catch { setActiveDiff({ filePath, diffText: "Error" }); }
    }
  };

  const commands: CommandItem[] = [
    { id:"open-settings", label:"Open Settings", shortcut:"Ctrl+,", action:()=>setActiveSidebar("settings") },
    { id:"open-folder", label:"Open Workspace Folder", shortcut:"Ctrl+O", action:handleSelectRepo },
    { id:"toggle-terminal", label:"Toggle Terminal", shortcut:"Ctrl+`", action:()=>setShowBottomPanel(p=>!p) },
    { id:"show-explorer", label:"Explorer", shortcut:"Ctrl+Shift+E", action:()=>setActiveSidebar("explorer") },
    { id:"show-git", label:"Source Control", shortcut:"Ctrl+Shift+G", action:()=>setActiveSidebar("git") },
    { id:"toggle-ai", label:"Toggle AI Chat", shortcut:"Ctrl+L", action:()=>setShowRightAiSidebar(p=>!p) },
  ];

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==="p") { e.preventDefault(); setShowCommandPalette(p=>!p); }
      else if ((e.ctrlKey||e.metaKey)&&e.key===",") { e.preventDefault(); setActiveSidebar("settings"); }
      else if ((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="l") { e.preventDefault(); setShowRightAiSidebar(p=>!p); }
    };
    window.addEventListener("keydown",h); return ()=>window.removeEventListener("keydown",h);
  }, []);

  useEffect(() => {
    const api = (window as any).atlasAPI;
    if (!api?.onMenuAction) return;
    return api.onMenuAction((a: string) => {
      if (a==="menu:open-folder") handleSelectRepo();
      else if (a==="menu:command-palette") setShowCommandPalette(true);
      else if (a==="menu:show-explorer") setActiveSidebar("explorer");
      else if (a==="menu:show-git") setActiveSidebar("git");
      else if (a==="menu:toggle-ai-sidebar") setShowRightAiSidebar(p=>!p);
      else if (a==="menu:open-settings") setActiveSidebar("settings");
      else if (a==="menu:toggle-terminal") setShowBottomPanel(p=>!p);
    });
  }, []);

  const wname = repoPath ? repoPath.split(/[/\\]/).pop() : undefined;

  return (
    <div style={s.root}>
      <header style={s.toolbar}>
        <div style={s.tleft}>
          <img src={logoImg} alt="Atlas" style={s.logoImg} />
          <span style={s.logoTxt}>ATLAS</span>
          <div style={s.navGrp}>
            <button style={s.navBtn} title="Go Back">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button style={s.navBtn} title="Go Forward">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>

        <div style={s.tcenter}>
          <button style={s.searchBar} onClick={()=>setShowCommandPalette(true)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <span style={s.searchTxt}>{wname ?? "Search"}</span>
            <kbd style={s.kbdHint}>Ctrl+P</kbd>
          </button>
        </div>

        <div style={s.tright}>
          <button style={s.tbBtn} title="Toggle Explorer" onClick={()=>setActiveSidebar("explorer")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="1.5"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
          </button>
          <button style={{...s.tbBtn,...(showBottomPanel?s.tbOn:{})}} title="Toggle Terminal" onClick={()=>setShowBottomPanel(p=>!p)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="1.5"/><line x1="3" y1="16" x2="21" y2="16"/></svg>
          </button>
          <button style={{...s.tbBtn,...(showRightAiSidebar?s.tbOn:{})}} title="Toggle AI Chat (Ctrl+L)" onClick={()=>setShowRightAiSidebar(p=>!p)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="1.5"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
          </button>
          <div style={s.tbDiv}/>
          <button style={s.tbBtn} title="Settings (Ctrl+,)" onClick={()=>setActiveSidebar("settings")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-2.82-1.17l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 2.82 1.17l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 2z"/></svg>
          </button>
        </div>
      </header>

      <div style={s.body}>
        <nav style={s.actBar}>
          <div style={s.actTop}>
            {([
              {id:"explorer",lbl:"Explorer",icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>},
              {id:"git",lbl:"Git",icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>},
              {id:"impact",lbl:"Impact",icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>},
              {id:"ai",lbl:"Agent",icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="15" x2="23" y2="15"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="15" x2="4" y2="15"/></svg>},
            ] as {id:SidebarView;lbl:string;icon:React.ReactNode}[]).map(({id,lbl,icon})=>(
              <button key={id} style={{...s.actBtn,...(activeSidebar===id?s.actOn:{})}} onClick={()=>setActiveSidebar(id)} title={lbl}>
                {icon}<span style={s.actLbl}>{lbl}</span>
              </button>
            ))}
          </div>
          <div style={s.actBot}>
            <button style={{...s.actBtn,...(activeSidebar==="settings"?s.actOn:{})}} onClick={()=>setActiveSidebar("settings")} title="Settings">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-2.82-1.17l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 2.82 1.17l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 2z"/></svg>
              <span style={s.actLbl}>Settings</span>
            </button>
          </div>
        </nav>

        <aside style={s.sidebar}>
          {activeSidebar==="explorer" && <FileExplorer repoPath={repoPath} onOpenFile={handleOpenFile} onSelectRepo={handleSelectRepo}/>}
          {activeSidebar==="git" && <GitPanel repoPath={repoPath} onViewDiff={handleViewDiff}/>}
          {activeSidebar==="impact" && <ImpactPanel filePath={activeTab?.filePath} symbolName={cursorSymbol}/>}
          {activeSidebar==="ai" && (
            <div style={s.agentPane}>
              <div style={s.paneHdr}>ATLAS AI AGENT</div>
              <textarea style={s.agentArea} placeholder="Describe task..." value={aiGoal} onChange={e=>setAiGoal(e.target.value)}/>
              <button style={s.agentBtn} onClick={async()=>{
                if(!aiGoal.trim()||!repoPath) return;
                const api=(window as any).atlasAPI;
                if(api?.runAgent){ setAiRunning(true); setAiEvents(["Agent initialized..."]);
                  try { const r=await api.runAgent(aiGoal,repoPath); setAiEvents(p=>[...p,r.error?`[FAIL] ${r.error}`:"[PASS] Done"]); }
                  catch(e){ setAiEvents(p=>[...p,`[FAIL] ${e}`]); } finally { setAiRunning(false); } }
              }} disabled={aiRunning}>{aiRunning?"Running...":"Run Agent"}</button>
            </div>
          )}
          {activeSidebar==="settings" && <SettingsPanel settings={settings} onUpdateSettings={setSettings}/>}
        </aside>

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
            {activeDiff ? (
              <DiffViewer filePath={activeDiff.filePath} diffText={activeDiff.diffText} onClose={()=>setActiveDiff(null)}/>
            ) : activeTab ? (
              <EditorPane filePath={activeTab.filePath} content={activeTab.content} language={activeTab.language}
                onChange={c=>setTabs(p=>p.map((t,i)=>i===activeTabIndex?{...t,content:c,isDirty:true}:t))}
                onCursorChange={l=>{ const m=l.match(/\b([A-Za-z_]\w*)\b/); if(m) setCursorSymbol(m[1]); }}/>
            ) : (
              <div style={s.welcome}>
                <div style={s.welcomeCard}>
                  <img src={logoImg} alt="Atlas" style={s.welcomeLogo}/>
                  <h2 style={s.welcomeH2}>Atlas Studio</h2>
                  <p style={s.welcomeP}>Professional AI-Native IDE Platform</p>
                  <div style={s.welcomeRow}>
                    <button style={s.wBtn} onClick={handleSelectRepo}>Open Workspace</button>
                    <button style={s.wBtnO} onClick={()=>setActiveSidebar("settings")}>Settings</button>
                  </div>
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
              </div>
              <div style={s.dockContent}>
                {bottomTab==="terminal" && <TerminalPanel repoPath={repoPath}/>}
                {bottomTab==="output" && <div style={s.log}><p style={s.logLine}>[PASS] Ready.{repoPath&&` Workspace: ${repoPath}`}</p></div>}
                {bottomTab==="ai" && <div style={s.log}>{aiEvents.length===0?<p style={s.logDim}>No agent runs.</p>:aiEvents.map((e,i)=><p key={i} style={s.logLine}>{e}</p>)}</div>}
              </div>
            </div>
          )}
        </div>

        {showRightAiSidebar && <AiSidebar repoPath={repoPath} activeFilePath={activeTab?.filePath}/>}
      </div>

      <StatusBar repoPath={repoPath} activeLanguage={activeTab?.language} cursorSymbol={cursorSymbol}/>
      <CommandPalette isOpen={showCommandPalette} commands={commands} onClose={()=>setShowCommandPalette(false)}/>
    </div>
  );
}

const s: Record<string,React.CSSProperties> = {
  root:{display:"flex",flexDirection:"column",height:"100vh",width:"100vw",backgroundColor:"#09090b",color:"#fafafa",fontFamily:"Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",overflow:"hidden"},
  toolbar:{display:"flex",alignItems:"center",justifyContent:"space-between",height:"40px",padding:"0 8px",backgroundColor:"#0d0d10",borderBottom:"1px solid #27272a",position:"relative" as const},
  tleft:{display:"flex",alignItems:"center",gap:"6px",flexShrink:0},
  logoImg:{width:"20px",height:"20px",objectFit:"contain"},
  logoTxt:{fontSize:"12px",fontWeight:800,letterSpacing:"1.5px",color:"#fafafa"},
  navGrp:{display:"flex",gap:"1px",marginLeft:"4px"},
  navBtn:{width:"26px",height:"26px",display:"flex",alignItems:"center",justifyContent:"center",background:"none",border:"none",borderRadius:"4px",color:"#71717a",cursor:"pointer"},
  tcenter:{position:"absolute" as const,left:"50%",transform:"translateX(-50%)"},
  searchBar:{display:"flex",alignItems:"center",gap:"8px",backgroundColor:"#18181b",border:"1px solid #3f3f46",borderRadius:"6px",padding:"5px 14px",cursor:"pointer",width:"320px",color:"#fafafa"},
  searchTxt:{flex:1,fontSize:"12px",color:"#a1a1aa",textAlign:"left" as const},
  kbdHint:{fontSize:"10px",color:"#71717a",backgroundColor:"#27272a",border:"1px solid #3f3f46",borderRadius:"3px",padding:"1px 5px",fontFamily:"inherit"},
  tright:{display:"flex",alignItems:"center",gap:"2px",flexShrink:0},
  tbBtn:{width:"30px",height:"30px",display:"flex",alignItems:"center",justifyContent:"center",background:"none",border:"none",borderRadius:"4px",color:"#71717a",cursor:"pointer"},
  tbOn:{color:"#fafafa",backgroundColor:"#27272a"},
  tbDiv:{width:"1px",height:"16px",backgroundColor:"#27272a",margin:"0 4px"},
  body:{display:"flex",flex:1,overflow:"hidden"},
  actBar:{width:"56px",backgroundColor:"#09090b",borderRight:"1px solid #27272a",display:"flex",flexDirection:"column",justifyContent:"space-between",paddingTop:"6px",paddingBottom:"6px"},
  actTop:{display:"flex",flexDirection:"column",gap:"2px",alignItems:"center"},
  actBot:{display:"flex",flexDirection:"column",alignItems:"center"},
  actBtn:{width:"52px",padding:"8px 0",border:"none",background:"transparent",color:"#71717a",cursor:"pointer",display:"flex",flexDirection:"column" as const,alignItems:"center",gap:"3px",borderRadius:"4px"},
  actOn:{color:"#fafafa",borderLeft:"2px solid #fafafa"},
  actLbl:{fontSize:"9px",fontWeight:600,letterSpacing:"0.3px",textAlign:"center" as const},
  sidebar:{width:"260px",backgroundColor:"#0d0d10",display:"flex",flexDirection:"column",borderRight:"1px solid #27272a"},
  center:{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",backgroundColor:"#121215"},
  tabBar:{display:"flex",height:"35px",backgroundColor:"#09090b",borderBottom:"1px solid #27272a",overflowX:"auto"},
  tab:{display:"flex",alignItems:"center",gap:"6px",padding:"0 12px",minWidth:"100px",maxWidth:"180px",backgroundColor:"#0d0d10",borderRight:"1px solid #27272a",color:"#71717a",fontSize:"12px",cursor:"pointer",borderTop:"2px solid transparent",userSelect:"none"},
  tabOn:{backgroundColor:"#121215",color:"#fafafa",borderTop:"2px solid #fafafa"},
  tabName:{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:500},
  tabDot:{color:"#e4e4e7",fontSize:"14px"},
  tabX:{fontSize:"14px",opacity:0.5,padding:"0 2px"},
  editorArea:{flex:1,overflow:"hidden",position:"relative" as const},
  welcome:{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",backgroundColor:"#09090b"},
  welcomeCard:{display:"flex",flexDirection:"column",alignItems:"center",padding:"48px 64px",borderRadius:"12px",backgroundColor:"#0d0d10",border:"1px solid #27272a",boxShadow:"0 20px 60px rgba(0,0,0,0.5)"},
  welcomeLogo:{width:"90px",height:"90px",objectFit:"contain",marginBottom:"20px",filter:"drop-shadow(0 8px 20px rgba(0,0,0,0.6))"},
  welcomeH2:{margin:"0 0 6px",fontSize:"22px",fontWeight:800,color:"#fafafa"},
  welcomeP:{margin:"0 0 28px",fontSize:"13px",color:"#71717a"},
  welcomeRow:{display:"flex",gap:"12px"},
  wBtn:{backgroundColor:"#fafafa",color:"#09090b",border:"none",padding:"10px 20px",borderRadius:"6px",fontWeight:700,fontSize:"13px",cursor:"pointer"},
  wBtnO:{backgroundColor:"transparent",color:"#fafafa",border:"1px solid #3f3f46",padding:"10px 20px",borderRadius:"6px",fontWeight:600,fontSize:"13px",cursor:"pointer"},
  dock:{height:"230px",backgroundColor:"#09090b",borderTop:"1px solid #27272a",display:"flex",flexDirection:"column"},
  dockTabs:{display:"flex",height:"32px",backgroundColor:"#0d0d10",borderBottom:"1px solid #27272a"},
  dockTab:{background:"none",border:"none",borderBottom:"2px solid transparent",borderRight:"1px solid #27272a",color:"#71717a",padding:"0 18px",fontSize:"11px",fontWeight:700,cursor:"pointer",letterSpacing:"0.5px"},
  dockOn:{color:"#fafafa",borderBottom:"2px solid #fafafa"},
  dockContent:{flex:1,overflow:"hidden"},
  log:{padding:"10px 14px",fontFamily:"'JetBrains Mono',Consolas,monospace",fontSize:"12px",overflowY:"auto",height:"100%"},
  logLine:{color:"#e4e4e7",lineHeight:"1.6"},
  logDim:{color:"#71717a"},
  agentPane:{display:"flex",flexDirection:"column",height:"100%",padding:"12px",gap:"10px"},
  paneHdr:{fontSize:"11px",fontWeight:700,letterSpacing:"0.8px",color:"#fafafa"},
  agentArea:{flex:1,maxHeight:"100px",backgroundColor:"#18181b",border:"1px solid #27272a",color:"#fafafa",borderRadius:"6px",padding:"8px",fontSize:"12px",resize:"none",fontFamily:"inherit"},
  agentBtn:{backgroundColor:"#fafafa",color:"#09090b",border:"none",borderRadius:"6px",padding:"8px",fontWeight:700,fontSize:"12px",cursor:"pointer"},
};