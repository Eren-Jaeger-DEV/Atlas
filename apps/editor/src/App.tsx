/**
 * Atlas Editor — App Root
 *
 * Layout: Sidebar | Editor | Impact Panel
 * The AI plugin panel renders conditionally in a bottom drawer.
 */

import { useState, useCallback, useRef } from "react";
import { EditorPane } from "./components/EditorPane.js";
import { ImpactPanel } from "./components/ImpactPanel.js";

interface EditorTab {
  filePath: string;
  content: string;
  language: "typescript" | "javascript" | "python";
  isDirty: boolean;
}

export function App() {
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [cursorSymbol, setCursorSymbol] = useState<string | undefined>();
  const [aiGoal, setAiGoal] = useState("");
  const [aiRunning, setAiRunning] = useState(false);
  const [aiEvents, setAiEvents] = useState<string[]>([]);

  const activeTab = tabs[activeTabIndex];

  // Debounced symbol detection on cursor move
  const symbolTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const handleCursorChange = useCallback((_line: number, _col: number) => {
    clearTimeout(symbolTimerRef.current);
    symbolTimerRef.current = setTimeout(() => {
      // TODO: In Phase 2, derive symbol name from cursor position using graph
      setCursorSymbol(undefined);
    }, 300);
  }, []);

  // AI run via IPC
  const handleRun = async () => {
    if (!aiGoal || aiRunning) return;
    setAiRunning(true);
    setAiEvents([]);

    const api = (window as any).atlasAPI;
    if (!api) {
      setAiEvents(["Error: Atlas API not available. Is the editor running in Electron?"]);
      setAiRunning(false);
      return;
    }

    // Subscribe to events
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
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <span style={styles.logoAtlas}>Atlas</span>
          <span style={styles.logoStudio}> Studio</span>
        </div>
        <div style={styles.sidebarContent}>
          {tabs.length === 0 ? (
            <p style={styles.hint}>Open a file to get started</p>
          ) : (
            tabs.map((tab, i) => (
              <div
                key={tab.filePath}
                style={{
                  ...styles.sidebarTab,
                  ...(i === activeTabIndex ? styles.sidebarTabActive : {}),
                }}
                onClick={() => setActiveTabIndex(i)}
              >
                {tab.filePath.split(/[/\\]/).at(-1)}
                {tab.isDirty && <span style={styles.dirtyDot}>●</span>}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Editor area */}
      <main style={styles.editorArea}>
        {activeTab ? (
          <EditorPane
            filePath={activeTab.filePath}
            content={activeTab.content}
            language={activeTab.language}
            onChange={(content) => {
              setTabs((prev) =>
                prev.map((t, i) =>
                  i === activeTabIndex ? { ...t, content, isDirty: true } : t
                )
              );
            }}
            onCursorChange={handleCursorChange}
          />
        ) : (
          <WelcomeScreen />
        )}
      </main>

      {/* Impact panel */}
      <aside style={styles.impactPanel}>
        <ImpactPanel
          filePath={activeTab?.filePath}
          symbolName={cursorSymbol}
        />
      </aside>

      {/* AI panel (bottom drawer) */}
      <div style={styles.aiPanel}>
        <div style={styles.aiHeader}>
          <span style={styles.aiTitle}>⚡ AI Agent</span>
          {aiRunning && <span style={styles.aiRunning}>Running...</span>}
        </div>
        <div style={styles.aiInput}>
          <input
            id="ai-goal-input"
            style={styles.goalInput}
            placeholder="Describe a goal... (e.g. add input validation to the signup endpoint)"
            value={aiGoal}
            onChange={(e) => setAiGoal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRun()}
            disabled={aiRunning}
          />
          <button
            id="ai-run-button"
            style={{ ...styles.runButton, ...(aiRunning ? styles.runButtonDisabled : {}) }}
            onClick={handleRun}
            disabled={aiRunning}
          >
            {aiRunning ? "Running..." : "Run"}
          </button>
        </div>
        {aiEvents.length > 0 && (
          <div style={styles.aiEventLog}>
            {aiEvents.slice(-20).map((ev, i) => (
              <pre key={i} style={styles.aiEvent}>{ev}</pre>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WelcomeScreen() {
  return (
    <div style={styles.welcome}>
      <h1 style={styles.welcomeTitle}>Atlas Studio</h1>
      <p style={styles.welcomeSub}>AI-native code intelligence</p>
      <div style={styles.welcomeTips}>
        <div style={styles.tip}>
          <code style={styles.tipCmd}>atlas init</code>
          <span style={styles.tipDesc}>Build the memory graph for your repo</span>
        </div>
        <div style={styles.tip}>
          <code style={styles.tipCmd}>atlas impact src/auth.ts:login</code>
          <span style={styles.tipDesc}>Instant dependency impact — no AI needed</span>
        </div>
        <div style={styles.tip}>
          <code style={styles.tipCmd}>atlas run "add rate limiting"</code>
          <span style={styles.tipDesc}>Full Planner → Coder → Tester → Reviewer loop</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "grid",
    gridTemplateColumns: "200px 1fr 260px",
    gridTemplateRows: "1fr 220px",
    height: "100vh",
    background: "#0f0f13",
    color: "#cdd6f4",
    fontFamily: "'Inter', system-ui, sans-serif",
    overflow: "hidden",
  },
  sidebar: {
    gridRow: "1 / 3",
    background: "#131320",
    borderRight: "1px solid #1e1e2e",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
  },
  logo: {
    padding: "16px 14px",
    borderBottom: "1px solid #1e1e2e",
    fontSize: 16,
    fontWeight: 800,
  },
  logoAtlas: {
    background: "linear-gradient(135deg, #89b4fa, #cba6f7)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  logoStudio: {
    color: "#585b70",
    fontWeight: 400,
  },
  sidebarContent: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 4px",
  },
  sidebarTab: {
    padding: "6px 10px",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 12,
    color: "#6272a4",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    userSelect: "none",
  },
  sidebarTabActive: {
    background: "#1e1e2e",
    color: "#cdd6f4",
  },
  dirtyDot: {
    color: "#f1fa8c",
    fontSize: 8,
  },
  editorArea: {
    gridRow: 1,
    gridColumn: 2,
    overflow: "hidden",
  },
  impactPanel: {
    gridRow: "1 / 2",
    gridColumn: 3,
    background: "#131320",
    borderLeft: "1px solid #1e1e2e",
    overflowY: "auto",
  },
  aiPanel: {
    gridRow: 2,
    gridColumn: "2 / 4",
    background: "#0d0d17",
    borderTop: "1px solid #1e1e2e",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
  },
  aiHeader: {
    padding: "10px 16px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    borderBottom: "1px solid #1e1e2e",
  },
  aiTitle: {
    fontWeight: 700,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#7f849c",
  },
  aiRunning: {
    fontSize: 11,
    color: "#89b4fa",
  },
  aiInput: {
    display: "flex",
    gap: 8,
    padding: "10px 16px",
    borderBottom: "1px solid #1e1e2e",
  },
  goalInput: {
    flex: 1,
    background: "#1e1e2e",
    border: "1px solid #313244",
    borderRadius: 6,
    padding: "8px 12px",
    color: "#cdd6f4",
    fontSize: 13,
    outline: "none",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  runButton: {
    background: "linear-gradient(135deg, #89b4fa, #cba6f7)",
    color: "#0f0f13",
    border: "none",
    borderRadius: 6,
    padding: "8px 20px",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  runButtonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  aiEventLog: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 16px",
  },
  aiEvent: {
    fontSize: 11,
    color: "#585b70",
    margin: 0,
    padding: "2px 0",
    fontFamily: "'JetBrains Mono', monospace",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  hint: {
    color: "#44415a",
    fontStyle: "italic",
    padding: "12px 10px",
    fontSize: 12,
  },
  welcome: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: 8,
  },
  welcomeTitle: {
    fontSize: 36,
    fontWeight: 800,
    background: "linear-gradient(135deg, #89b4fa, #cba6f7, #f38ba8)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    margin: 0,
  },
  welcomeSub: {
    color: "#585b70",
    margin: 0,
    marginBottom: 32,
  },
  welcomeTips: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 16,
    maxWidth: 520,
  },
  tip: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  tipCmd: {
    background: "#1e1e2e",
    border: "1px solid #313244",
    borderRadius: 6,
    padding: "4px 10px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    color: "#89b4fa",
    minWidth: 200,
    flexShrink: 0,
  },
  tipDesc: {
    color: "#585b70",
    fontSize: 13,
  },
};
