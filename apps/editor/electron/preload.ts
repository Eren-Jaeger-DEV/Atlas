/**
 * Electron Preload Script
 *
 * Exposes a safe, typed API to the renderer process via contextBridge.
 * The renderer ONLY gets what is explicitly listed here — no full Node access.
 */

import { contextBridge, ipcRenderer } from "electron";
import type { ImpactResult, GraphNode, OrchestratorEvent, RunRecord } from "@atlas/core";

contextBridge.exposeInMainWorld("atlasAPI", {
  // Memory / graph
  impact: (filePath: string, symbolName?: string): Promise<ImpactResult> =>
    ipcRenderer.invoke("atlas:impact", filePath, symbolName),

  search: (query: string): Promise<GraphNode[]> =>
    ipcRenderer.invoke("atlas:search", query),

  // Repo & Workspace management
  openRepo: (repoPath: string) =>
    ipcRenderer.invoke("atlas:open-repo", repoPath),

  selectDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke("atlas:select-directory"),

  // File Operations
  readDir: (dirPath: string): Promise<Array<{ name: string; path: string; isDirectory: boolean }>> =>
    ipcRenderer.invoke("atlas:read-dir", dirPath),

  readFile: (filePath: string): Promise<string> =>
    ipcRenderer.invoke("atlas:read-file", filePath),

  writeFile: (filePath: string, content: string): Promise<void> =>
    ipcRenderer.invoke("atlas:write-file", filePath, content),

  createFile: (filePath: string, isDirectory: boolean): Promise<void> =>
    ipcRenderer.invoke("atlas:create-file", filePath, isDirectory),

  deleteFile: (filePath: string): Promise<void> =>
    ipcRenderer.invoke("atlas:delete-file", filePath),

  renameFile: (oldPath: string, newPath: string): Promise<void> =>
    ipcRenderer.invoke("atlas:rename-file", oldPath, newPath),

  // Integrated Terminal
  terminalCreate: (termId: string, cwd?: string) =>
    ipcRenderer.invoke("atlas:terminal-create", termId, cwd),

  terminalInput: (termId: string, data: string) =>
    ipcRenderer.invoke("atlas:terminal-input", termId, data),

  terminalResize: (termId: string, cols: number, rows: number) =>
    ipcRenderer.invoke("atlas:terminal-resize", termId, cols, rows),

  onTerminalData: (handler: (data: { termId: string; data: string }) => void) => {
    const listener = (_ipcEvent: unknown, payload: { termId: string; data: string }) => handler(payload);
    ipcRenderer.on("atlas:terminal-data", listener);
    return () => ipcRenderer.removeListener("atlas:terminal-data", listener);
  },

  // Git Source Control
  gitStatus: (repoPath: string): Promise<Array<{ path: string; status: string; staged: boolean }>> =>
    ipcRenderer.invoke("atlas:git-status", repoPath),

  gitStage: (repoPath: string, filePath: string): Promise<void> =>
    ipcRenderer.invoke("atlas:git-stage", repoPath, filePath),

  gitUnstage: (repoPath: string, filePath: string): Promise<void> =>
    ipcRenderer.invoke("atlas:git-unstage", repoPath, filePath),

  gitCommit: (repoPath: string, message: string): Promise<void> =>
    ipcRenderer.invoke("atlas:git-commit", repoPath, message),

  gitDiff: (repoPath: string, filePath: string, staged: boolean): Promise<string> =>
    ipcRenderer.invoke("atlas:git-diff", repoPath, filePath, staged),

  // Agent run
  run: (goal: string): Promise<RunRecord> =>
    ipcRenderer.invoke("atlas:run", goal),

  // Event streaming from agent runs
  onEvent: (handler: (event: OrchestratorEvent) => void) => {
    ipcRenderer.on("atlas:event", (_ipcEvent, event) => handler(event));
    return () => ipcRenderer.removeAllListeners("atlas:event");
  },

  // Native menu action bridge
  onMenuAction: (handler: (action: string) => void) => {
    const channels = [
      "menu:open-folder", "menu:new-file", "menu:save", "menu:save-all",
      "menu:close-tab", "menu:find", "menu:replace", "menu:select-all",
      "menu:command-palette", "menu:show-explorer", "menu:show-git",
      "menu:show-impact", "menu:toggle-ai-sidebar", "menu:open-settings",
      "menu:goto-file", "menu:goto-line", "menu:goto-symbol",
      "menu:go-back", "menu:go-forward", "menu:run-agent", "menu:stop-agent",
      "menu:toggle-terminal", "menu:new-terminal", "menu:split-terminal",
      "menu:kill-terminal", "menu:show-about",
    ];
    const listeners: Array<() => void> = channels.map((ch) => {
      const fn = () => handler(ch);
      ipcRenderer.on(ch, fn);
      return () => ipcRenderer.removeListener(ch, fn);
    });
    return () => listeners.forEach((off) => off());
  },
});

