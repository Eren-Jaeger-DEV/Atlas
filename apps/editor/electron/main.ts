/**
 * Atlas Editor - Electron Main Process
 *
 * Architectural rule enforced here:
 * The main process spawns the agent runtime as a separate process
 * and communicates via IPC. It does NOT directly import @atlas/agents.
 *
 * The renderer (Monaco + React) knows nothing about AI.
 * The AI plugin in the renderer talks to THIS process via ipcRenderer,
 * which then delegates to the agent runtime subprocess.
 */

import { app, BrowserWindow, ipcMain, shell, dialog, protocol, net, Menu, clipboard } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { readdir, readFile, writeFile, mkdir, rm, rename, stat } from "node:fs/promises";
import cp, { execFile } from "node:child_process";
import { promisify } from "node:util";
import WebSocket from "ws";
import vm from "node:vm";
import { cp as fsCp } from "node:fs/promises";
import os from "node:os";

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
]);

const execFileAsync = promisify(execFile);
const isDev = process.env["NODE_ENV"] === "development";

let mainWindow: BrowserWindow | null = null;
import type * as pty from "node-pty";
const terminalProcesses = new Map<string, pty.IPty>();

// ---------------------------------------------------------------------------
// Extension Runtime State
// ---------------------------------------------------------------------------
const extensionCommands = new Map<string, (...args: any[]) => any>();
// Window creation
// ---------------------------------------------------------------------------

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: "#0f0f13",
    icon: path.join(__dirname, "../build/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    frame: false,
    show: false,
    autoHideMenuBar: true,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow!.show();
    mainWindow!.focus();
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

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Disable native application menu to prevent it from showing on Alt press
  Menu.setApplicationMenu(null);
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
        { label: "Add Folder to Workspace...",                                   click: () => sendToRenderer("menu:add-folder") },
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
// IPC handlers â€” bridge between renderer and agent runtime
// ---------------------------------------------------------------------------

// Impact query â€” can run in-process since it's zero-AI
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

ipcMain.handle("atlas:select-directory", async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const selectedPath = result.filePaths[0]!.replace(/\\/g, "/");
  global.__atlasRepoRoot = selectedPath;
  global.__atlasWorkspaceRoots = [selectedPath];
  return selectedPath;
});

ipcMain.handle("atlas:add-directory", async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const selectedPath = result.filePaths[0]!.replace(/\\/g, "/");
  if (!global.__atlasWorkspaceRoots) global.__atlasWorkspaceRoots = [];
  if (!global.__atlasWorkspaceRoots.includes(selectedPath)) {
    global.__atlasWorkspaceRoots.push(selectedPath);
  }
  return selectedPath;
});

// Permission Engine
let permissionEngineInstance: any = null;
async function getPermissionEngine() {
  if (!permissionEngineInstance) {
    const { PermissionEngine } = await import("@atlas/core");
    permissionEngineInstance = new PermissionEngine();
  }
  return permissionEngineInstance;
}

ipcMain.handle("atlas:grant-permission", async (_event, extensionId: string, permissions: any[]) => {
  const engine = await getPermissionEngine();
  engine.grantPermissions(extensionId, permissions);
});

ipcMain.handle("atlas:revoke-permission", async (_event, extensionId: string) => {
  const engine = await getPermissionEngine();
  engine.revokePermissions(extensionId);
});

// Inline Agent Action
ipcMain.handle("atlas:agent-inline-action", async (_event, action: string, text: string) => {
  // In a real app, this would route to packages/agents' orchestrator or an LLM provider directly.
  // For now, we simulate a mock stream/delay.
  await new Promise(r => setTimeout(r, 1000));
  if (action === "explain") {
    return `[Agent] Explanation for the selected code:\nThis code snippet appears to handle state management or dispatch logic.`;
  } else if (action === "test") {
    return `[Agent] Generating unit tests...\n\nimport { test, expect } from "vitest";\n\ntest("works correctly", () => {\n  expect(true).toBe(true);\n});`;
  } else if (action === "docs") {
    return `[Agent] Generating documentation...\n\n/**\n * This module is responsible for the core functionality.\n */`;
  }
  return `[Agent] Action completed.`;
});

// Dependency Graph Data
ipcMain.handle("atlas:get-graph-data", async (_event, repoPath: string) => {
  try {
    const { MemoryEngine } = await import("@atlas/graph");
    const engine = await MemoryEngine.create({ repoRoot: repoPath });
    const nodes = engine.db.getAllNodes();
    const edges = engine.db.getAllEdges();
    // Do not close engine immediately if it is shared, but here it's created on the fly.
    // In a real app we might cache it. Let's close it to avoid leaks.
    engine.close();
    return { nodes, edges };
  } catch (err) {
    console.error("Failed to get graph data:", err);
    return { nodes: [], edges: [] };
  }
});

