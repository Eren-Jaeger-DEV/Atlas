/**
 * Electron Preload Script
 *
 * Exposes a safe, typed API to the renderer process via contextBridge.
 * The renderer ONLY gets what is explicitly listed here â€” no full Node access.
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

  // Clipboard
  clipboardReadText: (): Promise<string> =>
    ipcRenderer.invoke("atlas:clipboard-read"),
  
  clipboardWriteText: (text: string): Promise<void> =>
    ipcRenderer.invoke("atlas:clipboard-write", text),

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

  gitInit: (repoPath: string): Promise<boolean> =>
    ipcRenderer.invoke("atlas:git-init", repoPath),

  gitClone: (url: string, targetPath: string): Promise<boolean> =>
    ipcRenderer.invoke("atlas:git-clone", url, targetPath),

  gitStashSave: (repoPath: string, message?: string): Promise<boolean> =>
    ipcRenderer.invoke("atlas:git-stash-save", repoPath, message),

  gitStashPop: (repoPath: string): Promise<boolean> =>
    ipcRenderer.invoke("atlas:git-stash-pop", repoPath),

  gitCreateBranch: (repoPath: string, branchName: string): Promise<boolean> =>
    ipcRenderer.invoke("atlas:git-create-branch", repoPath, branchName),

  gitDeleteBranch: (repoPath: string, branchName: string): Promise<boolean> =>
    ipcRenderer.invoke("atlas:git-delete-branch", repoPath, branchName),

  gitLog: (repoPath: string, limit?: number): Promise<Array<{ hash: string; author: string; date: string; message: string }>> =>
    ipcRenderer.invoke("atlas:git-log", repoPath, limit),

  gitBlame: (repoPath: string, filePath: string): Promise<string> =>
    ipcRenderer.invoke("atlas:git-blame", repoPath, filePath),

  // Agent run
  run: (goal: string): Promise<RunRecord> =>
    ipcRenderer.invoke("atlas:run", goal),

  // Event streaming from agent runs
  onEvent: (handler: (event: OrchestratorEvent) => void) => {
    ipcRenderer.on("atlas:event", (_ipcEvent, event) => handler(event));
    return () => ipcRenderer.removeAllListeners("atlas:event");
  },

  // Window controls
  windowMinimize:    () => ipcRenderer.invoke("window:minimize"),
  windowMaximize:    () => ipcRenderer.invoke("window:maximize"),
  windowClose:       () => ipcRenderer.invoke("window:close"),
  windowIsMaximized: (): Promise<boolean> => ipcRenderer.invoke("window:is-maximized"),
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

  // System Info & Git Config
  getSystemUserInfo: (): Promise<{ username: string; homedir: string; platform: string; hostname: string }> =>
    ipcRenderer.invoke("system:get-user-info"),

  getGitConfig: (repoPath?: string): Promise<{ name: string; email: string }> =>
    ipcRenderer.invoke("system:get-git-config", repoPath),

  // Stash list
  gitStashList: (repoPath: string): Promise<string[]> =>
    ipcRenderer.invoke("atlas:git-stash-list", repoPath),

  // TODO/FIXME scanner
  scanTodos: (repoPath: string): Promise<{ total: number }> =>
    ipcRenderer.invoke("atlas:scan-todos", repoPath),

  // Extension listing
  listExtensions: (): Promise<Record<string, unknown>[]> =>
    ipcRenderer.invoke("atlas:list-extensions"),

  installExtension: (sourcePath: string): Promise<boolean> =>
    ipcRenderer.invoke("atlas:extension-install", sourcePath),

  executeExtensionCommand: (id: string, ...args: any[]): Promise<any> =>
    ipcRenderer.invoke("atlas:extension-execute-command", id, ...args),

  onExtensionRegisteredCommand: (handler: (payload: { id: string, label: string }) => void) => {
    const listener = (_ipcEvent: any, payload: { id: string, label: string }) => handler(payload);
    ipcRenderer.on("atlas:extension-registered-command", listener);
    return () => ipcRenderer.off("atlas:extension-registered-command", listener);
  },

  // SBOM generation
  generateSbom: (): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke("atlas:generate-sbom"),

  // Permissions
  grantPermission: (extensionId: string, permissions: string[]): Promise<void> =>
    ipcRenderer.invoke("atlas:grant-permission", extensionId, permissions),

  revokePermission: (extensionId: string): Promise<void> =>
    ipcRenderer.invoke("atlas:revoke-permission", extensionId),

  // AI
  inlineAgentAction: (action: string, text: string): Promise<string> =>
    ipcRenderer.invoke("atlas:agent-inline-action", action, text),

  // Graph Data
  getGraphData: (repoPath: string): Promise<{ nodes: any[], edges: any[] }> =>
    ipcRenderer.invoke("atlas:get-graph-data", repoPath),

  // Search
  globalSearch: (repoPath: string, query: string, options?: any): Promise<any[]> =>
    ipcRenderer.invoke("atlas:global-search", repoPath, query, options),

  // Formatting
  formatCode: (repoPath: string, filePath: string, content: string): Promise<string> =>
    ipcRenderer.invoke("atlas:format-code", repoPath, filePath, content),

  // LSP
  startLsp: (repoPath: string) =>
    ipcRenderer.invoke("atlas:lsp-start", repoPath),
  sendLspMessage: (message: string) =>
    ipcRenderer.send("atlas:lsp-client-to-server", message),
  onLspMessage: (handler: (event: any, message: string) => void) => {
    ipcRenderer.on("atlas:lsp-server-to-client", handler);
    return () => ipcRenderer.off("atlas:lsp-server-to-client", handler);
  },

  // DAP
  startDap: (filePath: string) =>
    ipcRenderer.invoke("atlas:dap-start", filePath),
  sendDapMessage: (message: string) =>
    ipcRenderer.send("atlas:dap-client-to-server", message),
  onDapMessage: (handler: (event: any, message: string) => void) => {
    ipcRenderer.on("atlas:dap-server-to-client", handler);
    return () => ipcRenderer.off("atlas:dap-server-to-client", handler);
  },
});
