/**
 * ExtensionHost
 *
 * Isolated plugin lifecycle runtime with capabilities registration.
 */

import { CommandService } from "./CommandService.js";
import { EventBus } from "../events/EventBus.js";

export interface ExtensionContext {
  subscriptions: Array<() => void>;
  registerCommand: (id: string, label: string, handler: (...args: any[]) => any) => void;
  registerView: (id: string, title: string) => void;
  registerPanel: (id: string, title: string) => void;
}

export interface ExtensionModule {
  id: string;
  name: string;
  activate: (context: ExtensionContext) => void | Promise<void>;
  deactivate?: () => void | Promise<void>;
}

export class ExtensionHost {
  private extensions: Map<string, ExtensionModule> = new Map();
  private activeExtensions: Map<string, ExtensionContext> = new Map();
  private commandService: CommandService;
  private eventBus: EventBus;

  constructor(commandService: CommandService, eventBus: EventBus = EventBus.getInstance()) {
    this.commandService = commandService;
    this.eventBus = eventBus;
  }

  public registerExtension(ext: ExtensionModule): void {
    this.extensions.set(ext.id, ext);
  }

  public async activateExtension(id: string): Promise<void> {
    const ext = this.extensions.get(id);
    if (!ext) {
      throw new Error(`[ExtensionHost] Extension not registered: ${id}`);
    }

    if (this.activeExtensions.has(id)) return;

    const subscriptions: Array<() => void> = [];

    const context: ExtensionContext = {
      subscriptions,
      registerCommand: (cmdId, label, handler) => {
        const unreg = this.commandService.registerCommand(cmdId, label, handler, undefined, ext.name);
        subscriptions.push(unreg);
      },
      registerView: (viewId, title) => {
        // Register extension sidebar view
      },
      registerPanel: (panelId, title) => {
        // Register extension bottom panel
      },
    };

    try {
      await ext.activate(context);
      this.activeExtensions.set(id, context);
      console.log(`[ExtensionHost] Activated extension: ${ext.name} (${id})`);
    } catch (e) {
      console.error(`[ExtensionHost] Failed to activate extension ${id}:`, e);
    }
  }

  public async deactivateExtension(id: string): Promise<void> {
    const ext = this.extensions.get(id);
    const context = this.activeExtensions.get(id);

    if (ext && context) {
      if (ext.deactivate) {
        try {
          await ext.deactivate();
        } catch (e) {
          console.error(`[ExtensionHost] Error deactivating extension ${id}:`, e);
        }
      }

      context.subscriptions.forEach(unsub => unsub());
      this.activeExtensions.delete(id);
      console.log(`[ExtensionHost] Deactivated extension: ${id}`);
    }
  }

  public getActiveExtensions(): string[] {
    return Array.from(this.activeExtensions.keys());
  }
}
