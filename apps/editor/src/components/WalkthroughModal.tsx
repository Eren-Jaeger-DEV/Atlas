import { useState } from "react";
import { X, BookOpen, GitBranch, Bug, Bot, Terminal, Activity, ArrowRight, Check } from "lucide-react";

interface WalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalkthroughModal({ isOpen, onClose }: WalkthroughModalProps) {
  const [activeStep, setActiveStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      id: "intro",
      icon: <BookOpen size={20} color="#38bdf8" />,
      title: "Welcome to Atlas Studio Manual",
      subtitle: "Master the next-generation AI IDE built for speed and autonomy.",
      content: (
        <div style={styles.stepContent}>
          <p style={styles.text}>
            Atlas Studio is an advanced AI coding assistant IDE designed with real-time process execution, multi-root workspace support, full DAP debugger, Monaco LSP integration, and dynamic theme customization.
          </p>
          <div style={styles.featureGrid}>
            <div style={styles.featureItem}>
              <span style={{ fontWeight: 600, color: "#ffffff" }}>⌨️ Real Keyboard Bindings</span>
              <span style={{ fontSize: "11px", color: "#a1a1aa" }}>Full parity with VS Code & Antigravity IDE shortcuts.</span>
            </div>
            <div style={styles.featureItem}>
              <span style={{ fontWeight: 600, color: "#ffffff" }}>🧠 Autonomous AI Swarms</span>
              <span style={{ fontSize: "11px", color: "#a1a1aa" }}>Parallel reasoning & automated plan approvals.</span>
            </div>
            <div style={styles.featureItem}>
              <span style={{ fontWeight: 600, color: "#ffffff" }}>⚡ Live DAP & Terminal</span>
              <span style={{ fontSize: "11px", color: "#a1a1aa" }}>Interactive xterm shell and protocol debug client.</span>
            </div>
            <div style={styles.featureItem}>
              <span style={{ fontWeight: 600, color: "#ffffff" }}>📊 Impact Analysis</span>
              <span style={{ fontSize: "11px", color: "#a1a1aa" }}>Dependency resolution and symbol relationship graph.</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "git",
      icon: <GitBranch size={20} color="#c084fc" />,
      title: "Git & Version Control",
      subtitle: "Seamless stage, commit, branch, diff, and stash management.",
      content: (
        <div style={styles.stepContent}>
          <p style={styles.text}>
            Use the Source Control sidebar (<kbd style={styles.kbd}>Ctrl+Shift+G</kbd>) or top menus to manage your Git repository:
          </p>
          <ul style={styles.list}>
            <li><strong>Stage / Unstage Files:</strong> Click <code>+</code> or <code>-</code> next to changed files in the Explorer/Git panel.</li>
            <li><strong>Interactive Diff Viewer:</strong> Click any changed file to view side-by-side Monaco diffs.</li>
            <li><strong>Branch Management:</strong> Use <strong>Git &gt; Branch</strong> to create or switch branches effortlessly.</li>
            <li><strong>Stash &amp; Pop:</strong> Save uncommitted work cleanly without polluting your history.</li>
          </ul>
        </div>
      )
    },
    {
      id: "debug",
      icon: <Bug size={20} color="#f87171" />,
      title: "DAP Protocol Debugger",
      subtitle: "Breakpoints, call stacks, scope inspection, and step controls.",
      content: (
        <div style={styles.stepContent}>
          <p style={styles.text}>
            Atlas includes a full Debug Adapter Protocol (DAP) implementation (<kbd style={styles.kbd}>F5</kbd>):
          </p>
          <ul style={styles.list}>
            <li><strong>Toggle Breakpoints:</strong> Press <kbd style={styles.kbd}>F9</kbd> on any line in the active code file.</li>
            <li><strong>Step Controls:</strong> Step Over (<kbd style={styles.kbd}>F10</kbd>), Step Into (<kbd style={styles.kbd}>F11</kbd>), Step Out (<kbd style={styles.kbd}>Shift+F11</kbd>).</li>
            <li><strong>Launch Configurations:</strong> Generate or edit <code>.vscode/launch.json</code> directly from <strong>Run &gt; Add Configuration...</strong></li>
          </ul>
        </div>
      )
    },
    {
      id: "ai",
      icon: <Bot size={20} color="#4ade80" />,
      title: "AI Assistant & Parallel Swarms",
      subtitle: "Autonomous problem solving, plan generation, and inline edits.",
      content: (
        <div style={styles.stepContent}>
          <p style={styles.text}>
            Interact with the AI Sidebar (<kbd style={styles.kbd}>Ctrl+Shift+A</kbd>) or Inline AI (<kbd style={styles.kbd}>Ctrl+I</kbd>):
          </p>
          <ul style={styles.list}>
            <li><strong>Inline Code Edits:</strong> Highlight text and press <kbd style={styles.kbd}>Ctrl+I</kbd> to generate refactorings or fixes.</li>
            <li><strong>Plan Approval:</strong> Review proposed multi-file changes before execution.</li>
            <li><strong>Parallel Agents:</strong> Monitor multiple AI subagents operating simultaneously.</li>
          </ul>
        </div>
      )
    },
    {
      id: "terminal",
      icon: <Terminal size={20} color="#facc15" />,
      title: "Integrated xterm Terminal",
      subtitle: "Multi-tab terminal sessions, split views, and task execution.",
      content: (
        <div style={styles.stepContent}>
          <p style={styles.text}>
            Toggle the bottom panel (<kbd style={styles.kbd}>Ctrl+`</kbd>) to access full terminal capabilities:
          </p>
          <ul style={styles.list}>
            <li><strong>New &amp; Split Terminals:</strong> Create new tabs (<kbd style={styles.kbd}>Ctrl+Shift+`</kbd>) or split views (<kbd style={styles.kbd}>Ctrl+Shift+5</kbd>).</li>
            <li><strong>Run Tasks:</strong> Execute NPM or shell tasks directly via <strong>Terminal &gt; Run Build Task...</strong> (<kbd style={styles.kbd}>Ctrl+Shift+B</kbd>).</li>
            <li><strong>Run Selected Text:</strong> Send highlighted code directly to the active shell.</li>
          </ul>
        </div>
      )
    }
  ];

