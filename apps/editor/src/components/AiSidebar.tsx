import React, { useState, useEffect, useRef } from "react";
import { ComposerDiff } from "./ComposerDiff.js";
import { SynapseDashboard } from "./SynapseDashboard.js";
import { logToOutput } from "./OutputPanel.js";
import { RichComposer } from "./RichComposer.js";
import { MermaidDiagramViewer } from "./MermaidDiagramViewer.js";

interface AiSidebarProps {
  repoPath?: string;
  activeFilePath?: string;
  activeContent?: string;
  openTabs?: Array<{ filePath: string; content: string }>;
  cursorLine?: number;
  cursorSymbol?: string;
  terminalHistory?: string;
  diagnostics?: string;
  width?: number;
  onClose?: () => void;
  onOpenSettings?: () => void;
}

const PROVIDER_MODELS: Record<string, Array<{ label: string; value: string }>> = {
  "routing.run": [
    { label: "Kimi K2.6 (Fast)", value: "kimi-k2.6" },
    { label: "Claude Opus 4.8", value: "claude-opus-4-8" },
    { label: "Claude Sonnet 4.6", value: "claude-sonnet-4-6" },
    { label: "DeepSeek V4 Pro", value: "deepseek-v4-pro" },
    { label: "DeepSeek V4 Flash", value: "deepseek-v4-flash" },
    { label: "GPT-5.6 Sol", value: "gpt-5.6-sol" },
    { label: "GPT-5.6 Luna", value: "gpt-5.6-luna" },
    { label: "GPT-5.6 Terra", value: "gpt-5.6-terra" },
    { label: "Kimi K2.6 Nitro", value: "kimi-k2.6-nitro" },
    { label: "Kimi K2.7 Code", value: "kimi-k2.7-code" },
    { label: "Kimi K2.7 Code Nitro", value: "kimi-k2.7-code-nitro" },
    { label: "GLM 5.2", value: "glm-5.2" },
    { label: "GLM 5.2 Nitro", value: "glm-5.2-nitro" },
    { label: "Nemotron 3 Ultra", value: "nemotron-3-ultra" },
    { label: "Qwen 3.5 9B", value: "qwen3.5-9b" },
  ],
  "openai": [
    { label: "GPT-4o", value: "gpt-4o" },
    { label: "GPT-4o Mini", value: "gpt-4o-mini" },
    { label: "o3-mini", value: "o3-mini" },
  ],
  "anthropic": [
    { label: "Claude 3.5 Sonnet", value: "claude-3-5-sonnet" },
    { label: "Claude 3.5 Haiku", value: "claude-3-5-haiku" },
    { label: "Claude 3 Opus", value: "claude-3-opus" },
  ],
  "gemini": [
    { label: "Gemini 2.5 Flash", value: "gemini-2.5-flash" },
    { label: "Gemini 2.5 Pro", value: "gemini-2.5-pro" },
    { label: "Gemini 2.0 Flash", value: "gemini-2.0-flash" },
  ],
  "openai-compatible": [
    { label: "Custom OpenAI-Compatible", value: "custom" },
  ],
};