// Tasks
ipcMain.handle("atlas:get-tasks", async (_event, repoPath: string) => {
  const tasks: Array<{ id: string; name: string; command: string; source: string }> = [];
  if (!repoPath) return tasks;
  
  try {
    const pkgPath = path.join(repoPath, "package.json");
    if (await stat(pkgPath).catch(() => null)) {
      const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
      if (pkg.scripts) {
        for (const [name, command] of Object.entries(pkg.scripts)) {
          tasks.push({
            id: `npm:${name}`,
            name: `npm: ${name}`,
            command: `npx ${name}`,
            source: "npm"
          });
        }
      }
    }
    const tasksPath = path.join(repoPath, ".atlas", "tasks.json");
    if (await stat(tasksPath).catch(() => null)) {
      const custom = JSON.parse(await readFile(tasksPath, "utf-8"));
      if (custom.tasks && Array.isArray(custom.tasks)) {
        for (const t of custom.tasks) {
          tasks.push({
            id: `workspace:${t.label}`,
            name: t.label,
            command: t.command,
            source: "workspace"
          });
        }
      }
    }
  } catch (err) {
    console.error("Failed to parse tasks:", err);
  }
  return tasks;
});

// Snippets
ipcMain.handle("atlas:get-snippets", async () => {
  try {
    const userSnippetsPath = path.join(app.getPath("userData"), "..", "atlas", "snippets.json");
    let userSnippets = {};
    if (await stat(userSnippetsPath).catch(() => null)) {
      userSnippets = JSON.parse(await readFile(userSnippetsPath, "utf-8"));
    }
    
    let workspaceSnippets = {};
    if (global.__atlasRepoRoot) {
      const wsSnippetsPath = path.join(global.__atlasRepoRoot, ".atlas", "snippets.json");
      if (await stat(wsSnippetsPath).catch(() => null)) {
        workspaceSnippets = JSON.parse(await readFile(wsSnippetsPath, "utf-8"));
      }
    }
    
    return { ...userSnippets, ...workspaceSnippets };
  } catch (err) {
    console.error("[get-snippets] error:", err);
    return {};
  }
});

// Settings
async function getMergedSettings() {
  try {
    const userSettingsPath = path.join(app.getPath("userData"), "..", "atlas", "settings.json");
    let userSettings = {};
    if (await stat(userSettingsPath).catch(() => null)) {
      userSettings = JSON.parse(await readFile(userSettingsPath, "utf-8"));
    }
    
    let workspaceSettings = {};
    if (global.__atlasRepoRoot) {
      const wsSettingsPath = path.join(global.__atlasRepoRoot, ".atlas", "settings.json");
      if (await stat(wsSettingsPath).catch(() => null)) {
        workspaceSettings = JSON.parse(await readFile(wsSettingsPath, "utf-8"));
      }
    }
    
    const { DEFAULT_SETTINGS_SCHEMA } = await import("@atlas/core");
    return {
      ...DEFAULT_SETTINGS_SCHEMA,
      ...userSettings,
      ...workspaceSettings
    };
  } catch (err) {
    console.error("Failed to read settings:", err);
    return {};
  }
}

ipcMain.handle("atlas:get-settings", async () => {
  return await getMergedSettings();
});

ipcMain.handle("atlas:update-settings", async (_event, newSettings: any) => {
  try {
    const userSettingsPath = path.join(app.getPath("userData"), "..", "atlas", "settings.json");
    const dir = path.dirname(userSettingsPath);
    await mkdir(dir, { recursive: true });
    
    let userSettings = {};
    if (await stat(userSettingsPath).catch(() => null)) {
      userSettings = JSON.parse(await readFile(userSettingsPath, "utf-8"));
    }
    
    userSettings = { ...userSettings, ...newSettings };
    await writeFile(userSettingsPath, JSON.stringify(userSettings, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to update settings:", err);
  }
});

// Global Search Data
ipcMain.handle("atlas:global-search", async (_event, repoPath: string, query: string, options: any) => {
  try {
    const { rgPath } = require("@vscode/ripgrep");
    const args = [
      "--json",
      "--ignore-case",
    ];

    if (options?.isRegex) args.push("--regexp", query);
    else args.push("--fixed-strings", query);
    
    if (options?.include) args.push("-g", options.include);
    if (options?.exclude) args.push("-g", "!" + options.exclude);
    
    // Default ignores
    args.push("-g", "!node_modules", "-g", "!.git");
    args.push(repoPath);

    return new Promise((resolve, reject) => {
      let stdout = "";
      let stderr = "";
      
      const child = cp.spawn(rgPath, args, { cwd: repoPath });

      child.stdout.on("data", (chunk: Buffer) => stdout += chunk.toString());
      child.stderr.on("data", (chunk: Buffer) => stderr += chunk.toString());

      child.on("close", (code: number | null) => {
        if (code !== 0 && code !== 1) { // 1 means no match in ripgrep
          return reject(new Error(`ripgrep exited with code ${code}: ${stderr}`));
        }

        const lines = stdout.split("\n").filter(Boolean);
        const results = [];
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === "match") {
              results.push({
                file: parsed.data.path.text,
                line: parsed.data.line_number,
                column: parsed.data.submatches[0]?.start,
                matchText: parsed.data.lines.text.trim(),
                submatches: parsed.data.submatches,
              });
            }
          } catch (e) {
            // ignore JSON parse errors for non-json output
          }
        }
        resolve(results);
      });
    });
  } catch (err) {
    console.error("Failed to perform global search:", err);
    return [];
  }
});

