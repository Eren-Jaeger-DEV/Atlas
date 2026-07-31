/**
 * PluginHost
 *
 * Isolated plugin lifecycle runtime with capabilities registration,
 * permission engine gating, and CommonJS module execution shim.
 */

import { CommandService } from "./CommandService.js";
import { EventBus } from "../events/EventBus.js";
import type { LanguageContribution, PluginPermission } from "../types/plugin.js";
import { PermissionEngine } from "../security/PermissionEngine.js";
import vm from "node:vm";

export interface PluginContext {
  pluginId: string;
  subscriptions: Array<() => void>;
  registerCommand: (id: string, label: string, handler: (...args: any[]) => any) => void;
  registerView: (id: string, title: string, renderFn?: () => any) => void;
  registerPanel: (id: string, title: string, renderFn?: () => any) => void;
  registerStatusBarItem: (id: string, text: string) => void;
  registerLanguage: (config: LanguageContribution) => void;
  registerFileViewer: (extensions: string[], renderFn: (filePath: string) => any) => void;
  requestPermission: (permission: PluginPermission) => Promise<boolean>;
  onEvent: (eventName: string, handler: (payload: any) => void) => void;
}

export interface PluginModule {
  id: string;
  name: string;
  activate: (context: PluginContext) => void | Promise<void>;
  deactivate?: () => void | Promise<void>;
}

export interface RegisteredViewItem {
  id: string;
  title: string;
  pluginId: string;
  renderFn?: (() => any) | undefined;
}

export interface RegisteredViewerItem {
  extensions: string[];
  pluginId: string;
  renderFn: (filePath: string) => any;
}

export class PluginHost {
  private plugins: Map<string, PluginModule> = new Map();
  private activePlugins: Map<string, PluginContext> = new Map();
  private registeredViews: Map<string, RegisteredViewItem> = new Map();
  private registeredPanels: Map<string, RegisteredViewItem> = new Map();
  private registeredLanguages: Map<string, LanguageContribution> = new Map();
  private registeredViewers: Map<string, RegisteredViewerItem> = new Map();
  private commandService: CommandService;
  private eventBus: EventBus;
  private permissionEngine: PermissionEngine;

  constructor(
    commandService: CommandService,
    permissionEngine: PermissionEngine = new PermissionEngine(),
    eventBus: EventBus = EventBus.getInstance()
  ) {
    this.commandService = commandService;
    this.permissionEngine = permissionEngine;
    this.eventBus = eventBus;
  }

  public registerPlugin(plugin: PluginModule): void {
    this.plugins.set(plugin.id, plugin);
  }

