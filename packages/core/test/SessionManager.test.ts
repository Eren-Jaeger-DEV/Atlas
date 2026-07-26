import { describe, it, expect } from "vitest";
import { SessionManager } from "../src/session/SessionManager.js";

describe("SessionManager", () => {
  it("should create a new session with unique ID", () => {
    const manager = new SessionManager();
    const session = manager.createSession("Test Session");

    expect(session.sessionId).toContain("chat-session-");
    expect(session.title).toBe("Test Session");
    expect(session.messages).toHaveLength(0);
  });

  it("should append messages and update timestamp", () => {
    const manager = new SessionManager();
    const session = manager.createSession("Test Session");

    const msg = manager.addMessage(session.sessionId, "user", "Hello Atlas AI");
    expect(msg).toBeDefined();
    expect(msg?.text).toBe("Hello Atlas AI");
    expect(msg?.role).toBe("user");

    const updated = manager.getSession(session.sessionId);
    expect(updated?.messages).toHaveLength(1);
  });

  it("should export session to valid JSON string", () => {
    const manager = new SessionManager();
    const session = manager.createSession("Export Test");
    manager.addMessage(session.sessionId, "user", "Test prompt");

    const json = manager.exportSessionJson(session.sessionId);
    expect(json).toBeDefined();
    expect(json).toContain("Export Test");
    expect(json).toContain("Test prompt");
  });
});