  const current = steps[activeStep]!;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={18} color="#38bdf8" />
            <h2 style={styles.title}>Atlas Studio Walkthrough &amp; Guide</h2>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Content layout with step sidebar */}
        <div style={styles.layout}>
          {/* Step Nav */}
          <div style={styles.sidebar}>
            {steps.map((s, idx) => {
              const isActive = idx === activeStep;
              return (
                <div
                  key={s.id}
                  style={{
                    ...styles.navItem,
                    ...(isActive ? styles.navItemActive : {})
                  }}
                  onClick={() => setActiveStep(idx)}
                >
                  {s.icon}
                  <span style={{ fontSize: "12px", fontWeight: isActive ? 600 : 400 }}>{s.title}</span>
                </div>
              );
            })}
          </div>

          {/* Step Main Detail */}
          <div style={styles.main}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              {current.icon}
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", color: "#ffffff", fontWeight: 600 }}>{current.title}</h3>
                <span style={{ fontSize: "12px", color: "#a1a1aa" }}>{current.subtitle}</span>
              </div>
            </div>
            <div style={{ height: "1px", backgroundColor: "#27272a", margin: "12px 0 16px 0" }} />
            {current.content}
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <div style={{ display: "flex", gap: "6px" }}>
            {steps.map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: idx === activeStep ? "#38bdf8" : "#3f3f46",
                  cursor: "pointer"
                }}
                onClick={() => setActiveStep(idx)}
              />
            ))}
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            {activeStep < steps.length - 1 ? (
              <button style={styles.primaryBtn} onClick={() => setActiveStep(p => p + 1)}>
                <span>Next Step</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button style={styles.successBtn} onClick={onClose}>
                <Check size={14} />
                <span>Got It!</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
  },
  modal: {
    width: "720px",
    height: "460px",
    backgroundColor: "#090a0f",
    border: "1px solid #27272a",
    borderRadius: "8px",
    boxShadow: "0 16px 40px rgba(0, 0, 0, 0.8)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 18px",
    borderBottom: "1px solid #27272a",
    backgroundColor: "#0d0e15",
  },
  title: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#f4f4f5",
    margin: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#a1a1aa",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "4px",
  },
  layout: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  sidebar: {
    width: "220px",
    backgroundColor: "#0d0e15",
    borderRight: "1px solid #27272a",
    padding: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 10px",
    borderRadius: "6px",
    cursor: "pointer",
    color: "#a1a1aa",
    transition: "all 0.15s ease",
  },
  navItemActive: {
    backgroundColor: "#1e1e2e",
    color: "#ffffff",
    borderLeft: "2px solid #38bdf8",
  },
  main: {
    flex: 1,
    padding: "20px",
    overflowY: "auto",
  },
  stepContent: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  text: {
    fontSize: "13px",
    color: "#d4d4d8",
    lineHeight: 1.5,
    margin: 0,
  },
  featureGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginTop: "8px",
  },
  featureItem: {
    backgroundColor: "#13141f",
    border: "1px solid #27272a",
    borderRadius: "6px",
    padding: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  list: {
    margin: 0,
    paddingLeft: "18px",
    fontSize: "13px",
    color: "#d4d4d8",
    lineHeight: 1.7,
  },
  kbd: {
    backgroundColor: "#27272a",
    border: "1px solid #3f3f46",
    borderRadius: "3px",
    padding: "2px 5px",
    fontSize: "11px",
    color: "#38bdf8",
    fontFamily: "var(--font-mono, monospace)",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 18px",
    borderTop: "1px solid #27272a",
    backgroundColor: "#0d0e15",
  },
  primaryBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#0284c7",
    border: "none",
    color: "#ffffff",
    padding: "6px 14px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  successBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#16a34a",
    border: "none",
    color: "#ffffff",
    padding: "6px 14px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
};
