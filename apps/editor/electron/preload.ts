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

  // Repo management
  openRepo: (repoPath: string) =>
    ipcRenderer.invoke("atlas:open-repo", repoPath),

  // Agent run
  run: (goal: string): Promise<RunRecord> =>
    ipcRenderer.invoke("atlas:run", goal),

  // Event streaming from agent runs
  onEvent: (handler: (event: OrchestratorEvent) => void) => {
    ipcRenderer.on("atlas:event", (_ipcEvent, event) => handler(event));
    return () => ipcRenderer.removeAllListeners("atlas:event");
  },
});
