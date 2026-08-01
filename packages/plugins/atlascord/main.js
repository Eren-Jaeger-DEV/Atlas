const { ConfigManager } = require("./lib/config");
const { DiscordController } = require("./lib/rpc");

module.exports = {
  activate: async function (context) {
    console.log("[Atlascord] Activating Atlascord (Discord Rich Presence)...");

    const configManager = new ConfigManager();
    configManager.load(context);

    const controller = new DiscordController(configManager, (status) => {
      if (context.emitEvent) {
        context.emitEvent("AtlascordStatus", { status });
      }
    });

    if (context.registerSettings) {
      context.registerSettings({
        id: "atlascord",
        title: "Atlascord (Discord Rich Presence)",
        settings: configManager.config,
        onChange: (newSettings) => {
          configManager.updateAll(newSettings, context);
        }
      });
    }

    // IDE Event Listeners
    context.onEvent("ActiveEditorChanged", (payload) => {
      if (payload) {
        controller.updateFile(payload.filePath, payload.language);
      }
    });

    context.onEvent("DiagnosticsUpdated", (payload) => {
      if (payload) {
        controller.updateDiagnostics(payload.count, payload.errors, payload.warnings);
      }
    });

    context.onEvent("CursorMoved", (payload) => {
      if (payload) {
        controller.updateCursor(payload.line, payload.col);
      }
    });

    context.onEvent("AtlascordConfigChanged", (payload) => {
      if (payload && typeof payload === "object") {
        configManager.updateAll(payload, context);
      }
    });

    context.onEvent("AtlascordToggleConnect", () => {
      controller.toggleConnection();
    });

    // Connect to Discord
    controller.connect();

    // Store references for clean deactivation
    context._controller = controller;
    context._configManager = configManager;
  },

  deactivate: async function (context) {
    console.log("[Atlascord] Deactivating Atlascord...");
    if (context._controller) {
      context._controller.destroy();
    }
  }
};