// Format Code
ipcMain.handle("atlas:format-code", async (_event, repoPath: string, filePath: string, content: string) => {
  try {
    // Try to resolve workspace prettier, fallback to our bundled one
    let prettier;
    try {
      const prettierPath = require.resolve("prettier", { paths: [repoPath] });
      prettier = require(prettierPath);
    } catch {
      prettier = require("prettier");
    }

    const options = await prettier.resolveConfig(filePath) || {};
    options.filepath = filePath;

    return await prettier.format(content, options);
  } catch (err) {
    console.error("Formatting failed:", err);
    return content; // Return unformatted on error
  }
});

// LSP Support
let activeLanguageServer: cp.ChildProcess | null = null;
let activeLanguageServerType: string | null = null;

ipcMain.handle("atlas:lsp-start", async (event, repoPath: string, language: string = "typescript") => {
  if (activeLanguageServerType === language && activeLanguageServer) {
    return "already_running";
  }
  if (activeLanguageServer) {
    activeLanguageServer.kill();
    activeLanguageServer = null;
  }
  activeLanguageServerType = language;

  try {
    if (language === "python") {
      activeLanguageServer = cp.spawn("npx", ["-y", "--package=pyright", "pyright-langserver", "--stdio"], { cwd: repoPath, shell: process.platform === "win32" });
    } else {
      let tsserverPath = require.resolve("typescript-language-server/lib/cli.mjs");
      if (tsserverPath.includes("app.asar")) {
        tsserverPath = tsserverPath.replace("app.asar", "app.asar.unpacked");
      }
      activeLanguageServer = cp.spawn("node", [tsserverPath, "--stdio"], { cwd: repoPath });
    }

    activeLanguageServer.stdout?.on("data", (data: Buffer) => {
      event.sender.send("atlas:lsp-server-to-client", data.toString("utf-8"));
    });

    activeLanguageServer.stderr?.on("data", (data: Buffer) => {
      console.error(`[LSP Server Error - ${language}]:`, data.toString("utf-8"));
    });

    activeLanguageServer.on("close", () => {
      if (activeLanguageServerType === language) {
        activeLanguageServer = null;
        activeLanguageServerType = null;
      }
    });

    return "started";
  } catch (err) {
    console.error(`Failed to start ${language} LSP:`, err);
    return "error";
  }
});

ipcMain.on("atlas:lsp-client-to-server", (_event, message: string) => {
  if (activeLanguageServer && activeLanguageServer.stdin) {
    activeLanguageServer.stdin.write(message);
  }
});

// DAP Support
let dapProcess: cp.ChildProcess | null = null;
let dapWs: WebSocket | null = null;
let dapSocket: any = null; // node:net.Socket
let dapPendingRequests = new Map<number, (res: any) => void>();
let latestCallFrames: any[] = [];
let dapProtocol: "cdp" | "dap" = "cdp";