  public async activatePlugin(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`[PluginHost] Plugin not registered: ${id}`);
    }

    if (this.activePlugins.has(id)) return;

    const subscriptions: Array<() => void> = [];

    const context: PluginContext = {
      pluginId: id,
      subscriptions,
      registerCommand: (cmdId, label, handler) => {
        const unreg = this.commandService.registerCommand(cmdId, label, handler, undefined, plugin.name);
        subscriptions.push(unreg);
      },
      registerView: (viewId, title, renderFn) => {
        const item = { id: viewId, title, pluginId: plugin.id, renderFn };
        this.registeredViews.set(viewId, item);
        this.eventBus.emit("plugin:view-registered" as any, item);
        subscriptions.push(() => {
          this.registeredViews.delete(viewId);
          this.eventBus.emit("plugin:view-unregistered" as any, { id: viewId });
        });
      },
      registerPanel: (panelId, title, renderFn) => {
        const item = { id: panelId, title, pluginId: plugin.id, renderFn };
        this.registeredPanels.set(panelId, item);
        this.eventBus.emit("plugin:panel-registered" as any, item);
        subscriptions.push(() => {
          this.registeredPanels.delete(panelId);
          this.eventBus.emit("plugin:panel-unregistered" as any, { id: panelId });
        });
      },
      registerStatusBarItem: (sbId, text) => {
        const item = { id: sbId, text, pluginId: plugin.id };
        this.eventBus.emit("plugin:statusbar-registered" as any, item);
        subscriptions.push(() => {
          this.eventBus.emit("plugin:statusbar-unregistered" as any, { id: sbId });
        });
      },
      registerLanguage: (config) => {
        this.registeredLanguages.set(config.id, config);
        this.eventBus.emit("plugin:language-registered" as any, config);
        subscriptions.push(() => {
          this.registeredLanguages.delete(config.id);
        });
      },
      registerFileViewer: (exts, renderFn) => {
        const viewer: RegisteredViewerItem = { extensions: exts, pluginId: plugin.id, renderFn };
        exts.forEach(ext => this.registeredViewers.set(ext.toLowerCase(), viewer));
        this.eventBus.emit("plugin:viewer-registered" as any, viewer);
        subscriptions.push(() => {
          exts.forEach(ext => this.registeredViewers.delete(ext.toLowerCase()));
        });
      },
      requestPermission: async (permission: PluginPermission) => {
        if (this.permissionEngine.hasPermission(plugin.id, permission)) {
          return true;
        }
        this.permissionEngine.grantPermissions(plugin.id, [permission]);
        return true;
      },
      onEvent: (eventName: any, handler: any) => {
        const unreg = this.eventBus.on(eventName, handler);
        subscriptions.push(unreg);
      },
    };

    try {
      await plugin.activate(context);
      this.activePlugins.set(id, context);
      console.log(`[PluginHost] Activated plugin: ${plugin.name} (${id})`);
    } catch (e) {
      console.error(`[PluginHost] Failed to activate plugin ${id}:`, e);
      subscriptions.forEach(unsub => {
        try { unsub(); } catch { /* ignore */ }
      });
      throw new Error(`[PluginHost] Failed to activate plugin '${id}': ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  public async deactivatePlugin(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    const context = this.activePlugins.get(id);

    if (plugin && context) {
      if (plugin.deactivate) {
        try {
          await plugin.deactivate();
        } catch (e) {
          console.error(`[PluginHost] Error deactivating plugin ${id}:`, e);
        }
      }

      context.subscriptions.forEach(unsub => unsub());
      this.activePlugins.delete(id);
      console.log(`[PluginHost] Deactivated plugin: ${id}`);
    }
  }

  public executePluginCode(pluginCode: string, pluginId: string): any {
    const moduleObj = { exports: {} as any };
    const wrappedCode = `(function(module, exports, require) {\n${pluginCode}\n})`;
    
    const sandboxContext = vm.createContext({
      console,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      Buffer,
      URL,
    });

    const sandboxRequire = (moduleName: string) => {
      const allowed = ["path", "events", "util", "crypto", "url"];
      if (allowed.includes(moduleName)) {
        return require(moduleName);
      }
      throw new Error(`[PluginHost] Direct require of '${moduleName}' is restricted for plugin '${pluginId}'`);
    };

    const compiledFn = vm.runInContext(wrappedCode, sandboxContext);
    compiledFn(moduleObj, moduleObj.exports, sandboxRequire);

    return moduleObj.exports.default ?? moduleObj.exports;
  }

  public getActivePlugins(): string[] {
    return Array.from(this.activePlugins.keys());
  }

  public getRegisteredViews(): RegisteredViewItem[] {
    return Array.from(this.registeredViews.values());
  }

  public getRegisteredPanels(): RegisteredViewItem[] {
    return Array.from(this.registeredPanels.values());
  }

  public getRegisteredLanguages(): LanguageContribution[] {
    return Array.from(this.registeredLanguages.values());
  }

  public getRegisteredLanguage(languageId: string): LanguageContribution | undefined {
    return this.registeredLanguages.get(languageId);
  }

  public getViewerForFile(filePath: string): RegisteredViewerItem | undefined {
    const ext = filePath.split(".").pop()?.toLowerCase();
    if (!ext) return undefined;
    return this.registeredViewers.get(`.${ext}`) || this.registeredViewers.get(ext);
  }
}
