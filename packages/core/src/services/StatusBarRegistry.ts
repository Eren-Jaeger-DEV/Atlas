/**
 * @atlas/core — StatusBarRegistry
 *
 * Status bar item manager matching VS Code (`statusBarItem`) (Chapter 1).
 * Registers, updates, and sorts footer status items (Git branch, LSP health, AI token usage).
 */

export interface StatusBarItem {
  id: string;
  text: string;
  tooltip?: string;
  alignment: "left" | "right";
  priority: number;
  commandId?: string;
  color?: string;
}

export class StatusBarRegistry {
  private items: Map<string, StatusBarItem> = new Map();

  constructor() {
    // Default system status bar items
    this.registerItem({
      id: "git.branch",
      text: "main*",
      tooltip: "Git Branch (click to switch)",
      alignment: "left",
      priority: 100,
      commandId: "git.checkout",
    });
    this.registerItem({
      id: "lsp.status",
      text: "LSP: Ready",
      tooltip: "TypeScript Language Server Active",
      alignment: "left",
      priority: 90,
      color: "#34d399",
    });
    this.registerItem({
      id: "ai.tokens",
      text: "AI: 12.4k / 200k",
      tooltip: "Context Window Budget",
      alignment: "right",
      priority: 100,
      color: "#38bdf8",
    });
  }

  /**
   * Register or update a status bar item.
   */
  public registerItem(item: StatusBarItem): void {
    this.items.set(item.id, item);
  }

  /**
   * Get all registered status bar items sorted by alignment and priority.
   */
  public getItems(alignment?: "left" | "right"): StatusBarItem[] {
    const list = Array.from(this.items.values());
    const filtered = alignment ? list.filter((i) => i.alignment === alignment) : list;
    return filtered.sort((a, b) => b.priority - a.priority);
  }
}