export function AiSidebar({ repoPath, activeFilePath, activeContent, openTabs, cursorLine, cursorSymbol, terminalHistory, diagnostics, width = 320, onClose, onOpenSettings }: AiSidebarProps) {
  const [prompt, setPrompt] = useState("");
  const [activeRuns, setActiveRuns] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<Array<{ role: "user" | "agent"; text: string }>>([]);
  const [activeView, setActiveView] = useState<"chat" | "history" | "dashboard">("chat");
  const [composerOutput, setComposerOutput] = useState<any>(null);
  const [streamEvents, setStreamEvents] = useState<any[]>([]);
  const [streamingTokenText, setStreamingTokenText] = useState("");
  const [awaitingHuman, setAwaitingHuman] = useState<string | null>(null);
  const [planningMode, setPlanningMode] = useState(false);
  const [planApprovalReq, setPlanApprovalReq] = useState<{reqId: string, plan: any} | null>(null);

  // Model & Provider state (syncs with Settings)
  const [currentProvider, setCurrentProvider] = useState<string>("gemini");
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash");

  useEffect(() => {
    const loadSettings = async () => {
      const api = window.atlasAPI;
      if (api?.getSettings) {
        const s = await api.getSettings();
        if (s) {
          if (s.aiProvider) setCurrentProvider(s.aiProvider);
          if (s.aiModel) setSelectedModel(s.aiModel);
        }
      }
    };
    loadSettings();
    window.addEventListener("focus", loadSettings);
  }, []);

  const availableModels = PROVIDER_MODELS[currentProvider] || PROVIDER_MODELS["gemini"] || [];

  const handleModelChange = (modelVal: string) => {
    setSelectedModel(modelVal);
    const api = window.atlasAPI;
    if (api?.updateSettings) {
      api.updateSettings({ aiModel: modelVal });
    }
  };

  useEffect(() => {
    const api = window.atlasAPI;
    if (!api?.onEvent) return;

    const unsubscribePlan = api.onRequestPlanApproval?.((payload: { reqId: string, plan: any }) => {
      setPlanApprovalReq(payload);
    });

    const unsub = api.onEvent((ev: any) => {
      setStreamEvents((prev) => [...prev, ev]);
      if (ev.type === "token" && ev.content) {
        setStreamingTokenText((prev) => prev + ev.content);
      }
      if (ev.type === "log" && (ev.message || ev.content)) {
        const text = ev.message || ev.content;
        if (text && !text.startsWith("State:")) {
          setStreamingTokenText((prev) => prev ? prev + "\n" + text : text);
          logToOutput("Agent", text, "info");
        }
      }
      if (ev.type === "step_start" && ev.tool) {
        logToOutput("Agent", `Tool: ${ev.tool}${ev.args ? ` (${JSON.stringify(ev.args).slice(0,60)})` : ""}`, "info");
      }
      if (ev.type === "state_change") {
        const level = ev.state === "ERROR" ? "error" : ev.state === "DONE" ? "success" : "info";
        logToOutput("Agent", `State: ${ev.state}${ev.runId ? ` [${ev.runId.slice(0,8)}]` : ""}`, level);
        setActiveRuns(prev => {
          const next = new Set(prev);
          next.delete(ev.runId);
          return next;
        });
        if (ev.state === "DONE" || ev.state === "CANCELLED" || ev.state === "APPROVED") setAwaitingHuman(null);
      }
      if (ev.type === "awaiting_human") {
        setAwaitingHuman(ev.reason);
        logToOutput("Agent", `Awaiting human input: ${ev.reason ?? ""}`, "warn");
      }
    });

    return () => {
      unsub();
      if (unsubscribePlan) unsubscribePlan();
    };
  }, []);

  const chatStreamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = chatStreamRef.current;
    if (el) {
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
      if (isNearBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [messages, streamEvents]);

  const handleSend = async () => {
    if (!prompt.trim()) return;

    const userMsg = prompt.trim();
    setPrompt("");
    const newMessages = [...messages, { role: "user" as const, text: userMsg }];
    setMessages(newMessages);
    setStreamEvents([]);
    setStreamingTokenText("");
    setAwaitingHuman(null);

    const api = window.atlasAPI;
    if (api?.run) {
      const runKey = Date.now().toString();
      setActiveRuns(prev => { const n = new Set(prev); n.add(runKey); return n; });
      try {
        let gitStatusSummary = "<Not Provided>";
        if (api.gitStatus && repoPath) {
          try {
            const status = await api.gitStatus(repoPath);
            if (status && status.length > 0) {
              gitStatusSummary = status.map((s: any) => `${s.staged ? "[Staged]" : "[Unstaged]"} ${s.status} ${s.path}`).join("\n");
            } else {
              gitStatusSummary = "Working tree clean";
            }
          } catch (e) {
            gitStatusSummary = "Git status unavailable";
          }
        }

        let terminalHistory = "";
        try {
          if (api.terminalGetHistory) {
            terminalHistory = await api.terminalGetHistory("term-1");
          }
        } catch (e) {}

        let diagnostics = "";
        try {
          if ((window as any).monaco) {
            const markers = (window as any).monaco.editor.getModelMarkers({});
            if (markers && markers.length > 0) {
              diagnostics = markers.map((m: any) => `[${m.resource?.path || 'unknown'}] Line ${m.startLineNumber}: ${m.message}`).join("\n");
            }
          }
        } catch (e) {}

        const context = {
          activeFilePath,
          activeContent,
          openTabs,
          cursorLine,
          cursorSymbol,
          gitStatusSummary,
          planningMode,
          terminalHistory,
          diagnostics,
          model: selectedModel
        };

        const result = await api.run(newMessages, context);
        if (result.error) {
          setMessages((prev) => [...prev, { role: "agent", text: `Error: ${result.error}` }]);
          if (result.error.toLowerCase().includes("key") || result.error.toLowerCase().includes("provider")) {
            if (onOpenSettings) onOpenSettings();
            else window.atlasAPI?.openSettingsWindow?.();
          }
        } else {
          const replyText = result.plan?.planningReasoning || streamingTokenText || (result.coderOutputs && result.coderOutputs.length > 0 ? `Completed changes in ${result.coderOutputs.length} step(s).` : "Response completed with no text output.");
          setMessages((prev) => [...prev, { role: "agent", text: replyText }]);
          setAwaitingHuman(null);
          
          if (result.coderOutputs && result.coderOutputs.length > 0) {
            const lastOutput = result.coderOutputs[result.coderOutputs.length - 1];
            if (lastOutput.filesBefore && lastOutput.filesAfter) {
              setComposerOutput(lastOutput);
            }
          }
        }
      } catch (err: any) {
        const errMsg = String(err);
        setMessages((prev) => [...prev, { role: "agent", text: `Error: ${errMsg}` }]);
        if (errMsg.toLowerCase().includes("key") || errMsg.toLowerCase().includes("provider")) {
          if (onOpenSettings) onOpenSettings();
          else window.atlasAPI?.openSettingsWindow?.();
        }
      } finally {
        setActiveRuns(prev => { const n = new Set(prev); n.delete(runKey); return n; });
      }
    } else {
      setMessages((prev) => [...prev, { role: "agent", text: "Error: AI Agent API is not connected or initialized." }]);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setPrompt("");
    setActiveView("chat");
  };

  return (
    <>
      {composerOutput && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }}>
          <ComposerDiff
            filesBefore={composerOutput.filesBefore || {}}
            filesAfter={composerOutput.filesAfter || {}}
            language="typescript"
            onAccept={() => setComposerOutput(null)}
            onReject={async () => {
              // Revert by calling API write for the before files
              const api = window.atlasAPI;
              for (const [fp, content] of Object.entries(composerOutput.filesBefore)) {
                await api.writeFile(fp, content as string);
              }
              setComposerOutput(null);
            }}
          />
        </div>
      )}
      <div style={{ ...styles.container, width: `${width}px` }}>
        <div style={styles.header}>
        <span style={styles.headerTitle}>Agent</span>
        <div style={styles.headerActions}>
          <button style={styles.iconBtn} title="Remote Link: http://localhost:4000">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
          </button>
          <button style={styles.iconBtn} onClick={() => setActiveView("chat")} title="New Chat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button style={styles.iconBtn} onClick={() => setActiveView(activeView === "dashboard" ? "chat" : "dashboard")} title="Synapse Flight Deck">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M3 9h18"/></svg>
          </button>
          <button style={styles.iconBtn} onClick={() => setActiveView(activeView === "history" ? "chat" : "history")} title="Past Chats">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </button>
          <button style={styles.iconBtn} title="Options (MCP, Customization)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          </button>
          <button style={styles.iconBtn} onClick={onClose} title="Close Panel">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <div ref={chatStreamRef} style={styles.chatStream}>
        {activeView === "dashboard" ? (
          <SynapseDashboard events={streamEvents} />
        ) : messages.length === 0 && activeView !== "history" ? (
          <div style={styles.emptyState}>
            <div style={styles.logoMark}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-main, #e4e4e7)" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
            </div>
            <h3 style={styles.emptyTitle}>Atlas</h3>
          </div>
        ) : activeView === "history" ? (
          <div style={styles.historyPanel}>
            <h4 style={styles.historyHdr}>Past Chats</h4>
            <div style={{color: "#52525b", fontSize: "12px"}}>No past chats available yet.</div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const mermaidMatch = msg.text.match(/```mermaid([\s\S]*?)```/);
            return (
              <div key={i} className="anim-slide-up" style={msg.role === "user" ? styles.userBubble : styles.agentBubble}>
                <p style={styles.bubbleText}>{msg.text.replace(/```mermaid[\s\S]*?```/, "").trim()}</p>
                {mermaidMatch && <MermaidDiagramViewer code={mermaidMatch[1]!} />}
              </div>
            );
          })
        )}
        {activeRuns.size > 0 && (
          <div style={styles.agentBubble}>
            {streamEvents.map((ev, idx) => (
              <div key={idx} style={{ fontSize: "11px", color: "var(--text-muted, #a1a1aa)", marginBottom: "4px" }}>
                {ev.runId && <span style={{color: "var(--accent, #38bdf8)", marginRight: "4px"}}>[{ev.runId.substring(0,4)}]</span>}
                {ev.type === "state_change" && `State: ${ev.state}`}
                {ev.type === "plan_ready" && `Plan generated with ${ev.plan.steps.length} steps.`}
                {ev.type === "step_start" && `Working on: ${ev.step.title}`}
                {ev.type === "coder_output" && `Coder modified ${ev.output.modifiedFiles?.length || 0} files.`}
                {ev.type === "test_result" && `Tests ${ev.result.status} (${ev.result.passed}/${ev.result.total}).`}
                {ev.type === "review_result" && `Review complete: ${ev.result.overallRisk} risk.`}
              </div>
            ))}
            {awaitingHuman && !planApprovalReq ? (
              <p style={{ ...styles.bubbleText, color: "#f87171", marginTop: "8px" }}>
                [WARN] Awaiting Human: {awaitingHuman}
              </p>
            ) : planApprovalReq ? (
              <div style={{ marginTop: "8px", padding: "8px", border: "1px solid #38bdf8", borderRadius: "4px" }}>
                <p style={{ color: "var(--accent, #38bdf8)", fontWeight: "bold", marginBottom: "8px" }}>Plan Approval Required</p>
                <p style={{ color: "var(--text-main, #e4e4e7)", fontSize: "11px", marginBottom: "12px" }}>Review the plan in artifacts.</p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button 
                    style={{ ...styles.sendBtn, width: "auto", padding: "4px 12px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold" }}
                    onClick={() => {
                      window.atlasAPI.sendPlanDecision(planApprovalReq.reqId, true);
                      setPlanApprovalReq(null);
                      setAwaitingHuman(null);
                    }}
                  >
                    Approve
                  </button>
                  <button 
                    style={{ background: "var(--border-color, #3f3f46)", color: "var(--text-main, #e4e4e7)", border: "none", width: "auto", padding: "4px 12px", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
                    onClick={() => {
                      window.atlasAPI.sendPlanDecision(planApprovalReq.reqId, false);
                      setPlanApprovalReq(null);
                      setAwaitingHuman(null);
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: "8px" }}>
                <p style={{ ...styles.bubbleText, display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className="pulsing-dot" style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#38bdf8" }} />
                  Running {activeRuns.size} task(s)...
                </p>
                {streamingTokenText && (
                  <div style={{ marginTop: "8px", color: "var(--text-main, #e4e4e7)", fontSize: "13px", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                    {streamingTokenText}
                    <span style={{ display: "inline-block", width: "4px", height: "14px", backgroundColor: "#38bdf8", marginLeft: "4px", animation: "blink 1s step-end infinite" }} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={styles.inputArea}>
        <div style={styles.inputBox} className="ai-input-box">
          <div style={styles.inputTop}>
            <button className="sidebar-action-btn" style={styles.addContextBtn} title="Add context, media, or files">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <RichComposer
              value={prompt}
              onChange={(val) => setPrompt(val)}
              onSubmit={handleSend}
              openTabs={openTabs}
              disabled={activeRuns.size > 0}
            />
          </div>
            <select
              style={{
                backgroundColor: "#18181b", border: "1px solid #27272a", color: "#38bdf8",
                borderRadius: 4, padding: "2px 6px", fontSize: 11, fontWeight: 600, outline: "none",
                maxWidth: 150
              }}
              value={selectedModel}
              onChange={e => handleModelChange(e.target.value)}
            >
              {availableModels.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>

            <button
              style={{
                fontSize: 10, background: "none", border: "1px solid #3f3f46", borderRadius: 4,
                color: planningMode ? "#38bdf8" : "#71717a", padding: "2px 6px", cursor: "pointer"
              }}
              onClick={() => setPlanningMode(!planningMode)}
            >
              {planningMode ? "Plan: ON" : "Plan: OFF"}
            </button>

            <button
              style={{ fontSize: 10, background: "none", border: "1px solid #38bdf8", borderRadius: 4, color: "#38bdf8", padding: "2px 6px", cursor: "pointer" }}
              onClick={() => {
                if (onOpenSettings) onOpenSettings();
                else window.atlasAPI?.openSettingsWindow?.();
              }}
              title="Open AI Configuration Settings"
            >
              [Key]
            </button>

            <div style={styles.actionRow}>
              {prompt.trim() ? (
                <button className="sidebar-action-btn" style={styles.sendBtn} onClick={handleSend}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              ) : (
                <button className="sidebar-action-btn" style={styles.micBtn} title="Voice Input">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                </button>
              )}
            </div>
          </div>
        </div>
        <div style={styles.disclaimer}>
          AI may make mistakes. Double-check all generated code.
        </div>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "rgba(9, 9, 11, 0.7)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    borderLeft: "1px solid rgba(56, 189, 248, 0.2)",
    fontSize: "13px",
    flexShrink: 0,
    transition: "width 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "4px 8px",
    backgroundColor: "#000000",
    borderBottom: "1px solid #27272a",
  },
  headerTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--text-main, #e4e4e7)",
  },
  headerActions: {
    display: "flex",
    gap: "6px",
  },
  iconBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted, #a1a1aa)",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  chatStream: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  emptyState: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-muted, #a1a1aa)",
  },
  logoMark: {
    marginBottom: "12px",
  },
  emptyTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "var(--text-main, #fafafa)",
    margin: 0,
  },
  userBubble: {
    backgroundColor: "var(--bg-base, #09090b)",
    border: "1px solid #27272a",
    borderRadius: "8px",
    padding: "12px",
    alignSelf: "flex-end",
    maxWidth: "90%",
  },
  agentBubble: {
    backgroundColor: "transparent",
    padding: "4px 0",
    alignSelf: "flex-start",
    maxWidth: "95%",
  },
  bubbleText: {
    color: "var(--text-main, #e4e4e7)",
    lineHeight: 1.5,
    margin: 0,
    fontSize: "13px",
  },
  inputArea: {
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    backgroundColor: "#000000",
  },
  inputBox: {
    backgroundColor: "var(--bg-base, #09090b)",
    border: "1px solid #27272a",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    padding: "8px",
    gap: "8px",
  },
  inputTop: {
    display: "flex",
    gap: "8px",
    alignItems: "flex-start",
  },
  addContextBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted, #a1a1aa)",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "2px",
  },
  textarea: {
    flex: 1,
    minHeight: "40px",
    maxHeight: "150px",
    backgroundColor: "transparent",
    border: "none",
    color: "var(--text-main, #fafafa)",
    fontSize: "13px",
    resize: "none",
    fontFamily: "inherit",
    outline: "none",
    lineHeight: 1.5,
  },
  inputBottom: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingLeft: "2px",
    paddingRight: "2px",
  },
  modelSelector: {
    display: "flex",
    alignItems: "center",
    color: "var(--text-muted, #a1a1aa)",
    fontSize: "11px",
    fontWeight: 500,
    cursor: "pointer",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  actionRow: {
    display: "flex",
    alignItems: "center",
  },
  micBtn: {
    background: "var(--bg-header, #18181b)",
    border: "none",
    color: "var(--text-muted, #a1a1aa)",
    borderRadius: "50%",
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  sendBtn: {
    background: "var(--accent, #38bdf8)",
    border: "none",
    color: "#000000",
    borderRadius: "50%",
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  disclaimer: {
    fontSize: "10px",
    color: "#52525b",
    textAlign: "center",
  },
  historyPanel: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  historyHdr: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--text-muted, #71717a)",
    textTransform: "uppercase",
    margin: "0 0 8px 0",
  },
  historyItem: {
    padding: "8px 12px",
    backgroundColor: "var(--bg-base, #09090b)",
    border: "1px solid #27272a",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    color: "var(--text-main, #e4e4e7)",
  },
};
