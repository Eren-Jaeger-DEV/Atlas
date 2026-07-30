import { describe, it, expect, vi } from "vitest";
import {
  EventBus,
  ServiceContainer,
  CommandService,
  SettingsService,
  PluginHost,
} from "../src/index.js";

describe("Platform Foundation — ServiceContainer & EventBus", () => {
  it("should trigger pub/sub events via EventBus", () => {
    const bus = new EventBus();
    const fn = vi.fn();

    const unsub = bus.on("FileOpened" as any, fn);
    bus.emit("FileOpened" as any, { path: "/test/file.ts" });

    expect(fn).toHaveBeenCalledWith({ path: "/test/file.ts" });

    unsub();
    bus.emit("FileOpened" as any, { path: "/test/file2.ts" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should register and execute commands via CommandService", async () => {
    const bus = new EventBus();
    const cmdService = new CommandService(bus);

    const handler = vi.fn().mockReturnValue(42);
    cmdService.registerCommand("atlas.test.run", "Run Test", handler, "Ctrl+T");

    expect(cmdService.hasCommand("atlas.test.run")).toBe(true);

    const result = await cmdService.executeCommand("atlas.test.run", "arg1");
    expect(handler).toHaveBeenCalledWith("arg1");
    expect(result).toBe(42);
  });

  it("should resolve 3-tier hierarchical settings via SettingsService", () => {
    const bus = new EventBus();
    const settings = new SettingsService(bus);

    expect(settings.get("theme")).toBe("obsidian");

    settings.setUserSettings({ fontSize: 16 });
    expect(settings.get("fontSize")).toBe(16);

    // Workspace overrides user settings
    settings.setWorkspaceSettings({ fontSize: 18 });
    expect(settings.get("fontSize")).toBe(18);
  });

  it("should activate and deactivate plugins via PluginHost", async () => {
    const bus = new EventBus();
    const cmdService = new CommandService(bus);
    const host = new PluginHost(cmdService, undefined, bus);

    const activateFn = vi.fn((ctx) => {
      ctx.registerCommand("ext.hello", "Hello Ext", () => "world");
    });

    host.registerPlugin({
      id: "test-plugin",
      name: "Test Plugin",
      activate: activateFn,
    });

    await host.activatePlugin("test-plugin");
    expect(activateFn).toHaveBeenCalled();
    expect(host.getActivePlugins()).toContain("test-plugin");

    const result = await cmdService.executeCommand("ext.hello");
    expect(result).toBe("world");

    await host.deactivatePlugin("test-plugin");
    expect(host.getActivePlugins()).not.toContain("test-plugin");
  });

  it("should register platform services inside ServiceContainer", () => {
    const container = ServiceContainer.getInstance();
    expect(container.eventBus).toBeDefined();
    expect(container.commandService).toBeDefined();
    expect(container.settingsService).toBeDefined();
    expect(container.pluginHost).toBeDefined();
  });
});
