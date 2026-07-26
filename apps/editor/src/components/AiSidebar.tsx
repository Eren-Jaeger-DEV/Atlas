import React, { useState, useEffect, useRef, useCallback } from "react";
import { ComposerDiff } from "./ComposerDiff.js";
import { SynapseDashboard } from "./SynapseDashboard.js";
import { logToOutput } from "./OutputPanel.js";
import { RichComposer } from "./RichComposer.js";
import { MermaidDiagramViewer } from "./MermaidDiagramViewer.js";

import { ArtifactsViewer } from "./ArtifactsViewer";
import { BackgroundTaskManager } from "./BackgroundTaskManager";

type ChatMessage = {
  role: "user" | "agent";
  text: string;
  thinkingText?: string;
  thinkingMs?: number;
  durationMs?: number;
  steps?: string[];
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

function FormattedMessageText({ text }: { text: string }) {
  if (text.startsWith("[Failover]")) {
    const match = text.match(/^\[Failover\]\s+(.*?)\n\n([\s\S]*)$/);
    if (match && match[2]) {
      return (
        <div>
          <div style={{
            margin: "6px 0 10px 0", padding: "6px 10px",
            backgroundColor: "rgba(250,204,21,0.1)",
            border: "1px solid rgba(250,204,21,0.3)",
            borderRadius: "6px", color: "#facc15", fontSize: "11px", fontWeight: 600
          }}>
            [WARN] {match[1]}
          </div>
          <FormattedMessageText text={match[2]} />
        </div>
      );
    }
  }

  const parts = text.split(/(```[\s\S]*?```)/g);
  return (
    <div>
      {parts.map((part, idx) => {
        const codeMatch = part.match(/^```(\w+)?\n([\s\S]*?)```$/);
        if (codeMatch) {
          const lang = codeMatch[1] || "code";
          const codeContent = codeMatch[2] || "";
          return (
            <div key={idx} style={{
              position: "relative",
              margin: "8px 0",
              backgroundColor: "rgba(0,0,0,0.4)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "6px",
              overflow: "hidden"
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "4px 10px", backgroundColor: "rgba(255,255,255,0.04)",
                fontSize: "11px", color: "#a1a1aa", borderBottom: "1px solid rgba(255,255,255,0.05)"
              }}>
                <span>{lang}</span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    style={{ background: "none", border: "none", color: "#38bdf8", cursor: "pointer", fontSize: "10px", fontWeight: 600 }}
                    onClick={() => navigator.clipboard.writeText(codeContent)}
                  >
                    Copy
                  </button>
                  <button
                    style={{ background: "none", border: "none", color: "#4ade80", cursor: "pointer", fontSize: "10px", fontWeight: 600 }}
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("atlas:apply-code-snippet", { detail: { code: codeContent } }));
                    }}
                  >
                    Apply to File
                  </button>
                </div>
              </div>
              <pre style={{ margin: 0, padding: "10px", fontSize: "12px", fontFamily: "var(--font-mono)", overflowX: "auto", color: "#e4e4e7" }}>
                {codeContent}
              </pre>
            </div>
          );
        }

        const imgMatch = part.match(/!\[(.*?)\]\((.*?)\)/);
        if (imgMatch) {
          return (
            <div key={idx} style={{ margin: "8px 0" }}>
              <img src={imgMatch[2]} alt={imgMatch[1]} style={{ maxWidth: "100%", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)" }} />
              {imgMatch[1] && <div style={{ fontSize: "11px", color: "#a1a1aa", marginTop: "2px" }}>{imgMatch[1]}</div>}
            </div>
          );
        }

        return <span key={idx} style={{ whiteSpace: "pre-wrap" }}>{part}</span>;
      })}
    </div>
  );
}

