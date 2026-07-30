import { describe, it, expect, vi } from "vitest";
import { PermissionEngine, PluginManager, PluginHost, CommandService, EventBus } from "../src/index.js";
import type { PluginManifest, AtlasPluginModule } from "../src/index.js";

describe("Plugin SDK & Marketplace Foundation", () => {
  it("should grant and check security permissions via PermissionEngine", () => {
    const permissions = new PermissionEngine();

    expect(permissions.hasPermission("plugin.git", "workspace.read")).toBe(false);

    permissions.grantPermissions("plugin.git", ["workspace.read", "workspace.execute"]);
    expect(permissions.hasPermission("plugin.git", "workspace.read")).toBe(true);
    expect(permissions.hasPermission("plugin.git", "workspace.write")).toBe(false);

    expect(() => permissions.checkOrThrow("plugin.git", "workspace.write")).toThrow();

    permissions.revokePermissions("plugin.git");
    expect(permissions.hasPermission("plugin.git", "workspace.read")).toBe(false);
  });

  it("should install and manage plugins via PluginManager", async () => {
    const bus = new EventBus();
    const cmd = new CommandService(bus);
    const permissions = new PermissionEngine();
    const host = new PluginHost(cmd, permissions, bus);
    const manager = new PluginManager(permissions, host);

    const activateFn = vi.fn((ctx: any) => {
      ctx.registerCommand("myplugin.run", "Run My Plugin", () => "hello");
    });

    const manifest: PluginManifest = {
      id: "myplugin",
      name: "My Plugin",
      version: "1.0.0",
      publisher: "Dev",
      main: "index.js",
      permissions: ["workspace.read"],
    };

    const module: AtlasPluginModule = {
      activate: activateFn,
    };

    await manager.installPlugin(manifest, module);

    expect(manager.getInstalledPlugins()).toHaveLength(1);
    expect(permissions.hasPermission("myplugin", "workspace.read")).toBe(true);

    const res = await cmd.executeCommand("myplugin.run");
    expect(res).toBe("hello");

    await manager.uninstallPlugin("myplugin");
    expect(manager.getInstalledPlugins()).toHaveLength(0);
    expect(permissions.hasPermission("myplugin", "workspace.read")).toBe(false);
  });
});
