import { describe, it, expect, vi } from "vitest";
import {
  EventBus,
  ServiceContainer,
  CommandService,
  SettingsService,
  ExtensionHost,
} from "../src/index.js";

describe("Platform Foundation — ServiceContainer & EventBus", () => {
  it("should trigger pub/sub events via EventBus", () => {
    const bus = new EventBus();
    const fn = vi.fn();

    const unsub = bus.on("FileOpened", fn);
    bus.emit("FileOpened", { path: "/test/file.ts" });

    expect(fn).toHaveBeenCalledWith({ path: "/test/file.ts" });

    unsub();
    bus.emit("FileOpened", { path: "/test/file2.ts" });
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

  it("should activate and deactivate extensions via ExtensionHost", async () => {
    const bus = new EventBus();
    const cmdService = new CommandService(bus);
    const host = new ExtensionHost(cmdService, bus);

    const activateFn = vi.fn((ctx) => {
      ctx.registerCommand("ext.hello", "Hello Ext", () => "world");
    });

    host.registerExtension({
      id: "test-plugin",
      name: "Test Plugin",
      activate: activateFn,
    });

    await host.activateExtension("test-plugin");
    expect(activateFn).toHaveBeenCalled();
    expect(host.getActiveExtensions()).toContain("test-plugin");

    const result = await cmdService.executeCommand("ext.hello");
    expect(result).toBe("world");

    await host.deactivateExtension("test-plugin");
    expect(host.getActiveExtensions()).not.toContain("test-plugin");
  });

  it("should register platform services inside ServiceContainer", () => {
    const container = ServiceContainer.getInstance();
    expect(container.eventBus).toBeDefined();
    expect(container.commandService).toBeDefined();
    expect(container.settingsService).toBeDefined();
    expect(container.extensionHost).toBeDefined();
  });
});
