/**
 * Atlas Editor — Electron Main Process
 *
 * Architectural rule enforced here:
 * The main process spawns the agent runtime as a separate process
 * and communicates via IPC. It does NOT directly import @atlas/agents.
 *
 * The renderer (CodeMirror + React) knows nothing about AI.
 * The AI plugin in the renderer talks to THIS process via ipcRenderer,
 * which then delegates to the agent runtime subprocess.
 */

import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "node:path";

const isDev = process.env["NODE_ENV"] === "development";

let mainWindow: BrowserWindow | null = null;

// ---------------------------------------------------------------------------
// Window creation
// ---------------------------------------------------------------------------

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#0f0f13",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  });

  // Load URL
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ---------------------------------------------------------------------------
// IPC handlers — bridge between renderer and agent runtime
// ---------------------------------------------------------------------------

// Impact query — can run in-process since it's zero-AI
ipcMain.handle("atlas:impact", async (_event, filePath: string, symbolName?: string) => {
  try {
    // Lazy-import MemoryEngine (only the main process does this)
    const { MemoryEngine } = await import("@atlas/graph");
    const repoRoot = global.__atlasRepoRoot;
    if (!repoRoot) return { error: "No repo open" };

    const engine = await MemoryEngine.create({ repoRoot });
    const result = await engine.impact(filePath, symbolName);
    engine.close();
    return result;
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
});

// Graph search
ipcMain.handle("atlas:search", async (_event, query: string) => {
  try {
    const { MemoryEngine } = await import("@atlas/graph");
    const repoRoot = global.__atlasRepoRoot;
    if (!repoRoot) return [];

    const engine = await MemoryEngine.create({ repoRoot });
    const results = engine.search(query, 10);
    engine.close();
    return results;
  } catch {
    return [];
  }
});

// Open repo (sets the active repo root)
ipcMain.handle("atlas:open-repo", async (_event, repoPath: string) => {
  global.__atlasRepoRoot = repoPath;
  return { success: true, repoPath };
});

// Agent run — delegates to agent runtime subprocess
// NOTE: In Phase 1, this runs in-process for simplicity.
// Phase 2 should extract to a proper subprocess for isolation.
ipcMain.handle("atlas:run", async (event, goal: string) => {
  try {
    const { MemoryEngine } = await import("@atlas/graph");
    const { Orchestrator, detectProviderFromEnv, createProvider } = await import("@atlas/agents");
    const repoRoot = global.__atlasRepoRoot;
    if (!repoRoot) return { error: "No repo open" };

    const providerConfig = detectProviderFromEnv();
    const provider = createProvider(providerConfig);
    const memory = await MemoryEngine.create({ repoRoot });

    const orchestrator = new Orchestrator({
      provider,
      memory,
      repoRoot,
      onEvent: (ev) => {
        // Stream events to renderer
        event.sender.send("atlas:event", ev);
      },
    });

    const record = await orchestrator.run(goal);
    memory.close();
    return record;
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
});

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

declare global {
  var __atlasRepoRoot: string | undefined;
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
