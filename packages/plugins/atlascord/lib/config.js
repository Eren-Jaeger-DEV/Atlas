const fs = require("fs");
const path = require("path");

const DEFAULT_CONFIG = {
  enable: true,
  "app.privacyMode.enable": false,
  "status.showElapsedTime": true,
  "status.resetElapsedTimePerFile": false,
  "status.details.text.editing": "Editing {file_name}",
  "status.details.text.idle": "Idle in {workspace}",
  "status.details.text.notInFile": "In {workspace}",
  "status.state.text.editing": "Workspace: {workspace} | Ln {current_line}, Col {current_column}",
  "status.state.text.idle": "Atlas Studio IDE",
  "status.state.text.notInFile": "Atlas Studio IDE",
  "status.problems.enabled": true,
  "status.problems.text": " ({problems_count} {problems_pluralize})",
  "status.idle.timeout": 300,
  "status.idle.disconnectOnIdle": false,
  "status.buttons.button1.enabled": true,
  "status.buttons.button1.label": "Atlas Studio",
  "status.buttons.button1.url": "https://github.com/Eren-Jaeger-DEV/Atlas",
  "status.buttons.button2.enabled": false,
  "status.buttons.button2.label": "View Project",
  "status.buttons.button2.url": "{git_url}"
};

class ConfigManager {
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.listeners = [];
  }

  load(context) {
    try {
      // 1. Try global extension state
      if (context && context.globalState) {
        const saved = context.globalState.get("atlascord_config");
        if (saved && typeof saved === "object") {
          this.config = { ...DEFAULT_CONFIG, ...saved };
        }
      }
    } catch (e) {
      console.warn("[Atlascord] Failed to load config from globalState:", e);
    }
  }

  get(key) {
    return this.config[key] !== undefined ? this.config[key] : DEFAULT_CONFIG[key];
  }

  set(key, value, context) {
    this.config[key] = value;
    if (context && context.globalState) {
      try {
        context.globalState.update("atlascord_config", this.config);
      } catch (e) {}
    }
    this.notify();
  }

  updateAll(newConfig, context) {
    this.config = { ...DEFAULT_CONFIG, ...newConfig };
    if (context && context.globalState) {
      try {
        context.globalState.update("atlascord_config", this.config);
      } catch (e) {}
    }
    this.notify();
  }

  onChange(fn) {
    this.listeners.push(fn);
  }

  notify() {
    for (const fn of this.listeners) {
      try { fn(this.config); } catch (e) {}
    }
  }
}

module.exports = {
  ConfigManager,
  DEFAULT_CONFIG,
};
