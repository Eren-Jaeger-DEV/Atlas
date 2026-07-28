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
  onEvent: (eventName: string, handler: (payload: any) => void) => void;
}

export interface ExtensionModule {
  id: string;
  name: string;
  activate: (context: ExtensionContext) => void | Promise<void>;
  deactivate?: () => void | Promise<void>;
}

export interface RegisteredViewItem {
  id: string;
  title: string;
  extensionId: string;
}

export class ExtensionHost {
  private extensions: Map<string, ExtensionModule> = new Map();
  private activeExtensions: Map<string, ExtensionContext> = new Map();
  private registeredViews: Map<string, RegisteredViewItem> = new Map();
  private registeredPanels: Map<string, RegisteredViewItem> = new Map();
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
        const item = { id: viewId, title, extensionId: ext.id };
        this.registeredViews.set(viewId, item);
        this.eventBus.emit("extension:view-registered" as any, item);
        subscriptions.push(() => {
          this.registeredViews.delete(viewId);
          this.eventBus.emit("extension:view-unregistered" as any, { id: viewId });
        });
      },
      registerPanel: (panelId, title) => {
        const item = { id: panelId, title, extensionId: ext.id };
        this.registeredPanels.set(panelId, item);
        this.eventBus.emit("extension:panel-registered" as any, item);
        subscriptions.push(() => {
          this.registeredPanels.delete(panelId);
          this.eventBus.emit("extension:panel-unregistered" as any, { id: panelId });
        });
      },
      onEvent: (eventName: any, handler: any) => {
        const unreg = this.eventBus.on(eventName, handler);
        subscriptions.push(unreg);
      },
    };

    try {
      await ext.activate(context);
      this.activeExtensions.set(id, context);
      console.log(`[ExtensionHost] Activated extension: ${ext.name} (${id})`);
    } catch (e) {
      console.error(`[ExtensionHost] Failed to activate extension ${id}:`, e);
      // Clean up any subscriptions created during partial activation
      subscriptions.forEach(unsub => {
        try { unsub(); } catch { /* ignore */ }
      });
      throw new Error(`[ExtensionHost] Failed to activate extension '${id}': ${e instanceof Error ? e.message : String(e)}`);
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

  public getRegisteredViews(): RegisteredViewItem[] {
    return Array.from(this.registeredViews.values());
  }

  public getRegisteredPanels(): RegisteredViewItem[] {
    return Array.from(this.registeredPanels.values());
  }
}
