import React, { useState } from "react";

interface AiSidebarProps {
  repoPath?: string;
  activeFilePath?: string;
  width?: number;
  onClose?: () => void;
}

export function AiSidebar({ repoPath, activeFilePath, width = 320, onClose }: AiSidebarProps) {
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "agent"; text: string }>>([]);
  const [showHistory, setShowHistory] = useState(false);

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
    } else {
      setMessages((prev) => [...prev, { role: "agent", text: "Error: AI Agent API is not connected or initialized." }]);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setPrompt("");
    setShowHistory(false);
  };

  return (
    <div style={{ ...styles.container, width: `${width}px` }}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>Agent</span>
        <div style={styles.headerActions}>
          <button style={styles.iconBtn} onClick={handleNewChat} title="New Chat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button style={styles.iconBtn} onClick={() => setShowHistory(!showHistory)} title="Past Chats">
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

      <div style={styles.chatStream}>
        {messages.length === 0 && !showHistory ? (
          <div style={styles.emptyState}>
            <div style={styles.logoMark}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e4e4e7" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
            </div>
            <h3 style={styles.emptyTitle}>Atlas</h3>
          </div>
        ) : showHistory ? (
          <div style={styles.historyPanel}>
            <h4 style={styles.historyHdr}>Past Chats</h4>
            <div style={{color: "#52525b", fontSize: "12px"}}>No past chats available yet.</div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} style={msg.role === "user" ? styles.userBubble : styles.agentBubble}>
              <p style={styles.bubbleText}>{msg.text}</p>
            </div>
          ))
        )}
        {running && (
          <div style={styles.agentBubble}>
            <p style={styles.bubbleText}>Thinking...</p>
          </div>
        )}
      </div>

      <div style={styles.inputArea}>
        <div style={styles.inputBox}>
          <div style={styles.inputTop}>
            <button style={styles.addContextBtn} title="Add context, media, or files">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <textarea
              style={styles.textarea}
              placeholder="Ask anything, @ to mention, / for actions"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
          </div>
          <div style={styles.inputBottom}>
            <div style={styles.modelSelector}>
            </div>
            <div style={styles.actionRow}>
              {prompt.trim() ? (
                <button style={styles.sendBtn} onClick={handleSend} disabled={running}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              ) : (
                <button style={styles.micBtn} title="Voice Input">
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
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#000000",
    borderLeft: "1px solid #38bdf8",
    fontSize: "13px",
    flexShrink: 0,
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
    color: "#e4e4e7",
  },
  headerActions: {
    display: "flex",
    gap: "6px",
  },
  iconBtn: {
    background: "none",
    border: "none",
    color: "#a1a1aa",
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
    color: "#a1a1aa",
  },
  logoMark: {
    marginBottom: "12px",
  },
  emptyTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#fafafa",
    margin: 0,
  },
  userBubble: {
    backgroundColor: "#09090b",
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
    color: "#e4e4e7",
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
    backgroundColor: "#09090b",
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
    color: "#a1a1aa",
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
    color: "#fafafa",
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
    color: "#a1a1aa",
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
    background: "#18181b",
    border: "none",
    color: "#a1a1aa",
    borderRadius: "50%",
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  sendBtn: {
    background: "#38bdf8",
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
    color: "#71717a",
    textTransform: "uppercase",
    margin: "0 0 8px 0",
  },
  historyItem: {
    padding: "8px 12px",
    backgroundColor: "#09090b",
    border: "1px solid #27272a",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    color: "#e4e4e7",
  },
};
