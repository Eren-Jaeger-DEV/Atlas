import { useState } from "react";

interface AiSidebarProps {
  repoPath?: string;
  activeFilePath?: string;
}

export function AiSidebar({ repoPath, activeFilePath }: AiSidebarProps) {
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "agent"; text: string }>>([
    { role: "agent", text: "Atlas AI Agent ready. Ask anything or describe code changes to execute." },
  ]);

  const handleSend = async () => {
    if (!prompt.trim() || !repoPath) return;
    const userMsg = prompt.trim();
    setPrompt("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);

    const api = (window as any).atlasAPI;
    if (api?.runAgent) {
      setRunning(true);
      try {
        const result = await api.runAgent(userMsg, repoPath);
        if (result.error) {
          setMessages((prev) => [...prev, { role: "agent", text: `Error: ${result.error}` }]);
        } else {
          setMessages((prev) => [...prev, { role: "agent", text: "Task completed successfully. Diff ready for review." }]);
        }
      } catch (err) {
        setMessages((prev) => [...prev, { role: "agent", text: `Error: ${String(err)}` }]);
      } finally {
        setRunning(false);
      }
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>ATLAS AI</span>
        <span style={styles.modelBadge}>Gemini 2.0 Flash</span>
      </div>

      <div style={styles.chatStream}>
        {messages.map((msg, i) => (
          <div key={i} style={msg.role === "user" ? styles.userBubble : styles.agentBubble}>
            <span style={styles.roleLabel}>{msg.role === "user" ? "You" : "Atlas Agent"}</span>
            <p style={styles.bubbleText}>{msg.text}</p>
          </div>
        ))}
        {running && (
          <div style={styles.agentBubble}>
            <span style={styles.roleLabel}>Atlas Agent</span>
            <p style={styles.bubbleText}>Thinking & editing codebase...</p>
          </div>
        )}
      </div>

      <div style={styles.inputBox}>
        {activeFilePath && (
          <div style={styles.fileContext}>
            Context: {activeFilePath.split(/[/\\]/).pop()}
          </div>
        )}
        <textarea
          style={styles.textarea}
          placeholder="Ask anything, @ to mention files..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <div style={styles.inputFooter}>
          <button style={styles.sendBtn} onClick={handleSend} disabled={running || !prompt.trim()}>
            {running ? "Executing..." : "Send Command"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "320px",
    backgroundColor: "#0d0d10",
    borderLeft: "1px solid #27272a",
    fontSize: "12px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    backgroundColor: "#09090b",
    borderBottom: "1px solid #27272a",
  },
  headerTitle: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.8px",
    color: "#fafafa",
  },
  modelBadge: {
    fontSize: "10px",
    color: "#a1a1aa",
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  chatStream: {
    flex: 1,
    overflowY: "auto",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  userBubble: {
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    borderRadius: "8px",
    padding: "10px 12px",
    alignSelf: "flex-end",
    maxWidth: "90%",
  },
  agentBubble: {
    backgroundColor: "#121215",
    border: "1px solid #27272a",
    borderRadius: "8px",
    padding: "10px 12px",
    alignSelf: "flex-start",
    maxWidth: "90%",
  },
  roleLabel: {
    fontSize: "10px",
    fontWeight: 700,
    color: "#71717a",
    textTransform: "uppercase",
    marginBottom: "4px",
    display: "block",
  },
  bubbleText: {
    color: "#fafafa",
    lineHeight: 1.5,
    margin: 0,
    fontSize: "12px",
  },
  inputBox: {
    padding: "12px",
    borderTop: "1px solid #27272a",
    backgroundColor: "#09090b",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  fileContext: {
    fontSize: "10px",
    color: "#71717a",
    backgroundColor: "#18181b",
    padding: "2px 6px",
    borderRadius: "3px",
    alignSelf: "flex-start",
  },
  textarea: {
    width: "100%",
    height: "70px",
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    color: "#fafafa",
    borderRadius: "6px",
    padding: "8px",
    fontSize: "12px",
    resize: "none",
    fontFamily: "inherit",
    outline: "none",
  },
  inputFooter: {
    display: "flex",
    justifyContent: "flex-end",
  },
  sendBtn: {
    backgroundColor: "#fafafa",
    color: "#09090b",
    border: "none",
    borderRadius: "6px",
    padding: "6px 14px",
    fontWeight: 600,
    fontSize: "11px",
    cursor: "pointer",
  },
};
