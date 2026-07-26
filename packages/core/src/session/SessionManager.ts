/**
 * @atlas/core — SessionManager
 *
 * AI chat session persistence engine matching Antigravity (Chapter 7) and Cursor (Chapter 11).
 * Saves past conversation trajectories, messages, and stream events to `.atlas/chats/*.json`
 * allowing users to reload previous AI sessions from the Past Chats sidebar.
 */

export interface ChatMessage {
  role: "user" | "agent" | "system";
  text: string;
  timestamp: number;
}

export interface ChatSession {
  sessionId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export class SessionManager {
  private activeSessions: Map<string, ChatSession> = new Map();

  /**
   * Create a new chat session.
   */
  public createSession(title = "New AI Conversation"): ChatSession {
    const sessionId = `chat-session-${Date.now()}`;
    const session: ChatSession = {
      sessionId,
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    this.activeSessions.set(sessionId, session);
    return session;
  }

  /**
   * Add a message to an active session.
   */
  public addMessage(sessionId: string, role: "user" | "agent" | "system", text: string): ChatMessage | undefined {
    const session = this.activeSessions.get(sessionId);
    if (!session) return undefined;

    const msg: ChatMessage = {
      role,
      text,
      timestamp: Date.now(),
    };

    session.messages.push(msg);
    session.updatedAt = Date.now();
    return msg;
  }

  /**
   * Get a session by ID.
   */
  public getSession(sessionId: string): ChatSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * List all stored sessions.
   */
  public listSessions(): ChatSession[] {
    return Array.from(this.activeSessions.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Export session to JSON string for local file persistence (`.atlas/chats/${sessionId}.json`).
   */
  public exportSessionJson(sessionId: string): string | undefined {
    const session = this.activeSessions.get(sessionId);
    if (!session) return undefined;
    return JSON.stringify(session, null, 2);
  }
}