function FormattedThoughtText({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\b[A-Za-z0-9_]+\.(?:tsx|ts|jsx|js|py|json|md)\b|\b[A-Z][A-Za-z0-9_]{3,}\b)/g);

  return (
    <span>
      {parts.map((part, idx) => {
        if (!part) return null;
        const isBacktick = part.startsWith("`") && part.endsWith("`");
        const cleanText = isBacktick ? part.slice(1, -1) : part;
        const isCodeSymbol = isBacktick || /^[A-Za-z0-9_]+\.(?:tsx|ts|jsx|js|py|json|md)$/.test(part) || /^[A-Z][A-Za-z0-9_]{3,}$/.test(part);

        if (isCodeSymbol) {
          const isFile = /^[A-Za-z0-9_]+\.(?:tsx|ts|jsx|js|py|json|md)$/.test(cleanText);
          return (
            <span
              key={idx}
              onClick={() => {
                if (isFile) {
                  window.dispatchEvent(new CustomEvent("atlas:open-file", { detail: { filePath: cleanText, line: 1 } }));
                }
              }}
              style={{
                display: "inline-block",
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                color: "#09090b",
                fontFamily: "var(--font-mono)",
                fontSize: "10.5px",
                fontWeight: 600,
                padding: "1px 6px",
                borderRadius: "4px",
                margin: "0 2px",
                verticalAlign: "baseline",
                boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
                cursor: isFile ? "pointer" : "default"
              }}
              title={isFile ? `Open ${cleanText}` : undefined}
            >
              {cleanText}
            </span>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </span>
  );
}

function getLangBadge(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (ext === "tsx" || ext === "jsx") return { label: "⚛", color: "#c084fc", bg: "rgba(192,132,252,0.15)" };
  if (ext === "ts") return { label: "TS", color: "#38bdf8", bg: "rgba(56,189,248,0.15)" };
  if (ext === "js") return { label: "JS", color: "#facc15", bg: "rgba(250,204,21,0.15)" };
  if (ext === "py") return { label: "PY", color: "#4ade80", bg: "rgba(74,222,128,0.15)" };
  if (ext === "json") return { label: "JSON", color: "#fb923c", bg: "rgba(251,146,60,0.15)" };
  return { label: ext.toUpperCase() || "FILE", color: "#a1a1aa", bg: "rgba(161,161,170,0.15)" };
}

function ProcessStepList({ steps }: { steps: string[] }) {
  const [exploredExpanded, setExploredExpanded] = React.useState(false);
  const [expandedCmdIndex, setExpandedCmdIndex] = React.useState<number | null>(null);

  const exploredSteps = steps.filter(s => s.startsWith("Analyzed ") || s.toLowerCase().includes("search"));
  const nonExploredSteps = steps.filter(s => !s.startsWith("Analyzed ") && !s.toLowerCase().includes("search"));

  const fileCount = exploredSteps.filter(s => s.startsWith("Analyzed ")).length;
  const searchCount = exploredSteps.filter(s => s.toLowerCase().includes("search")).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
      {exploredSteps.length > 0 && (
        <div>
          <button
            onClick={() => setExploredExpanded(!exploredExpanded)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", gap: "6px",
              color: "#a1a1aa", fontSize: "11px", fontWeight: 500, padding: "2px 0"
            }}
          >
            <span>
              Explored {fileCount} file{fileCount !== 1 ? "s" : ""}{searchCount > 0 ? `, ${searchCount} search` : ""}
            </span>
            <svg
              width="9" height="9" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              style={{ transform: exploredExpanded ? "rotate(180deg)" : "rotate(90deg)", transition: "transform 0.15s" }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          {exploredExpanded && (
            <div style={{ paddingLeft: "10px", marginTop: "4px", display: "flex", flexDirection: "column", gap: "3px" }}>
              {exploredSteps.map((step, i) => {
                const match = step.match(/^Analyzed\s+(.*?)\s*(#L\d+-\d+)?$/);
                const fileName = (match && match[1]) ? match[1] : step.replace(/^Analyzed\s*/, "");
                const lineRange = (match && match[2]) ? match[2] : "";
                const firstLineStr = lineRange ? lineRange.replace("#L", "").split("-")[0] : "";
                const lineNum = firstLineStr ? parseInt(firstLineStr) : 1;
                const badge = getLangBadge(fileName);
                return (
                  <div
                    key={i}
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("atlas:open-file", { detail: { filePath: fileName, line: lineNum } }));
                    }}
                    style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", cursor: "pointer" }}
                    title={`Open ${fileName} at line ${lineNum}`}
                  >
                    <span style={{ color: "#71717a" }}>Analyzed</span>
                    <span style={{ backgroundColor: badge.bg, color: badge.color, padding: "0 4px", borderRadius: "3px", fontSize: "9.5px", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                      {badge.label}
                    </span>
                    <span style={{ color: "#e4e4e7", fontWeight: 600, fontFamily: "var(--font-mono)", textDecoration: "underline" }}>{fileName}</span>
                    {lineRange && (
                      <span style={{ backgroundColor: "rgba(192,132,252,0.15)", color: "#c084fc", padding: "1px 5px", borderRadius: "3px", fontSize: "9.5px", fontFamily: "var(--font-mono)" }}>
                        {lineRange}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {nonExploredSteps.map((step, i) => {
        const isEdited = step.startsWith("Edited ") || step.startsWith("Modified ");
        const isRan = step.startsWith("Ran ") || step.startsWith("Run ");
        const isTimed = step.startsWith("Timed ");

        if (isEdited) {
          const match = step.match(/^(?:Edited|Modified)\s+(.*?)(?:\s+([+-]\d+)\s+([+-]\d+))?$/);
          const fileName = (match && match[1]) ? match[1] : step.replace(/^(?:Edited|Modified)\s*/, "");
          const added = (match && match[2]) ? match[2] : "";
          const deleted = (match && match[3]) ? match[3] : "";
          const badge = getLangBadge(fileName);

          return (
            <div
              key={i}
              onClick={() => {
                window.dispatchEvent(new CustomEvent("atlas:open-file", { detail: { filePath: fileName, line: 1 } }));
              }}
              style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", margin: "2px 0", cursor: "pointer" }}
              title={`Open ${fileName}`}
            >
              <span style={{ color: "#a1a1aa", fontWeight: 500 }}>Edited</span>
              <span style={{ backgroundColor: badge.bg, color: badge.color, padding: "1px 4px", borderRadius: "3px", fontSize: "9.5px", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                {badge.label}
              </span>
              <span style={{ color: "#ffffff", fontWeight: 700, fontFamily: "var(--font-mono)", textDecoration: "underline" }}>{fileName}</span>
              {added && <span style={{ color: "#4ade80", fontWeight: 600, fontFamily: "var(--font-mono)", fontSize: "10.5px" }}>{added}</span>}
              {deleted && <span style={{ color: "#f87171", fontWeight: 600, fontFamily: "var(--font-mono)", fontSize: "10.5px" }}>{deleted}</span>}
            </div>
          );
        }

        if (isRan) {
          const cmdText = step.replace(/^(?:Ran|Run)\s*/, "");
          const isExpanded = expandedCmdIndex === i;
          // Collect all subsequent TerminalOutput steps
          const termOutputs: string[] = [];
          for (let j = i + 1; j < nonExploredSteps.length; j++) {
            const nextStep = nonExploredSteps[j];
            if (nextStep && nextStep.startsWith("TerminalOutput: ")) {
              termOutputs.push(nextStep.replace(/^TerminalOutput:\s*/, ""));
            } else {
              break;
            }
          }

          return (
            <div key={i} style={{ margin: "3px 0" }}>
              <button
                onClick={() => setExpandedCmdIndex(isExpanded ? null : i)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "6px",
                  color: "#e4e4e7", fontSize: "11px", padding: 0
                }}
              >
                <span style={{ color: "#a1a1aa" }}>Run</span>
                <code style={{ color: "#7dd3fc", fontFamily: "var(--font-mono)", fontSize: "10.5px", fontWeight: 600 }}>
                  {cmdText.length > 35 ? cmdText.slice(0, 35) + "..." : cmdText}
                </code>
                <svg
                  width="9" height="9" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5"
                  style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(90deg)", transition: "transform 0.15s" }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              {isExpanded && (
                <div style={{
                  marginTop: "4px", padding: "8px 10px",
                  backgroundColor: "rgba(9, 9, 11, 0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "6px", fontFamily: "var(--font-mono)",
                  fontSize: "10.5px", color: "#e4e4e7", lineHeight: 1.5,
                  maxHeight: "160px", overflowY: "auto"
                }}>
                  <div style={{ color: "#38bdf8", fontWeight: 600, marginBottom: "4px" }}>
                    ~/.../Atlas $ {cmdText}
                  </div>
                  {termOutputs.length > 0 && (
                    <div style={{ color: "#a1a1aa", whiteSpace: "pre-wrap" }}>
                      {termOutputs.join("")}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        }

        if (isTimed) {
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#a1a1aa", margin: "2px 0" }}>
              <span style={{ color: "#38bdf8", fontWeight: 600 }}>⏱ {step}</span>
            </div>
          );
        }

        if (step.startsWith("AST Check:")) {
          const isClean = step.includes("Valid");
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: "6px",
              fontSize: "11px", margin: "4px 0",
              color: isClean ? "#4ade80" : "#f87171", fontWeight: 600
            }}>
              <span>{isClean ? "[PASS]" : "[WARN]"}</span>
              <span>{step}</span>
            </div>
          );
        }

        if (step.startsWith("[CODER]")) {
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", margin: "3px 0" }}>
              <span style={{ backgroundColor: "rgba(56,189,248,0.15)", color: "#38bdf8", padding: "1px 5px", borderRadius: "3px", fontSize: "9.5px", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                [CODER]
              </span>
              <span style={{ color: "#e4e4e7", fontWeight: 600 }}>{step.replace(/^\[CODER\]\s*/, "")}</span>
            </div>
          );
        }

        if (step.startsWith("[TESTER]")) {
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", margin: "3px 0" }}>
              <span style={{ backgroundColor: "rgba(250,204,21,0.15)", color: "#facc15", padding: "1px 5px", borderRadius: "3px", fontSize: "9.5px", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                [TESTER]
              </span>
              <span style={{ color: "#e4e4e7", fontWeight: 600 }}>{step.replace(/^\[TESTER\]\s*/, "")}</span>
            </div>
          );
        }

        if (step.startsWith("[REVIEWER]")) {
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", margin: "3px 0" }}>
              <span style={{ backgroundColor: "rgba(192,132,252,0.15)", color: "#c084fc", padding: "1px 5px", borderRadius: "3px", fontSize: "9.5px", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                [REVIEWER]
              </span>
              <span style={{ color: "#e4e4e7", fontWeight: 600 }}>{step.replace(/^\[REVIEWER\]\s*/, "")}</span>
            </div>
          );
        }

        return (
          <div key={i} style={{ fontSize: "11px", color: "#a1a1aa" }}>
            {step}
          </div>
        );
      })}
    </div>
  );
}

function AgentMessageBubble({ msg }: { msg: ChatMessage }) {
  const [expanded, setExpanded] = React.useState(false);
  const [thoughtExpanded, setThoughtExpanded] = React.useState(true);
  const hasMeta = !!(msg.durationMs || msg.thinkingText || (msg.steps && msg.steps.length > 0));
  const isError = msg.text.startsWith("Error:");
  const mermaidMatch = msg.text.match(/```mermaid([\s\S]*?)```/);
  const bodyText = msg.text.replace(/```mermaid[\s\S]*?```/, "").trim();

  if (isError) {
    return (
      <div style={{
        margin: "8px 0", padding: "10px 12px",
        backgroundColor: "rgba(248,113,113,0.1)",
        border: "1px solid rgba(248,113,113,0.3)",
        borderRadius: "6px", color: "#f87171", fontSize: "12px", lineHeight: 1.5
      }}>
        <div style={{ fontWeight: 600, marginBottom: "4px" }}>API Provider Notice</div>
        {msg.text.replace(/^Error:\s*/, "")}
      </div>
    );
  }

  return (
    <div style={{ padding: "4px 0", maxWidth: "95%", alignSelf: "flex-start" }}>
      {hasMeta && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", gap: "5px",
            color: "#71717a", fontSize: "11px", fontWeight: 500,
            padding: "2px 0", marginBottom: "4px",
          }}
        >
          <svg
            width="10" height="10" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(90deg)", transition: "transform 0.15s" }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          {msg.durationMs ? `Worked for ${formatDuration(msg.durationMs)}` : "Process details"}
        </button>
      )}

      {expanded && (Boolean(msg.thinkingText) || Boolean(msg.steps && msg.steps.length > 0)) && (
        <div style={{
          marginBottom: "8px", padding: "8px 10px",
          backgroundColor: "rgba(255,255,255,0.03)",
          borderRadius: "6px", border: "1px solid rgba(255,255,255,0.06)"
        }}>
          {msg.thinkingText && (
            <div>
              <button
                onClick={() => setThoughtExpanded(!thoughtExpanded)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "5px",
                  color: "#a1a1aa", fontSize: "11px", fontWeight: 500, padding: "0",
                }}
              >
                <svg
                  width="9" height="9" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5"
                  style={{ transform: thoughtExpanded ? "rotate(180deg)" : "rotate(90deg)", transition: "transform 0.15s" }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                {msg.thinkingMs ? `Thought for ${formatDuration(msg.thinkingMs)}` : "Thought"}
              </button>
              {thoughtExpanded && (
                <div style={{
                  marginTop: "6px", padding: "8px 10px",
                  backgroundColor: "rgba(0,0,0,0.3)",
                  borderRadius: "4px", borderLeft: "2px solid #38bdf8",
                  fontSize: "11.5px", color: "#d4d4d8",
                  lineHeight: 1.6,
                  maxHeight: "240px", overflowY: "auto"
                }}>
                  <FormattedThoughtText text={msg.thinkingText} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ color: "var(--text-main, #e4e4e7)", lineHeight: 1.55, margin: 0, fontSize: "13px" }}>
        <FormattedMessageText text={bodyText} />
      </div>
      {mermaidMatch && <MermaidDiagramViewer code={mermaidMatch[1]!} />}
    </div>
  );
}

function LiveRunBubble({ events, streamingText, elapsedMs }: { events: any[]; streamingText: string; elapsedMs: number }) {
  const currentStep = [...events].reverse().find((e: any) =>
    e.type === "state_change" || e.type === "step_start"
  );
  const stepLabel =
    currentStep?.type === "state_change" ? currentStep.state :
    currentStep?.type === "step_start" ? currentStep.step?.title ?? "Working" :
    "Working";

  return (
    <div style={{ padding: "4px 0", maxWidth: "95%", alignSelf: "flex-start" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
        <span style={{
          width: 7, height: 7, borderRadius: "50%",
          backgroundColor: "#38bdf8",
          boxShadow: "0 0 6px #38bdf8",
          display: "inline-block",
          animation: "pulse 1.4s ease-in-out infinite"
        }} />
        <span style={{ color: "#71717a", fontSize: "11px", fontWeight: 500 }}>
          {stepLabel} &middot; {formatDuration(elapsedMs)}
        </span>
      </div>
      {streamingText && (
        <p style={{ color: "var(--text-main, #e4e4e7)", fontSize: "13px", lineHeight: 1.55, margin: 0, whiteSpace: "pre-wrap" }}>
          {streamingText}
          <span style={{
            display: "inline-block", width: "2px", height: "14px",
            backgroundColor: "#38bdf8", marginLeft: "2px", verticalAlign: "text-bottom",
            animation: "blink 1s step-end infinite"
          }} />
        </p>
      )}
    </div>
  );
}

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
  const [messages, setMessages] = useState<ChatMessage[]>([]); 
  const [activeView, setActiveView] = useState<"chat" | "history" | "dashboard" | "artifacts" | "tasks">("chat");
  const [composerOutput, setComposerOutput] = useState<any>(null);
  const [streamEvents, setStreamEvents] = useState<any[]>([]);
  const [streamingTokenText, setStreamingTokenText] = useState("");
  const streamingTokenRef = useRef("");
  // Run timing and metadata refs
  const runStartTimeRef = useRef<number>(0);
  const thinkingStartTimeRef = useRef<number>(0);
  const thinkingMsRef = useRef<number>(0);
  const thinkingTextRef = useRef<string>("");
  const accumulatedStepsRef = useRef<string[]>([]);
  // Live elapsed timer
  const [elapsedMs, setElapsedMs] = useState(0);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [awaitingHuman, setAwaitingHuman] = useState<string | null>(null);
  const [planningMode, setPlanningMode] = useState(false);
  const [planApprovalReq, setPlanApprovalReq] = useState<{reqId: string, plan: any} | null>(null);

  // Model & Provider state (syncs with Settings)
  const [currentProvider, setCurrentProvider] = useState<string>("gemini");
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash");
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleVoiceInput = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      logToOutput("System", "[WARN] Speech Recognition not available in current environment", "warn");
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        if (transcript) {
          setPrompt((prev) => (prev ? prev + " " + transcript.trim() : transcript.trim()));
        }
      };

      rec.onerror = () => {
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e: any) {
      logToOutput("System", `[WARN] Voice input failed: ${e?.message || e}`, "warn");
      setIsListening(false);
    }
  };

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

      // Token streaming
      if (ev.type === "token" && ev.content) {
        streamingTokenRef.current += ev.content;
        setStreamingTokenText((prev) => prev + ev.content);
      }

      // Planning state — start tracking thinking time
      if (ev.type === "state_change" && ev.state === "PLANNING") {
        thinkingStartTimeRef.current = Date.now();
      }

      // Planning reasoning captured — store it as the "thought" block
      if (ev.type === "plan_ready" && ev.plan) {
        const thinkingElapsed = thinkingStartTimeRef.current > 0 ? Date.now() - thinkingStartTimeRef.current : 0;
        thinkingMsRef.current = thinkingElapsed;
        if (ev.plan.planningReasoning) {
          thinkingTextRef.current = ev.plan.planningReasoning;
        }
        if (ev.plan.steps && ev.plan.steps.length > 0) {
          accumulatedStepsRef.current.push(`Plan: ${ev.plan.steps.length} step(s)`);
        }
      }

      // Step start — track what's being worked on
      if (ev.type === "step_start" && ev.step?.title) {
        accumulatedStepsRef.current.push(ev.step.title);
        logToOutput("Agent", `Step: ${ev.step.title}`, "info");
      }

      // Coder output — track files modified
      if (ev.type === "coder_output" && ev.output) {
        const count = ev.output.modifiedFiles?.length ?? 0;
        if (count > 0) {
          accumulatedStepsRef.current.push(`Modified ${count} file(s)`);
        }
      }

      if (ev.type === "log" && (ev.message || ev.content)) {
        const text = ev.message || ev.content;
        if (text && !text.startsWith("State:")) {
          logToOutput("Agent", text, "info");
        }
      }

      if (ev.type === "state_change") {
        const level = ev.state === "ERROR" ? "error" : ev.state === "DONE" ? "success" : "info";
        logToOutput("Agent", `State: ${ev.state}${ev.runId ? ` [${ev.runId.slice(0,8)}]` : ""}`, level);
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
    streamingTokenRef.current = "";
    // Reset run metadata
    runStartTimeRef.current = Date.now();
    thinkingStartTimeRef.current = 0;
    thinkingMsRef.current = 0;
    thinkingTextRef.current = "";
    accumulatedStepsRef.current = [];
    setElapsedMs(0);
    // Start elapsed timer
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    elapsedTimerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - runStartTimeRef.current);
    }, 500);
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
          repoPath,
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
          let replyText = streamingTokenRef.current;
          if (!replyText && result.plan) {
            if (result.plan.planningReasoning) {
              replyText = result.plan.planningReasoning;
            }
            if (result.plan.steps && result.plan.steps.length > 0) {
              const stepsText = result.plan.steps.map((s: any, idx: number) => `**${idx + 1}. ${s.title}**\n${s.description}`).join("\n\n");
              replyText = replyText ? `${replyText}\n\n${stepsText}` : stepsText;
            }
          }
          if (!replyText && result.error) {
            replyText = `Error: ${result.error}`;
          }
          if (replyText) {
            const newMsg: ChatMessage = {
              role: "agent",
              text: replyText,
              durationMs: Date.now() - runStartTimeRef.current,
              thinkingText: thinkingTextRef.current || undefined,
              thinkingMs: thinkingMsRef.current || undefined,
              steps: accumulatedStepsRef.current.length > 0 ? [...accumulatedStepsRef.current] : undefined,
            };
            setMessages((prev) => [...prev, newMsg]);
          }
          setAwaitingHuman(null);

          if (result.coderOutputs && result.coderOutputs.length > 0) {
            const lastOutput = result.coderOutputs[result.coderOutputs.length - 1];
            if (lastOutput.filesBefore && lastOutput.filesAfter) {
              const hasActualChanges = Object.keys(lastOutput.filesAfter).some(
                (fp) => lastOutput.filesBefore[fp] !== lastOutput.filesAfter[fp]
              );
              if (hasActualChanges) {
                setComposerOutput(lastOutput);
              }
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
        if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null; }
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
          <button style={styles.iconBtn} onClick={() => setActiveView(activeView === "artifacts" ? "chat" : "artifacts")} title="Artifacts (Plans & Walkthroughs)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </button>
          <button style={styles.iconBtn} onClick={() => setActiveView(activeView === "tasks" ? "chat" : "tasks")} title="Background Processes">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
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
        ) : activeView === "artifacts" ? (
          <ArtifactsViewer repoPath={repoPath} onClose={() => setActiveView("chat")} />
        ) : activeView === "tasks" ? (
          <BackgroundTaskManager />
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
            if (msg.role === "user") {
              return (
                <div key={i} className="anim-slide-up" style={styles.userBubble}>
                  <p style={styles.bubbleText}>{msg.text}</p>
                </div>
              );
            }
            return (
              <div key={i} className="anim-slide-up">
                <AgentMessageBubble msg={msg} />
              </div>
            );
          })
        )}
        {activeRuns.size > 0 && (
          <div className="anim-slide-up">
            {awaitingHuman && !planApprovalReq ? (
              <p style={{ color: "#f87171", fontSize: "12px", margin: 0 }}>
                [WARN] Awaiting Human: {awaitingHuman}
              </p>
            ) : planApprovalReq ? (
              <div style={{ padding: "10px", border: "1px solid #38bdf8", borderRadius: "6px", backgroundColor: "rgba(56,189,248,0.05)" }}>
                <p style={{ color: "#38bdf8", fontWeight: 600, marginBottom: "8px", fontSize: "12px" }}>Plan Approval Required</p>
                <p style={{ color: "#a1a1aa", fontSize: "11px", marginBottom: "12px" }}>Review the proposed plan before continuing.</p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    style={{ ...styles.sendBtn, width: "auto", padding: "4px 14px", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}
                    onClick={() => { window.atlasAPI.sendPlanDecision(planApprovalReq.reqId, true); setPlanApprovalReq(null); setAwaitingHuman(null); }}
                  >Approve</button>
                  <button
                    style={{ background: "#27272a", color: "#e4e4e7", border: "none", width: "auto", padding: "4px 14px", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
                    onClick={() => { window.atlasAPI.sendPlanDecision(planApprovalReq.reqId, false); setPlanApprovalReq(null); setAwaitingHuman(null); }}
                  >Reject</button>
                </div>
              </div>
            ) : (
              <LiveRunBubble events={streamEvents} streamingText={streamingTokenText} elapsedMs={elapsedMs} />
            )}
          </div>
        )}
      </div>

      <div style={styles.inputArea}>
        <div style={styles.inputBox} className="ai-input-box">
          <RichComposer
            value={prompt}
            onChange={(val) => setPrompt(val)}
            onSubmit={handleSend}
            openTabs={openTabs}
            disabled={activeRuns.size > 0}
          />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "4px" }}>
            {/* Left: + Button (Context & Plan mode options) and Model Pill */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", position: "relative" }}>
              {/* Plus button with dropdown */}
              <div style={{ position: "relative" }}>
                <button
                  style={{
                    background: showPlusMenu ? "rgba(255,255,255,0.1)" : "none",
                    border: "none",
                    color: planningMode ? "#38bdf8" : "var(--text-muted, #a1a1aa)",
                    cursor: "pointer",
                    padding: "4px 6px",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: "bold"
                  }}
                  onClick={() => { setShowPlusMenu(!showPlusMenu); setShowModelMenu(false); }}
                  title="Context & Plan Mode Options"
                >
                  +
                </button>

                {showPlusMenu && (
                  <div
                    style={{
                      position: "absolute", bottom: "32px", left: "0", zIndex: 1000,
                      backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px",
                      padding: "6px", width: "180px", boxShadow: "0 8px 24px rgba(0,0,0,0.6)"
                    }}
                  >
                    <button
                      style={{
                        width: "100%", textAlign: "left", background: "none", border: "none",
                        color: planningMode ? "#38bdf8" : "#fafafa", padding: "6px 8px", borderRadius: "4px",
                        fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between"
                      }}
                      onClick={() => { setPlanningMode(!planningMode); setShowPlusMenu(false); }}
                    >
                      <span>Planning Mode</span>
                      <span style={{ fontSize: "10px", fontWeight: "bold", color: planningMode ? "#38bdf8" : "#71717a" }}>
                        {planningMode ? "ON" : "OFF"}
                      </span>
                    </button>
                    <div style={{ height: "1px", backgroundColor: "#27272a", margin: "4px 0" }} />
                    <div style={{ fontSize: "10px", color: "#71717a", padding: "4px 8px", fontWeight: 600 }}>CONTEXT HINT</div>
                    <div style={{ fontSize: "11px", color: "#a1a1aa", padding: "4px 8px" }}>Type @ to attach context files or symbols</div>
                  </div>
                )}
              </div>

              {/* Model Pill */}
              <div style={{ position: "relative" }}>
                <button
                  style={{
                    backgroundColor: "rgba(24, 24, 27, 0.9)",
                    border: "1px solid #27272a",
                    color: "#e4e4e7",
                    borderRadius: "16px",
                    padding: "3px 10px",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                  onClick={() => { setShowModelMenu(!showModelMenu); setShowPlusMenu(false); }}
                >
                  <span>{availableModels.find(m => m.value === selectedModel)?.label || selectedModel}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="18 15 12 9 6 15"/>
                  </svg>
                </button>

                {showModelMenu && (
                  <div
                    style={{
                      position: "absolute", bottom: "32px", left: "0", zIndex: 1000,
                      backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px",
                      padding: "4px", width: "190px", maxHeight: "200px", overflowY: "auto",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.6)"
                    }}
                  >
                    {availableModels.map(m => (
                      <div
                        key={m.value}
                        style={{
                          padding: "6px 10px", fontSize: "11px", cursor: "pointer", borderRadius: "4px",
                          color: m.value === selectedModel ? "#38bdf8" : "#fafafa",
                          backgroundColor: m.value === selectedModel ? "rgba(56, 189, 248, 0.1)" : "transparent"
                        }}
                        onClick={() => {
                          handleModelChange(m.value);
                          setShowModelMenu(false);
                        }}
                      >
                        {m.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Mic & Arrow Send Button */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                onClick={toggleVoiceInput}
                style={{
                  background: isListening ? "rgba(239, 68, 68, 0.2)" : "none",
                  border: isListening ? "1px solid rgba(239, 68, 68, 0.4)" : "none",
                  color: isListening ? "#ef4444" : "#a1a1aa",
                  cursor: "pointer", padding: "4px", borderRadius: "4px",
                  display: "flex", alignItems: "center", transition: "all 0.15s ease"
                }}
                title={isListening ? "Stop Voice Input" : "Start Voice Input"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </button>

              <button
                style={{
                  width: "26px", height: "26px", borderRadius: "50%",
                  backgroundColor: prompt.trim() ? "#fafafa" : "#27272a",
                  color: prompt.trim() ? "#000" : "#71717a",
                  border: "none", display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: prompt.trim() ? "pointer" : "default",
                  transition: "all 0.15s ease"
                }}
                onClick={handleSend}
                disabled={!prompt.trim()}
                title="Send Message"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            </div>
          </div>
        </div>
        <div style={styles.disclaimer}>
          AI may make mistakes. Double-check all generated code.
        </div>
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
