/**
 * ExtensionManager
 *
 * Manages .atlasx extension packages (install, uninstall, update, list).
 */

import type { ExtensionManifest } from "../types/extension.js";
import { PermissionEngine } from "../security/PermissionEngine.js";
import { ExtensionHost, ExtensionModule } from "../services/ExtensionHost.js";

export interface InstalledExtension {
  manifest: ExtensionManifest;
  enabled: boolean;
  installedAt: number;
}

export interface AtlasExtensionModule {
  manifest: ExtensionManifest;
  activate: (context: any) => void | Promise<void>;
  deactivate?: () => void | Promise<void>;
}

export class ExtensionManager {
  private installedExtensions: Map<string, InstalledExtension> = new Map();
  private permissionEngine: PermissionEngine;
  private extensionHost: ExtensionHost;

  constructor(permissionEngine: PermissionEngine, extensionHost: ExtensionHost) {
    this.permissionEngine = permissionEngine;
    this.extensionHost = extensionHost;
  }

  public async installExtension(manifest: ExtensionManifest, extModule: AtlasExtensionModule): Promise<InstalledExtension> {
    const installed: InstalledExtension = {
      manifest,
      enabled: true,
      installedAt: Date.now(),
    };

    this.installedExtensions.set(manifest.id, installed);

    this.permissionEngine.grantPermissions(manifest.id, manifest.permissions);

    const extDef: ExtensionModule = {
      id: manifest.id,
      name: manifest.name,
      activate: (ctx) => extModule.activate(ctx),
    };
    if (extModule.deactivate) {
      extDef.deactivate = () => extModule.deactivate!();
    }

    this.extensionHost.registerExtension(extDef);

    await this.extensionHost.activateExtension(manifest.id);
    return installed;
  }

  public async uninstallExtension(id: string): Promise<boolean> {
    if (!this.installedExtensions.has(id)) return false;

    await this.extensionHost.deactivateExtension(id);
    this.permissionEngine.revokePermissions(id);
    this.installedExtensions.delete(id);
    return true;
  }

  public async toggleExtension(id: string, enable: boolean): Promise<boolean> {
    const ext = this.installedExtensions.get(id);
    if (!ext) return false;

    ext.enabled = enable;
    if (enable) {
      await this.extensionHost.activateExtension(id);
    } else {
      await this.extensionHost.deactivateExtension(id);
    }
    return true;
  }

  public getInstalledExtensions(): InstalledExtension[] {
    return Array.from(this.installedExtensions.values());
  }

  public getExtension(id: string): InstalledExtension | undefined {
    return this.installedExtensions.get(id);
  }
}
