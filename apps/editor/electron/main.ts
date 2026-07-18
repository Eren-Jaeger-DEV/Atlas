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

import { app, BrowserWindow, ipcMain, shell, dialog, protocol, net, Menu } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { readdir, readFile, writeFile, mkdir, rm, rename, stat } from "node:fs/promises";
import { spawn, execFile, ChildProcessWithoutNullStreams } from "node:child_process";
import { promisify } from "node:util";

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
]);

const execFileAsync = promisify(execFile);
const isDev = process.env["NODE_ENV"] === "development";

let mainWindow: BrowserWindow | null = null;
const terminalProcesses = new Map<string, ChildProcessWithoutNullStreams>();

// ---------------------------------------------------------------------------
// Window creation
// ---------------------------------------------------------------------------

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: "#0f0f13",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: true,
  });

  // Load URL
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL("app://bundle/index.html");
  }

  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    console.log(`[RENDERER LOG ${level}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    console.error(`[DID FAIL LOAD] ${errorCode}: ${errorDescription}`);
  });

  mainWindow.show();
  mainWindow.focus();

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Build native application menu
  buildApplicationMenu();
}

// ---------------------------------------------------------------------------
// Native Application Menu
// ---------------------------------------------------------------------------

function buildApplicationMenu(): void {
  const sendToRenderer = (channel: string, ...args: unknown[]) => {
    mainWindow?.webContents.send(channel, ...args);
  };

  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: "File",
      submenu: [
        { label: "Open Folder...",           accelerator: "CmdOrCtrl+O",         click: () => sendToRenderer("menu:open-folder") },
        { type: "separator" },
        { label: "New File",                 accelerator: "CmdOrCtrl+N",         click: () => sendToRenderer("menu:new-file") },
        { label: "Save",                     accelerator: "CmdOrCtrl+S",         click: () => sendToRenderer("menu:save") },
        { label: "Save All",                 accelerator: "CmdOrCtrl+Shift+S",   click: () => sendToRenderer("menu:save-all") },
        { type: "separator" },
        { label: "Close Editor Tab",         accelerator: "CmdOrCtrl+W",         click: () => sendToRenderer("menu:close-tab") },
        { type: "separator" },
        { role: "quit",                      label: "Exit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
        { type: "separator" },
        { label: "Find",                     accelerator: "CmdOrCtrl+F",         click: () => sendToRenderer("menu:find") },
        { label: "Replace",                  accelerator: "CmdOrCtrl+H",         click: () => sendToRenderer("menu:replace") },
      ],
    },
    {
      label: "Selection",
      submenu: [
        { label: "Select All",               accelerator: "CmdOrCtrl+A",         click: () => sendToRenderer("menu:select-all") },
        { label: "Expand Selection",         accelerator: "Shift+Alt+Right",     click: () => sendToRenderer("menu:expand-selection") },
        { label: "Shrink Selection",         accelerator: "Shift+Alt+Left",      click: () => sendToRenderer("menu:shrink-selection") },
        { type: "separator" },
        { label: "Add Cursor Above",         accelerator: "CmdOrCtrl+Alt+Up",    click: () => sendToRenderer("menu:cursor-above") },
        { label: "Add Cursor Below",         accelerator: "CmdOrCtrl+Alt+Down",  click: () => sendToRenderer("menu:cursor-below") },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "Command Palette",          accelerator: "CmdOrCtrl+Shift+P",   click: () => sendToRenderer("menu:command-palette") },
        { type: "separator" },
        { label: "Explorer",                 accelerator: "CmdOrCtrl+Shift+E",   click: () => sendToRenderer("menu:show-explorer") },
        { label: "Source Control",           accelerator: "CmdOrCtrl+Shift+G",   click: () => sendToRenderer("menu:show-git") },
        { label: "Impact Graph",             accelerator: "CmdOrCtrl+Shift+I",   click: () => sendToRenderer("menu:show-impact") },
        { label: "Atlas AI Chat",            accelerator: "CmdOrCtrl+L",         click: () => sendToRenderer("menu:toggle-ai-sidebar") },
        { type: "separator" },
        { label: "Settings",                 accelerator: "CmdOrCtrl+Comma",     click: () => sendToRenderer("menu:open-settings") },
        { type: "separator" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { role: "resetZoom" },
        { type: "separator" },
        { role: "togglefullscreen" },
        { label: "Toggle DevTools",          accelerator: "F12",                 click: () => mainWindow?.webContents.toggleDevTools() },
      ],
    },
    {
      label: "Go",
      submenu: [
        { label: "Go to File...",            accelerator: "CmdOrCtrl+P",         click: () => sendToRenderer("menu:goto-file") },
        { label: "Go to Line...",            accelerator: "CmdOrCtrl+G",         click: () => sendToRenderer("menu:goto-line") },
        { label: "Go to Symbol...",          accelerator: "CmdOrCtrl+Shift+O",   click: () => sendToRenderer("menu:goto-symbol") },
        { type: "separator" },
        { label: "Back",                     accelerator: "Alt+Left",            click: () => sendToRenderer("menu:go-back") },
        { label: "Forward",                  accelerator: "Alt+Right",           click: () => sendToRenderer("menu:go-forward") },
      ],
    },
    {
      label: "Run",
      submenu: [
        { label: "Run Atlas Agent",          accelerator: "F5",                  click: () => sendToRenderer("menu:run-agent") },
        { label: "Stop Agent",               accelerator: "Shift+F5",            click: () => sendToRenderer("menu:stop-agent") },
        { type: "separator" },
        { label: "Open Terminal",            accelerator: "CmdOrCtrl+Grave",     click: () => sendToRenderer("menu:toggle-terminal") },
      ],
    },
    {
      label: "Terminal",
      submenu: [
        { label: "New Terminal",             accelerator: "CmdOrCtrl+Shift+Grave", click: () => sendToRenderer("menu:new-terminal") },
        { label: "Toggle Terminal",          accelerator: "CmdOrCtrl+Grave",     click: () => sendToRenderer("menu:toggle-terminal") },
        { type: "separator" },
        { label: "Split Terminal",                                               click: () => sendToRenderer("menu:split-terminal") },
        { label: "Kill Terminal",                                                click: () => sendToRenderer("menu:kill-terminal") },
      ],
    },
    {
      label: "Help",
      submenu: [
        { label: "Atlas Studio Documentation", click: () => shell.openExternal("https://github.com/Eren-Jaeger-DEV/Atlas") },
        { label: "Report Issue",               click: () => shell.openExternal("https://github.com/Eren-Jaeger-DEV/Atlas/issues") },
        { type: "separator" },
        { label: "About Atlas Studio",                                          click: () => sendToRenderer("menu:show-about") },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
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

// Select Directory Dialog
ipcMain.handle("atlas:select-directory", async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const selectedPath = result.filePaths[0]!.replace(/\\/g, "/");
  global.__atlasRepoRoot = selectedPath;
  return selectedPath;
});

// File Operations
ipcMain.handle("atlas:read-dir", async (_event, dirPath: string) => {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((e) => !e.name.startsWith(".git") && e.name !== "node_modules" && e.name !== "dist" && e.name !== "dist-app")
      .map((e) => ({
        name: e.name,
        path: path.join(dirPath, e.name).replace(/\\/g, "/"),
        isDirectory: e.isDirectory(),
      }))
      .sort((a, b) => (a.isDirectory === b.isDirectory ? a.name.localeCompare(b.name) : a.isDirectory ? -1 : 1));
  } catch {
    return [];
  }
});

ipcMain.handle("atlas:read-file", async (_event, filePath: string) => {
  return await readFile(filePath, "utf-8");
});

ipcMain.handle("atlas:write-file", async (_event, filePath: string, content: string) => {
  await writeFile(filePath, content, "utf-8");
});

ipcMain.handle("atlas:create-file", async (_event, filePath: string, isDirectory: boolean) => {
  if (isDirectory) {
    await mkdir(filePath, { recursive: true });
  } else {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, "", "utf-8");
  }
});

ipcMain.handle("atlas:delete-file", async (_event, filePath: string) => {
  await rm(filePath, { recursive: true, force: true });
});

ipcMain.handle("atlas:rename-file", async (_event, oldPath: string, newPath: string) => {
  await rename(oldPath, newPath);
});

// Integrated Terminal Subprocess
ipcMain.handle("atlas:terminal-create", async (event, termId: string, cwd?: string) => {
  if (terminalProcesses.has(termId)) return { success: true };

  const targetCwd = cwd || global.__atlasRepoRoot || process.cwd();
  const isWin = process.platform === "win32";
  const defaultShell = isWin ? "cmd.exe" : "bash";
  const shellArgs = isWin ? ["/k"] : [];

  const proc = spawn(defaultShell, shellArgs, {
    cwd: targetCwd,
    env: process.env,
    shell: true,
  });

  terminalProcesses.set(termId, proc);

  proc.stdout.on("data", (chunk: Buffer) => {
    event.sender.send("atlas:terminal-data", { termId, data: chunk.toString("utf-8") });
  });

  proc.stderr.on("data", (chunk: Buffer) => {
    event.sender.send("atlas:terminal-data", { termId, data: chunk.toString("utf-8") });
  });

  proc.on("exit", () => {
    terminalProcesses.delete(termId);
  });

  return { success: true };
});

ipcMain.handle("atlas:terminal-input", async (_event, termId: string, data: string) => {
  const proc = terminalProcesses.get(termId);
  if (proc) {
    proc.stdin.write(data);
  }
});

ipcMain.handle("atlas:terminal-resize", async () => {
  return { success: true };
});

// Git Source Control
ipcMain.handle("atlas:git-status", async (_event, repoPath: string) => {
  try {
    const cwd = repoPath || global.__atlasRepoRoot || process.cwd();
    const { stdout } = await execFileAsync("git", ["status", "--porcelain"], { cwd });
    const lines = stdout.split("\n").filter(Boolean);
    return lines.map((line) => {
      const indexStatus = line.slice(0, 1);
      const workStatus = line.slice(1, 2);
      const file = line.slice(3).trim().replace(/\\/g, "/");
      const isStaged = indexStatus !== " " && indexStatus !== "?";
      let status = "modified";
      if (indexStatus === "?" || workStatus === "?") status = "untracked";
      else if (indexStatus === "A" || workStatus === "A") status = "added";
      else if (indexStatus === "D" || workStatus === "D") status = "deleted";

      return { path: file, status, staged: isStaged };
    });
  } catch {
    return [];
  }
});

ipcMain.handle("atlas:git-stage", async (_event, repoPath: string, filePath: string) => {
  const cwd = repoPath || global.__atlasRepoRoot || process.cwd();
  await execFileAsync("git", ["add", filePath], { cwd });
});

ipcMain.handle("atlas:git-unstage", async (_event, repoPath: string, filePath: string) => {
  const cwd = repoPath || global.__atlasRepoRoot || process.cwd();
  await execFileAsync("git", ["restore", "--staged", filePath], { cwd });
});

ipcMain.handle("atlas:git-commit", async (_event, repoPath: string, message: string) => {
  const cwd = repoPath || global.__atlasRepoRoot || process.cwd();
  await execFileAsync("git", ["commit", "-m", message], { cwd });
});

ipcMain.handle("atlas:git-diff", async (_event, repoPath: string, filePath: string, staged: boolean) => {
  try {
    const cwd = repoPath || global.__atlasRepoRoot || process.cwd();
    const args = staged ? ["diff", "--cached", filePath] : ["diff", filePath];
    const { stdout } = await execFileAsync("git", args, { cwd });
    return stdout;
  } catch {
    return "";
  }
});

// Open repo (sets the active repo root)
ipcMain.handle("atlas:open-repo", async (_event, repoPath: string) => {
  global.__atlasRepoRoot = repoPath;
  return { success: true, repoPath };
});

// Agent run — delegates to agent runtime subprocess
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
  protocol.handle("app", async (request) => {
    const url = new URL(request.url);
    let relativePath = url.pathname;
    if (relativePath.startsWith("/")) relativePath = relativePath.slice(1);
    if (!relativePath) relativePath = "index.html";

    const filePath = path.join(__dirname, "../dist", relativePath);
    try {
      const data = await readFile(filePath);
      const mimeTypes: Record<string, string> = {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".svg": "image/svg+xml",
        ".json": "application/json",
      };
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || "application/octet-stream";

      return new Response(data, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch {
      return new Response("Not Found", { status: 404 });
    }
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
