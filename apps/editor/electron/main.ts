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

import { app, BrowserWindow, ipcMain, shell, dialog } from "electron";
import path from "node:path";
import { readdir, readFile, writeFile, mkdir, rm, rename, stat } from "node:fs/promises";
import { spawn, execFile, ChildProcessWithoutNullStreams } from "node:child_process";
import { promisify } from "node:util";

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
  const defaultShell = process.platform === "win32" ? "powershell.exe" : "bash";

  const proc = spawn(defaultShell, [], {
    cwd: targetCwd,
    env: process.env,
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
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
