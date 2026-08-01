const DiscordRPC = require("discord-rpc");
const { replaceFileInfo, getLanguageKey, getWorkspaceName } = require("./replacer");

const CLIENT_ID = "1530523966341386332"; // Atlas Studio Discord RPC Client ID
DiscordRPC.register(CLIENT_ID);

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

class DiscordController {
  constructor(configManager, onStatusChange) {
    this.config = configManager;
    this.onStatusChange = onStatusChange;
    this.rpc = null;
    this.isConnected = false;
    this.isUserDisconnected = false;
    this.reconnectTimer = null;
    this.idleTimer = null;
    this.startTimestamp = Date.now();
    this.lastStateFile = "";

    this.state = {
      filePath: "",
      language: "plaintext",
      currentLine: 1,
      currentCol: 1,
      lineCount: 0,
      problemCount: 0,
      errorCount: 0,
      warningCount: 0,
      fileSize: 0,
      workspaceName: "Atlas Studio",
      gitOwner: "",
      gitRepo: "",
      gitBranch: "",
      gitUrl: "",
      isIdle: false,
    };

    this.pendingUpdateTimer = null;

    this.config.onChange(() => {
      this.scheduleUpdate();
    });
  }

  async connect() {
    this.isUserDisconnected = false;
    if (this.isConnected) return;

    this.emitStatus("reconnecting");

    try {
      if (this.rpc) {
        try { await this.rpc.destroy(); } catch (e) {}
      }

      this.rpc = new DiscordRPC.Client({ transport: "ipc" });

      this.rpc.on("ready", () => {
        this.isConnected = true;
        console.log(`[Atlascord] Connected to Discord as ${this.rpc.user?.username || "User"}`);
        this.emitStatus("connected");
        this.updatePresence();
      });

      this.rpc.on("disconnected", () => {
        this.isConnected = false;
        console.log("[Atlascord] Disconnected from Discord. Scheduling reconnect...");
        this.emitStatus("disconnected");
        if (!this.isUserDisconnected) {
          this.scheduleReconnect();
        }
      });

      await this.rpc.login({ clientId: CLIENT_ID });
    } catch (e) {
      this.isConnected = false;
      this.emitStatus("disconnected");
      if (!this.isUserDisconnected) {
        this.scheduleReconnect();
      }
    }
  }

  async toggleConnection() {
    if (this.isConnected) {
      this.isUserDisconnected = true;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      if (this.rpc) {
        try { await this.rpc.destroy(); } catch (e) {}
      }
      this.isConnected = false;
      this.emitStatus("disconnected");
    } else {
      this.connect();
    }
  }

  emitStatus(status) {
    if (typeof this.onStatusChange === "function") {
      try {
        this.onStatusChange(status);
      } catch (e) {}
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer || this.isUserDisconnected) return;
    this.emitStatus("reconnecting");
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 15000);
  }

  scheduleUpdate() {
    if (this.pendingUpdateTimer) return;
    this.pendingUpdateTimer = setTimeout(() => {
      this.pendingUpdateTimer = null;
      this.updatePresence();
    }, 1500);
  }

  updateFile(filePath, language) {
    if (this.config.get("status.resetElapsedTimePerFile") && filePath !== this.lastStateFile) {
      this.startTimestamp = Date.now();
    }
    this.lastStateFile = filePath;
    this.state.filePath = filePath || "";
    this.state.language = language || "plaintext";
    if (filePath) {
      this.state.workspaceName = getWorkspaceName(filePath);
    }
    this.resetIdleTimer();
    this.scheduleUpdate();
  }

  updateCursor(line, col) {
    this.state.currentLine = line || 1;
    this.state.currentCol = col || 1;
    this.resetIdleTimer();
    this.scheduleUpdate();
  }

  updateDiagnostics(count, errors = 0, warnings = 0) {
    this.state.problemCount = count || 0;
    this.state.errorCount = errors || 0;
    this.state.warningCount = warnings || 0;
    this.scheduleUpdate();
  }

  resetIdleTimer() {
    this.state.isIdle = false;
    if (this.idleTimer) clearTimeout(this.idleTimer);

    const timeout = this.config.get("status.idle.timeout") || 300;
    if (timeout > 0) {
      this.idleTimer = setTimeout(() => {
        this.state.isIdle = true;
        if (this.config.get("status.idle.disconnectOnIdle")) {
          if (this.rpc && this.isConnected) {
            this.rpc.clearActivity().catch(() => {});
          }
        } else {
          this.updatePresence();
        }
      }, timeout * 1000);
    }
  }

  updatePresence() {
    if (!this.rpc || !this.isConnected) return;
    if (!this.config.get("enable")) {
      this.rpc.clearActivity().catch(() => {});
      return;
    }

    const isIdle = this.state.isIdle;
    const hasFile = Boolean(this.state.filePath && this.state.filePath !== "No file open");

    let detailsKey = hasFile ? "status.details.text.editing" : "status.details.text.notInFile";
    let stateKey = hasFile ? "status.state.text.editing" : "status.state.text.notInFile";

    if (isIdle) {
      detailsKey = "status.details.text.idle";
      stateKey = "status.state.text.idle";
    }

    const details = replaceFileInfo(this.config.get(detailsKey), this.state, this.config);
    const stateText = replaceFileInfo(this.config.get(stateKey), this.state, this.config);

    const langKey = hasFile ? getLanguageKey(this.state.language, this.state.filePath) : "atlas";

    const buttons = [];
    if (this.config.get("status.buttons.button1.enabled")) {
      const label = replaceFileInfo(this.config.get("status.buttons.button1.label"), this.state, this.config);
      const url = replaceFileInfo(this.config.get("status.buttons.button1.url"), this.state, this.config);
      if (label && isValidUrl(url)) {
        buttons.push({ label, url });
      }
    }
    if (this.config.get("status.buttons.button2.enabled")) {
      const label = replaceFileInfo(this.config.get("status.buttons.button2.label"), this.state, this.config);
      const url = replaceFileInfo(this.config.get("status.buttons.button2.url"), this.state, this.config);
      if (label && isValidUrl(url)) {
        buttons.push({ label, url });
      }
    }

    const activityPayload = {
      details: details || undefined,
      state: stateText || undefined,
      largeImageKey: langKey,
      largeImageText: hasFile ? `${this.state.language || "Code"} file` : "Atlas Studio",
      smallImageKey: "atlas",
      smallImageText: "Atlas Studio IDE",
      instance: false,
    };

    if (this.config.get("status.showElapsedTime")) {
      activityPayload.startTimestamp = this.startTimestamp;
    }

    if (buttons.length > 0) {
      activityPayload.buttons = buttons;
    }

    this.rpc.setActivity(activityPayload).catch((err) => {
      console.error("[Atlascord] Failed to set activity:", err);
    });
  }

  destroy() {
    this.isUserDisconnected = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.pendingUpdateTimer) clearTimeout(this.pendingUpdateTimer);
    if (this.rpc) {
      try { this.rpc.destroy(); } catch (e) {}
    }
    this.isConnected = false;
    this.emitStatus("disconnected");
  }
}

module.exports = {
  DiscordController,
};
