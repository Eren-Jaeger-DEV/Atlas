/**
 * PluginHost
 *
 * Isolated plugin lifecycle runtime with capabilities registration,
 * permission engine gating, and CommonJS module execution shim.
 *
 * Security model:
 *   - Plugins MUST call ctx.requestPermission() before accessing protected APIs.
 *   - Permissions are never auto-granted. The host emits a `plugin:permission-request`
 *     event on the EventBus and awaits explicit user approval via the permission dialog.
 *   - Main process routes IPC `atlas:permission-response` back via resolvePermissionRequest().
 */

import { CommandService } from "./CommandService.js";
import { EventBus } from "../events/EventBus.js";
import type { LanguageContribution, PluginPermission } from "../types/plugin.js";
import { PermissionEngine } from "../security/PermissionEngine.js";
import { randomUUID } from "node:crypto";
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
  // In-flight guard: tracks promises for plugins currently activating to prevent race conditions
  private activatingPlugins: Map<string, Promise<void>> = new Map();
  // Discovered manifests for lazy/deferred activation (from discoverFromManifest)
  private discoveredManifests: Map<string, { activationEvents: string[] }> = new Map();
  private registeredViews: Map<string, RegisteredViewItem> = new Map();
  private registeredPanels: Map<string, RegisteredViewItem> = new Map();
  private registeredLanguages: Map<string, LanguageContribution> = new Map();
  private registeredViewers: Map<string, RegisteredViewerItem> = new Map();
  private commandService: CommandService;
  private eventBus: EventBus;
  private permissionEngine: PermissionEngine;

  /**
   * Pending permission requests keyed by requestId.
   * Resolved by main process via resolvePermissionRequest() after user responds
   * to the in-app permission dialog.
   */
  private pendingPermissionRequests: Map<string, (granted: boolean) => void> = new Map();

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

  /**
   * Phase 1: Register a plugin's manifest without activating it.
   * Called during discovery scan so the PluginHost knows what events each plugin responds to.
   * The plugin module (with its activate() fn) must still be registered via registerPlugin().
   */
  public discoverFromManifest(id: string, activationEvents: string[]): void {
    this.discoveredManifests.set(id, { activationEvents });
  }

  /**
   * Phase 2a: Activate all plugins that declared "*" or "onStartupFinished".
   * Called once after the window is visible and idle — never before createWindow().
   */
  public async activateStartupPlugins(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const [id, { activationEvents }] of this.discoveredManifests) {
      if (activationEvents.includes("*") || activationEvents.includes("onStartupFinished")) {
        promises.push(this._activateOnce(id));
      }
    }
    await Promise.allSettled(promises);
  }

  /**
   * Phase 2b: Activate any plugins that declared onLanguage:<languageId>.
   * Called the first time a file of that language is opened in the editor.
   */
  public async activateForLanguage(languageId: string): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const [id, { activationEvents }] of this.discoveredManifests) {
      if (activationEvents.includes(`onLanguage:${languageId}`)) {
        promises.push(this._activateOnce(id));
      }
    }
    await Promise.allSettled(promises);
  }

  /**
   * Phase 2b: Activate any plugins that declared onCommand:<commandId>.
   * Called right before executing a command that may belong to an unactivated plugin.
   */
  public async activateForCommand(commandId: string): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const [id, { activationEvents }] of this.discoveredManifests) {
      if (activationEvents.includes(`onCommand:${commandId}`)) {
        promises.push(this._activateOnce(id));
      }
    }
    await Promise.allSettled(promises);
  }

  /**
   * Phase 2b: Activate any plugins that declared onView:<viewId>.
   * Called when a specific panel/sidebar view is opened.
   */
  public async activateForView(viewId: string): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const [id, { activationEvents }] of this.discoveredManifests) {
      if (activationEvents.includes(`onView:${viewId}`)) {
        promises.push(this._activateOnce(id));
      }
    }
    await Promise.allSettled(promises);
  }

  /**
   * Internal: activate a plugin exactly once, with in-flight concurrency guard.
   * If activation is already in progress for this id, reuses the existing promise.
   */
  private _activateOnce(id: string): Promise<void> {
    if (this.activePlugins.has(id)) return Promise.resolve();
    const inflight = this.activatingPlugins.get(id);
    if (inflight) return inflight;
    const p = this.activatePlugin(id).catch(e => {
      console.error(`[PluginHost] Lazy activation failed for '${id}':`, e);
    }).finally(() => {
      this.activatingPlugins.delete(id);
    });
    this.activatingPlugins.set(id, p);
    return p;
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
        // Fast path: already granted in a previous session
        if (this.permissionEngine.hasPermission(plugin.id, permission)) {
          return true;
        }

        // Gate: emit an event so the main process can show a permission dialog.
        // The Promise resolves ONLY when the user explicitly approves or denies.
        return new Promise<boolean>((resolve) => {
          const reqId = randomUUID();
          this.pendingPermissionRequests.set(reqId, (granted: boolean) => {
            if (granted) {
              this.permissionEngine.grantPermissions(plugin.id, [permission]);
            }
            resolve(granted);
          });

          // Notify the host environment (main process picks this up via EventBus listener)
          this.eventBus.emit("plugin:permission-request" as any, {
            reqId,
            pluginId: plugin.id,
            pluginName: plugin.name,
            permission,
          });

          // Safety timeout: auto-deny after 5 minutes if no response
          setTimeout(() => {
            if (this.pendingPermissionRequests.has(reqId)) {
              console.warn(`[PluginHost] Permission request ${reqId} for '${plugin.id}' timed out — auto-denying.`);
              this.pendingPermissionRequests.get(reqId)?.(false);
              this.pendingPermissionRequests.delete(reqId);
            }
          }, 5 * 60 * 1000);
        });
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

  /**
   * Called by the main process after the user responds to a permission dialog.
   * Routes the decision back to the waiting requestPermission() Promise.
   */
  public resolvePermissionRequest(reqId: string, granted: boolean): void {
    const resolver = this.pendingPermissionRequests.get(reqId);
    if (resolver) {
      resolver(granted);
      this.pendingPermissionRequests.delete(reqId);
    } else {
      console.warn(`[PluginHost] No pending permission request found for reqId: ${reqId}`);
    }
  }

  /**
   * Returns all pending permission request IDs (useful for diagnostics).
   */
  public getPendingPermissionRequests(): string[] {
    return Array.from(this.pendingPermissionRequests.keys());
  }
}
