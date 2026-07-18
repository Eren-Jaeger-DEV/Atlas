/**
 * CommandService
 *
 * Centralized registry for all executable commands in Atlas Studio (`atlas.*`).
 */

import { EventBus } from "../events/EventBus.js";

export interface CommandHandler {
  (...args: any[]): any | Promise<any>;
}

export interface CommandDescriptor {
  id: string;
  label: string;
  category?: string | undefined;
  shortcut?: string | undefined;
  handler: CommandHandler;
}

export class CommandService {
  private commands: Map<string, CommandDescriptor> = new Map();
  private eventBus: EventBus;

  constructor(eventBus: EventBus = EventBus.getInstance()) {
    this.eventBus = eventBus;
  }

  public registerCommand(id: string, label: string, handler: CommandHandler, shortcut?: string, category?: string): () => void {
    if (this.commands.has(id)) {
      console.warn(`[CommandService] Overwriting command: ${id}`);
    }

    const descriptor: CommandDescriptor = { id, label, handler };
    if (shortcut) descriptor.shortcut = shortcut;
    if (category) descriptor.category = category;

    this.commands.set(id, descriptor);

    return () => {
      this.commands.delete(id);
    };
  }

  public async executeCommand<T = any>(id: string, ...args: any[]): Promise<T> {
    const command = this.commands.get(id);
    if (!command) {
      throw new Error(`[CommandService] Command not found: ${id}`);
    }

    try {
      const result = await command.handler(...args);
      this.eventBus.emit("CommandExecuted", { id, args });
      return result;
    } catch (error) {
      console.error(`[CommandService] Command execution failed for ${id}:`, error);
      throw error;
    }
  }

  public getCommands(): CommandDescriptor[] {
    return Array.from(this.commands.values());
  }

  public hasCommand(id: string): boolean {
    return this.commands.has(id);
  }
}