ipcMain.handle("atlas:dap-start", async (event, filePath: string, language: string = "typescript") => {
  if (dapProcess) {
    return "already_running";
  }

  return new Promise((resolve) => {
    let isPython = language === "python" || filePath.endsWith(".py");
    dapProtocol = isPython ? "dap" : "cdp";

    if (isPython) {
      // Start debugpy for Python
      dapProcess = cp.spawn("python3", ["-m", "debugpy", "--listen", "0.0.0.0:5678", "--wait-for-client", filePath]);
      
      const nodeNet = require("node:net");
      let retries = 0;
      
      const tryConnect = () => {
        dapSocket = nodeNet.connect(5678, "127.0.0.1", () => {
          resolve("started");
          
          let buffer = "";
          dapSocket.on("data", (data: Buffer) => {
            buffer += data.toString("utf-8");
            while (true) {
              const match = buffer.match(/Content-Length:\s*(\d+)\r\n\r\n/);
              if (!match) break;
              const length = parseInt(match[1]!, 10);
              const headerLength = match[0].length;
              if (buffer.length < headerLength + length) break;
              
              const body = buffer.slice(headerLength, headerLength + length);
              buffer = buffer.slice(headerLength + length);
              
              try {
                const msg = JSON.parse(body);
                event.sender.send("atlas:dap-server-to-client", JSON.stringify(msg));
                if (msg.type === "response" && msg.request_seq) {
                   if (dapPendingRequests.has(msg.request_seq)) {
                     dapPendingRequests.get(msg.request_seq)!(msg);
                     dapPendingRequests.delete(msg.request_seq);
                   }
                }
              } catch (e) {
                console.error("Failed to parse DAP TCP message", e, body);
              }
            }
          });
        });
        
        dapSocket.on("error", (err: any) => {
          if (retries < 20 && dapProcess) {
            retries++;
            setTimeout(tryConnect, 500);
          } else {
            console.error("Failed to connect to debugpy:", err);
            resolve("error");
          }
        });

        dapSocket.on("close", () => {
          event.sender.send("atlas:dap-server-to-client", JSON.stringify({ type: "event", event: "terminated" }));
        });
      };
      
      setTimeout(tryConnect, 1000);
    } else {
      // Node.js inspector
      dapProcess = cp.spawn("node", ["--inspect-brk", filePath]);
      let resolved = false;

      dapProcess.stderr?.on("data", (data: Buffer) => {
        const output = data.toString("utf-8");
        const match = output.match(/ws:\/\/[^\s]+/);
        if (match && !resolved) {
          resolved = true;
          const wsUrl = match[0];
          dapWs = new WebSocket(wsUrl);
          
          dapWs.on("open", () => {
            resolve("started");
            let msgId = 9000;
            dapWs?.send(JSON.stringify({ id: msgId++, method: "Runtime.enable" }));
            dapWs?.send(JSON.stringify({ id: msgId++, method: "Debugger.enable" }));
            dapWs?.send(JSON.stringify({ id: msgId++, method: "Debugger.runIfWaitingForDebugger" }));
          });

          dapWs.on("message", (msg) => {
            const m = JSON.parse(msg.toString());
            if (m.method === "Debugger.paused") {
              latestCallFrames = m.params.callFrames || [];
              event.sender.send("atlas:dap-server-to-client", JSON.stringify({
                type: "event", event: "stopped", body: { reason: "pause", threadId: 1, allThreadsStopped: true }
              }));
            } else if (m.method === "Debugger.resumed") {
              event.sender.send("atlas:dap-server-to-client", JSON.stringify({
                type: "event", event: "continued", body: { threadId: 1, allThreadsContinued: true }
              }));
            }
            if (m.id && dapPendingRequests.has(m.id)) {
              dapPendingRequests.get(m.id)!(m);
              dapPendingRequests.delete(m.id);
            }
          });

          dapWs.on("close", () => {
            event.sender.send("atlas:dap-server-to-client", JSON.stringify({ type: "event", event: "terminated" }));
          });
        }
      });
    }

    dapProcess.on("close", () => {
      dapProcess = null;
      if (dapWs) { dapWs.close(); dapWs = null; }
      if (dapSocket) { dapSocket.destroy(); dapSocket = null; }
      event.sender.send("atlas:dap-server-to-client", JSON.stringify({ type: "event", event: "terminated" }));
    });
  });
});

