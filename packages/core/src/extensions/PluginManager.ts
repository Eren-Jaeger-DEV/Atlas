/**
 * PluginManager
 *
 * Manages plugin lifecycle (install, uninstall, enable, disable, list).
 */

import type { PluginManifest, AtlasPluginModule } from "../types/plugin.js";
import { PermissionEngine } from "../security/PermissionEngine.js";
import { PluginHost, PluginModule } from "../services/PluginHost.js";

export interface InstalledPlugin {
  manifest: PluginManifest;
  enabled: boolean;
  installedAt: number;
}

export class PluginManager {
  private installedPlugins: Map<string, InstalledPlugin> = new Map();
  private permissionEngine: PermissionEngine;
  private pluginHost: PluginHost;

  constructor(permissionEngine: PermissionEngine, pluginHost: PluginHost) {
    this.permissionEngine = permissionEngine;
    this.pluginHost = pluginHost;
  }

  public async installPlugin(manifest: PluginManifest, pluginModule: AtlasPluginModule): Promise<InstalledPlugin> {
    const installed: InstalledPlugin = {
      manifest,
      enabled: true,
      installedAt: Date.now(),
    };

    this.installedPlugins.set(manifest.id, installed);

    if (manifest.permissions) {
      this.permissionEngine.grantPermissions(manifest.id, manifest.permissions);
    }

    const pluginDef: PluginModule = {
      id: manifest.id,
      name: manifest.name,
      activate: (ctx) => pluginModule.activate(ctx),
    };
    if (pluginModule.deactivate) {
      pluginDef.deactivate = () => pluginModule.deactivate!();
    }

    this.pluginHost.registerPlugin(pluginDef);

    await this.pluginHost.activatePlugin(manifest.id);
    return installed;
  }

  public async uninstallPlugin(id: string): Promise<boolean> {
    if (!this.installedPlugins.has(id)) return false;

    await this.pluginHost.deactivatePlugin(id);
    this.permissionEngine.revokePermissions(id);
    this.installedPlugins.delete(id);
    return true;
  }

  public async togglePlugin(id: string, enable: boolean): Promise<boolean> {
    const plugin = this.installedPlugins.get(id);
    if (!plugin) return false;

    plugin.enabled = enable;
    if (enable) {
      await this.pluginHost.activatePlugin(id);
    } else {
      await this.pluginHost.deactivatePlugin(id);
    }
    return true;
  }

  public getInstalledPlugins(): InstalledPlugin[] {
    return Array.from(this.installedPlugins.values());
  }

  public getPlugin(id: string): InstalledPlugin | undefined {
    return this.installedPlugins.get(id);
  }
}
