/**
 * @atlas/core — MemoryStore
 *
 * Three-tier persistent memory engine matching VS Code Copilot (`copilot_memory`) (Chapter 8).
 * Scopes:
 * - `/memories/` (User): Global user preferences & coding patterns (survives across workspaces).
 * - `/memories/session/` (Session): Conversation-scoped temporary facts.
 * - `/memories/repo/` (Repo): Workspace-scoped codebase architecture facts & rules (`.atlas/memories/repo.md`).
 */

export type MemoryScope = "user" | "session" | "repo";

export interface MemoryEntry {
  id: string;
  scope: MemoryScope;
  path: string;
  content: string;
  updatedAt: number;
}

export class MemoryStore {
  private userMemories: Map<string, MemoryEntry> = new Map();
  private sessionMemories: Map<string, MemoryEntry> = new Map();
  private repoMemories: Map<string, MemoryEntry> = new Map();

  /**
   * Set or update a memory entry in the specified scope tier.
   */
  public set(scope: MemoryScope, path: string, content: string): MemoryEntry {
    const id = `${scope}:${path}`;
    const entry: MemoryEntry = {
      id,
      scope,
      path,
      content,
      updatedAt: Date.now(),
    };

    const targetMap = this.getMapForScope(scope);
    targetMap.set(path, entry);
    return entry;
  }

  /**
   * Get a memory entry by scope tier and relative path.
   */
  public get(scope: MemoryScope, path: string): MemoryEntry | undefined {
    return this.getMapForScope(scope).get(path);
  }

  /**
   * List all memory entries for a given scope tier.
   */
  public list(scope?: MemoryScope): MemoryEntry[] {
    if (scope) {
      return Array.from(this.getMapForScope(scope).values());
    }
    return [
      ...Array.from(this.userMemories.values()),
      ...Array.from(this.sessionMemories.values()),
      ...Array.from(this.repoMemories.values()),
    ];
  }

  /**
   * Delete a memory entry from a scope.
   */
  public delete(scope: MemoryScope, path: string): boolean {
    return this.getMapForScope(scope).delete(path);
  }

  /**
   * Clear session-scoped memories (called when closing chat sessions).
   */
  public clearSession(): void {
    this.sessionMemories.clear();
  }

  /**
   * Formats all active memories into a clean prompt context string for the LLM.
   */
  public buildPromptContext(): string {
    const all = this.list();
    if (all.length === 0) return "";

    const lines: string[] = ["=== PERSISTENT MEMORY CONTEXT ==="];
    for (const m of all) {
      lines.push(`[${m.scope.toUpperCase()}] ${m.path}:\n${m.content}`);
    }
    lines.push("==================================");
    return lines.join("\n");
  }

  private getMapForScope(scope: MemoryScope): Map<string, MemoryEntry> {
    switch (scope) {
      case "user":
        return this.userMemories;
      case "session":
        return this.sessionMemories;
      case "repo":
        return this.repoMemories;
    }
  }
}