ipcMain.on("atlas:dap-client-to-server", async (event, message: string) => {
  try {
    const msg = JSON.parse(message);
    const id = msg.seq;

    if (dapProtocol === "dap") {
      if (!dapSocket) return;
      const json = JSON.stringify(msg);
      const length = Buffer.byteLength(json, 'utf-8');
      dapSocket.write(`Content-Length: ${length}\r\n\r\n${json}`);
      return;
    }

    if (!dapWs) return;
    
    const sendDapResponse = (body: any) => {
      event.sender.send("atlas:dap-server-to-client", JSON.stringify({
        type: "response", request_seq: id, success: true, command: msg.command, body
      }));
    };

    const cdpSend = (method: string, params: any = {}) => {
      dapWs!.send(JSON.stringify({ id, method, params }));
      dapPendingRequests.set(id, (res) => sendDapResponse(res.result));
    };

    if (["initialize", "launch", "attach"].includes(msg.command)) {
      return sendDapResponse({});
    }

    switch (msg.command) {
      case "setBreakpoints":
        const url = msg.arguments.source.path;
        const line = msg.arguments.breakpoints[0]?.line;
        if (line !== undefined) {
          dapWs.send(JSON.stringify({ id, method: "Debugger.setBreakpointByUrl", params: {
             urlRegex: ".*" + path.basename(url).replace(/\./g, "\\."),
             lineNumber: line - 1
          }}));
          dapPendingRequests.set(id, () => sendDapResponse({ breakpoints: [{ verified: true, line }] }));
        } else {
          sendDapResponse({ breakpoints: [] });
        }
        break;
      case "continue": cdpSend("Debugger.resume"); break;
      case "next": cdpSend("Debugger.stepOver"); break;
      case "stepIn": cdpSend("Debugger.stepInto"); break;
      case "stepOut": cdpSend("Debugger.stepOut"); break;
      case "threads": sendDapResponse({ threads: [{ id: 1, name: "Main Thread" }] }); break;
      case "stackTrace":
        sendDapResponse({
          stackFrames: latestCallFrames.map((f: any, i: number) => ({
            id: i, name: f.functionName || "anonymous",
            source: { name: "script", path: f.url },
            line: f.location.lineNumber + 1, column: f.location.columnNumber + 1
          }))
        });
        break;
      case "scopes":
        const frame = latestCallFrames[msg.arguments.frameId];
        const scopes = frame?.scopeChain.map((s: any, i: number) => ({
          name: s.type, variablesReference: s.object.objectId, expensive: false
        })) || [];
        sendDapResponse({ scopes });
        break;
      case "variables":
        dapWs.send(JSON.stringify({ id, method: "Runtime.getProperties", params: { objectId: msg.arguments.variablesReference, ownProperties: true }}));
        dapPendingRequests.set(id, (res) => {
          const props = res.result?.result || [];
          sendDapResponse({
            variables: props.map((p: any) => ({
               name: p.name,
               value: p.value?.value !== undefined ? String(p.value.value) : p.value?.description ?? "undefined",
               variablesReference: p.value?.objectId ? p.value.objectId : 0
            }))
          });
        });
        break;
      case "disconnect":
        dapWs.close();
        if (dapProcess) dapProcess.kill();
        sendDapResponse({});
        break;
      default: sendDapResponse({});
    }
  } catch (e) {
    console.error("DAP proxy error", e);
  }
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

ipcMain.handle("atlas:apply-workspace-edit", async (_event, editsByFile: Record<string, any[]>) => {
  try {
    for (const [filePath, edits] of Object.entries(editsByFile)) {
      let content = "";
      try {
        content = await readFile(filePath, "utf-8");
      } catch (e) {
        continue;
      }
      
      edits.sort((a, b) => {
        if (a.range.start.line !== b.range.start.line) {
          return b.range.start.line - a.range.start.line;
        }
        return b.range.start.character - a.range.start.character;
      });

      const lines = content.split("\n");
      for (const edit of edits) {
        const startLine = edit.range.start.line;
        const startChar = edit.range.start.character;
        const endLine = edit.range.end.line;
        const endChar = edit.range.end.character;

        const before = lines[startLine]!.substring(0, startChar);
        const after = lines[endLine]!.substring(endChar);

        lines.splice(startLine, endLine - startLine + 1, before + edit.newText + after);
      }
      
      await writeFile(filePath, lines.join("\n"), "utf-8");
    }
    return true;
  } catch (err) {
    console.error("Failed to apply workspace edit:", err);
    return false;
  }
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

// Integrated Terminal - real PTY via node-pty (ANSI colors, interactive programs, real resize)
import type * as IPty from "node-pty";

ipcMain.handle("atlas:terminal-create", async (event, termId: string, cwd?: string) => {
  if (terminalProcesses.has(termId)) return { success: true };

  const targetCwd = cwd || global.__atlasRepoRoot || process.cwd();
  
  const settings = await getMergedSettings() as any;
  const isWin = process.platform === "win32";
  
  let shell = isWin
    ? (process.env["COMSPEC"] || "cmd.exe")
    : (process.env["SHELL"] || "/bin/bash");
    
  if (settings.terminalShell) {
    if (settings.terminalShell === "bash") shell = isWin ? "bash.exe" : "/bin/bash";
    else if (settings.terminalShell === "cmd") shell = isWin ? "cmd.exe" : shell;
    else if (settings.terminalShell === "powershell") shell = isWin ? "powershell.exe" : shell;
  }

  const pty = await import("node-pty");

  const proc = pty.spawn(shell, [], {
    name: "xterm-256color",
    cols: 80,
    rows: 24,
    cwd: targetCwd,
    env: process.env as Record<string, string>,
  });

  terminalProcesses.set(termId, proc);

  proc.onData((data: string) => {
    event.sender.send("atlas:terminal-data", { termId, data });
  });

  proc.onExit(() => {
    terminalProcesses.delete(termId);
  });

  return { success: true };
});

ipcMain.handle("atlas:terminal-input", async (_event, termId: string, data: string) => {
  const proc = terminalProcesses.get(termId);
  if (proc) {
    proc.write(data);
  }
});

ipcMain.handle("atlas:terminal-resize", async (_event, termId: string, cols: number, rows: number) => {
  const proc = terminalProcesses.get(termId);
  if (proc) {
    proc.resize(Math.max(1, cols), Math.max(1, rows));
  }
  return { success: true };
});

ipcMain.handle("atlas:clipboard-read", () => {
  return clipboard.readText();
});

ipcMain.handle("atlas:clipboard-write", (_event, text: string) => {
  clipboard.writeText(text);
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

ipcMain.handle("atlas:git-init", async (_event, repoPath: string) => {
  const cwd = repoPath || global.__atlasRepoRoot || process.cwd();
  await execFileAsync("git", ["init"], { cwd });
  return true;
});

ipcMain.handle("atlas:git-clone", async (_event, url: string, targetPath: string) => {
  await execFileAsync("git", ["clone", url, targetPath], { cwd: path.dirname(targetPath) });
  return true;
});

ipcMain.handle("atlas:git-stash-save", async (_event, repoPath: string, message?: string) => {
  const cwd = repoPath || global.__atlasRepoRoot || process.cwd();
  const args = message ? ["stash", "push", "-m", message] : ["stash"];
  await execFileAsync("git", args, { cwd });
  return true;
});

ipcMain.handle("atlas:git-stash-pop", async (_event, repoPath: string) => {
  const cwd = repoPath || global.__atlasRepoRoot || process.cwd();
  await execFileAsync("git", ["stash", "pop"], { cwd });
  return true;
});

ipcMain.handle("atlas:git-create-branch", async (_event, repoPath: string, branchName: string) => {
  const cwd = repoPath || global.__atlasRepoRoot || process.cwd();
  await execFileAsync("git", ["checkout", "-b", branchName], { cwd });
  return true;
});

ipcMain.handle("atlas:git-delete-branch", async (_event, repoPath: string, branchName: string) => {
  const cwd = repoPath || global.__atlasRepoRoot || process.cwd();
  await execFileAsync("git", ["branch", "-D", branchName], { cwd });
  return true;
});

ipcMain.handle("atlas:git-log", async (_event, repoPath: string, limit = 20) => {
  try {
    const cwd = repoPath || global.__atlasRepoRoot || process.cwd();
    const { stdout } = await execFileAsync("git", ["log", `-n${limit}`, "--pretty=format:%h|%an|%ar|%s"], { cwd });
    return stdout.split("\n").filter(Boolean).map(line => {
      const [hash, author, date, message] = line.split("|");
      return { hash, author, date, message };
    });
  } catch {
    return [];
  }
});

ipcMain.handle("atlas:git-blame", async (_event, repoPath: string, filePath: string) => {
  try {
    const cwd = repoPath || global.__atlasRepoRoot || process.cwd();
    const { stdout } = await execFileAsync("git", ["blame", "-s", filePath], { cwd });
    return stdout;
  } catch {
    return "";
  }
});

ipcMain.handle("atlas:git-blame-content", async (_event, repoPath: string, filePath: string, content: string) => {
  let tempPath = "";
  try {
    const cwd = repoPath || global.__atlasRepoRoot || process.cwd();
    tempPath = path.join(os.tmpdir(), `atlas-blame-${Date.now()}-${Math.floor(Math.random()*10000)}.tmp`);
    await writeFile(tempPath, content);
    const { stdout } = await execFileAsync("git", ["blame", "--contents", tempPath, filePath], { cwd });
    return stdout;
  } catch {
    return "";
  } finally {
    if (tempPath) {
      rm(tempPath, { force: true }).catch(() => {});
    }
  }
});

ipcMain.handle("atlas:git-diff-content", async (_event, repoPath: string, filePath: string, content: string) => {
  let tempPath = "";
  try {
    const cwd = repoPath || global.__atlasRepoRoot || process.cwd();
    tempPath = path.join(os.tmpdir(), `atlas-diff-${Date.now()}-${Math.floor(Math.random()*10000)}.tmp`);
    await writeFile(tempPath, content);
    const { stdout } = await execFileAsync("git", ["diff", "-U0", `HEAD:${filePath}`, tempPath], { cwd });
    return stdout;
  } catch (err: any) {
    // If diff fails, it might be because the file is not in HEAD (untracked), we can just return stdout if it exists
    if (err && err.stdout) {
       return err.stdout.toString();
    }
    return "";
  } finally {
    if (tempPath) {
      rm(tempPath, { force: true }).catch(() => {});
    }
  }
});

ipcMain.handle("atlas:git-stash-list", async (_event, repoPath: string) => {
  try {
    const cwd = repoPath || global.__atlasRepoRoot || process.cwd();
    const { stdout } = await execFileAsync("git", ["stash", "list", "--pretty=format:%gd: %s"], { cwd });
    return stdout.split("\n").filter(Boolean);
  } catch {
    return [];
  }
});

ipcMain.handle("atlas:scan-todos", async (_event, repoPath: string) => {
  try {
    const cwd = repoPath || global.__atlasRepoRoot || process.cwd();
    const { stdout } = await execFileAsync("git", [
      "grep", "-rn", "--count",
      "-e", "TODO", "-e", "FIXME", "-e", "HACK", "-e", "XXX",
      "--", ":!node_modules", ":!dist", ":!*.lock",
    ], { cwd });
    const total = stdout.split("\n").filter(Boolean).reduce((acc, line) => {
      const count = parseInt(line.split(":").pop() ?? "0", 10);
      return acc + (isNaN(count) ? 0 : count);
    }, 0);
    return { total };
  } catch {
    return { total: 0 };
  }
});



// Open repo (sets the active repo root)
ipcMain.handle("atlas:open-repo", async (_event, repoPath: string) => {
  global.__atlasRepoRoot = repoPath;
  global.__atlasWorkspaceRoots = [repoPath];
  return { success: true, repoPath };
});

ipcMain.handle("atlas:add-repo", async (_event, repoPath: string) => {
  if (!global.__atlasWorkspaceRoots) global.__atlasWorkspaceRoots = [];
  if (!global.__atlasWorkspaceRoots.includes(repoPath)) {
    global.__atlasWorkspaceRoots.push(repoPath);
  }
  return { success: true, repoPath };
});

// Agent run â€” delegates to agent runtime subprocess
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

// Generate real SBOM from workspace package.json files
ipcMain.handle("atlas:generate-sbom", async () => {
  const repoRoot = global.__atlasRepoRoot || process.cwd();
  const { readdir: rd, readFile: rf } = await import("node:fs/promises");
  const results: Array<{ path: string; content: Record<string, unknown> }> = [];

  // Scan packages/ and apps/ directories for package.json files
  const scanDirs = ["packages", "apps"].map(d => path.join(repoRoot, d));
  for (const dir of scanDirs) {
    try {
      const entries = await rd(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const pkgPath = path.join(dir, entry.name, "package.json");
        try {
          const raw = await rf(pkgPath, "utf-8");
          results.push({ path: pkgPath, content: JSON.parse(raw) });
        } catch { /* skip if no package.json */ }
      }
    } catch { /* skip if dir doesn't exist */ }
  }

  // Also include root package.json
  try {
    const rootPkg = path.join(repoRoot, "package.json");
    const raw = await rf(rootPkg, "utf-8");
    results.push({ path: rootPkg, content: JSON.parse(raw) });
  } catch { /* skip */ }

  const { SecurityAuditService } = await import("@atlas/core");
  return SecurityAuditService.generateSbom(results);
});

// List real installed extensions from ~/.atlas/extensions/
ipcMain.handle("atlas:list-extensions", async () => {
  const extDir = path.join(app.getPath("userData"), "..", "atlas", "extensions");
  try {
    const entries = await readdir(extDir, { withFileTypes: true });
    const manifests = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const mPath = path.join(extDir, entry.name, "manifest.json");
      try {
        const raw = await readFile(mPath, "utf-8");
        manifests.push({ dirName: entry.name, ...JSON.parse(raw) });
      } catch { /* skip malformed or missing manifest */ }
    }
    return manifests;
  } catch {
    return []; // Extensions directory doesn't exist yet — no extensions installed
  }
});

ipcMain.handle("atlas:extension-install", async (_event, sourcePath: string) => {
  const extDir = path.join(app.getPath("userData"), "..", "atlas", "extensions");
  const manifestPath = path.join(sourcePath, "manifest.json");
  
  try {
    const raw = await readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(raw);
    const targetPath = path.join(extDir, manifest.id || manifest.name);
    
    await mkdir(targetPath, { recursive: true });
    await fsCp(sourcePath, targetPath, { recursive: true });
    
    // Attempt to load it immediately
    await loadExtension(targetPath, manifest);
    return true;
  } catch (e) {
    console.error("[ExtensionRuntime] Failed to install extension:", e);
    throw e;
  }
});

ipcMain.handle("atlas:extension-execute-command", async (_event, id: string, ...args: any[]) => {
  const handler = extensionCommands.get(id);
  if (handler) {
    try {
      return await handler(...args);
    } catch (e) {
      console.error(`[ExtensionRuntime] Command ${id} failed:`, e);
      throw e;
    }
  } else {
    throw new Error(`Command not found in ExtensionRuntime: ${id}`);
  }
});

async function loadExtension(extPath: string, manifest: any) {
  if (!manifest.main) return; // No code to run
  
  const mainScriptPath = path.join(extPath, manifest.main);
  try {
    const code = await readFile(mainScriptPath, "utf-8");
    
    const sandbox = {
      console,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      atlas: {
        commands: {
          registerCommand: (id: string, handler: (...args: any[]) => any) => {
            extensionCommands.set(id, handler);
            // Notify frontend to add it to Command Palette
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("atlas:extension-registered-command", { id, label: id });
            }
          }
        }
      },
      require,
      module: { exports: {} as any },
      exports: {} as any
    };
    sandbox.exports = sandbox.module.exports;
    
    vm.createContext(sandbox);
    const script = new vm.Script(code, { filename: manifest.main });
    script.runInContext(sandbox);
    
    // Support exports.activate
    if (typeof sandbox.module.exports.activate === "function") {
      await sandbox.module.exports.activate(sandbox.atlas);
    } else if (typeof sandbox.exports.activate === "function") {
      await sandbox.exports.activate(sandbox.atlas);
    }
    console.log(`[ExtensionRuntime] Loaded extension: ${manifest.name}`);
  } catch (e) {
    console.error(`[ExtensionRuntime] Failed to load extension ${manifest.name}:`, e);
  }
}

// Auto-load installed extensions on startup
app.whenReady().then(async () => {
  const extDir = path.join(app.getPath("userData"), "..", "atlas", "extensions");
  try {
    const entries = await readdir(extDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const mPath = path.join(extDir, entry.name, "manifest.json");
      try {
        const raw = await readFile(mPath, "utf-8");
        await loadExtension(path.join(extDir, entry.name), JSON.parse(raw));
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
});



// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
// Window controls IPC
// ---------------------------------------------------------------------------
ipcMain.handle("window:minimize",     () => mainWindow?.minimize());
ipcMain.handle("window:maximize",     () => { if (mainWindow?.isMaximized()) mainWindow.unmaximize(); else mainWindow?.maximize(); });
ipcMain.handle("window:close",        () => mainWindow?.close());
ipcMain.handle("window:is-maximized", () => mainWindow?.isMaximized() ?? false);

ipcMain.handle("system:get-user-info", async () => {
  const os = await import("node:os");
  return {
    username: os.userInfo().username,
    homedir: os.homedir(),
    platform: process.platform,
    hostname: os.hostname(),
  };
});

ipcMain.handle("system:get-git-config", async (_event, repoPath?: string) => {
  const cwd = repoPath || process.cwd();
  try {
    const { stdout: name } = await execFileAsync("git", ["config", "user.name"], { cwd });
    const { stdout: email } = await execFileAsync("git", ["config", "user.email"], { cwd });
    return { name: name.trim(), email: email.trim() };
  } catch {
    const os = await import("node:os");
    const u = os.userInfo().username;
    return { name: u, email: `${u}@${os.hostname()}` };
  }
});

// ---------------------------------------------------------------------------
declare global {
  var __atlasRepoRoot: string | undefined;
  var __atlasWorkspaceRoots: string[] | undefined;
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


ipcMain.handle("atlas:scan-deps", async (_event, repoPath) => {
  try {
    const fs = require("fs");
    const path = require("path");
    const pkgPath = path.join(repoPath, "package.json");
    if (!fs.existsSync(pkgPath)) return { deps: 0, outdated: 0 };
    
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    const depsCount = Object.keys(pkg.dependencies || {}).length + Object.keys(pkg.devDependencies || {}).length;
    
    const { execSync } = require("child_process");
    try {
      const output = execSync('npm outdated --json', { cwd: repoPath, encoding: 'utf-8' });
      const outdated = JSON.parse(output);
      return { deps: depsCount, outdated: Object.keys(outdated).length };
    } catch (e: any) {
      // npm outdated exits with 1 if there are outdated deps
      if (e.stdout) {
        try {
          const outdated = JSON.parse(e.stdout);
          return { deps: depsCount, outdated: Object.keys(outdated).length };
        } catch (parseErr) { }
      }
      return { deps: depsCount, outdated: 0 };
    }
  } catch (e) {
    return { deps: 0, outdated: 0 };
  }
});
