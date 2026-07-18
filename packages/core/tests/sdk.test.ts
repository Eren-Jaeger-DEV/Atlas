import { describe, it, expect, vi } from "vitest";
import { PermissionEngine, ExtensionManager, ExtensionHost, CommandService, EventBus } from "../src/index.js";
import type { ExtensionManifest, AtlasExtensionModule } from "../src/index.js";

describe("Extension SDK & Marketplace Foundation", () => {
  it("should grant and check security permissions via PermissionEngine", () => {
    const permissions = new PermissionEngine();

    expect(permissions.hasPermission("ext.git", "workspace.read")).toBe(false);

    permissions.grantPermissions("ext.git", ["workspace.read", "terminal.execute"]);
    expect(permissions.hasPermission("ext.git", "workspace.read")).toBe(true);
    expect(permissions.hasPermission("ext.git", "workspace.write")).toBe(false);

    expect(() => permissions.checkOrThrow("ext.git", "workspace.write")).toThrow();

    permissions.revokePermissions("ext.git");
    expect(permissions.hasPermission("ext.git", "workspace.read")).toBe(false);
  });

  it("should install and manage extensions via ExtensionManager", async () => {
    const bus = new EventBus();
    const cmd = new CommandService(bus);
    const host = new ExtensionHost(cmd, bus);
    const permissions = new PermissionEngine();
    const manager = new ExtensionManager(permissions, host);

    const activateFn = vi.fn((ctx: any) => {
      ctx.registerCommand("myext.run", "Run My Ext", () => "hello");
    });

    const manifest: ExtensionManifest = {
      id: "myext",
      name: "My Extension",
      version: "1.0.0",
      publisher: "Dev",
      main: "index.js",
      permissions: ["workspace.read"],
    };

    const module: AtlasExtensionModule = {
      manifest,
      activate: activateFn,
    };

    await manager.installExtension(manifest, module);

    expect(manager.getInstalledExtensions()).toHaveLength(1);
    expect(permissions.hasPermission("myext", "workspace.read")).toBe(true);

    const res = await cmd.executeCommand("myext.run");
    expect(res).toBe("hello");

    await manager.uninstallExtension("myext");
    expect(manager.getInstalledExtensions()).toHaveLength(0);
    expect(permissions.hasPermission("myext", "workspace.read")).toBe(false);
  });
});
