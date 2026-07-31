/**
 * File System IPC Handlers
 */

import { ipcMain, dialog } from "electron";
import path from "node:path";
import { readdir, readFile, writeFile, mkdir, rm, rename, copyFile as fsCopyFile } from "node:fs/promises";
import fs from "node:fs";

export function registerFsIPCHandlers(getProjectRoot: () => string) {
  ipcMain.handle("atlas:read-dir", async (_event, dirPath: string) => {
    try {
      const entries = await readdir(dirPath, { withFileTypes: true });
      return entries.map((entry) => ({
        name: entry.name,
        path: path.join(dirPath, entry.name),
        isDirectory: entry.isDirectory(),
      }));
    } catch {
      return [];
    }
  });

  ipcMain.handle("atlas:read-file", async (_event, filePath: string) => {
    try {
      return await readFile(filePath, "utf-8");
    } catch (e: any) {
      throw new Error(`Failed to read file '${filePath}': ${e.message}`);
    }
  });

  ipcMain.handle("atlas:write-file", async (_event, filePath: string, content: string) => {
    try {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, content, "utf-8");
    } catch (e: any) {
      throw new Error(`Failed to write file '${filePath}': ${e.message}`);
    }
  });

  ipcMain.handle("atlas:create-file", async (_event, filePath: string, isDirectory: boolean) => {
    try {
      if (isDirectory) {
        await mkdir(filePath, { recursive: true });
      } else {
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, "", "utf-8");
      }
    } catch (e: any) {
      throw new Error(`Failed to create '${filePath}': ${e.message}`);
    }
  });

  ipcMain.handle("atlas:delete-file", async (_event, filePath: string) => {
    try {
      await rm(filePath, { recursive: true, force: true });
    } catch (e: any) {
      throw new Error(`Failed to delete '${filePath}': ${e.message}`);
    }
  });

  ipcMain.handle("atlas:rename-file", async (_event, oldPath: string, newPath: string) => {
    try {
      await rename(oldPath, newPath);
    } catch (e: any) {
      throw new Error(`Failed to rename '${oldPath}' -> '${newPath}': ${e.message}`);
    }
  });

  ipcMain.handle("atlas:copy-file", async (_event, srcPath: string, destPath: string) => {
    try {
      await mkdir(path.dirname(destPath), { recursive: true });
      await fsCopyFile(srcPath, destPath);
    } catch (e: any) {
      throw new Error(`Failed to copy '${srcPath}' -> '${destPath}': ${e.message}`);
    }
  });

  ipcMain.handle("atlas:move-file", async (_event, srcPath: string, destPath: string) => {
    try {
      await mkdir(path.dirname(destPath), { recursive: true });
      await rename(srcPath, destPath);
    } catch (e: any) {
      throw new Error(`Failed to move '${srcPath}' -> '${destPath}': ${e.message}`);
    }
  });

  ipcMain.handle("atlas:get-snippets", async () => {
    const root = getProjectRoot();
    if (!root) return {};
    const snippetsPath = path.join(root, ".atlas", "snippets.json");
    try {
      if (fs.existsSync(snippetsPath)) {
        return JSON.parse(await readFile(snippetsPath, "utf-8"));
      }
    } catch {
      /* ignore */
    }
    return {};
  });

  ipcMain.handle("atlas:select-directory", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const selectedPath = (result.filePaths[0] || "").replace(/\\/g, "/");
    if (selectedPath) {
      (global as any).__atlasRepoRoot = selectedPath;
      (global as any).__atlasWorkspaceRoots = [selectedPath];
    }
    return selectedPath;
  });

  ipcMain.handle("atlas:open-file-dialog", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0] || null;
  });

  ipcMain.handle("atlas:save-file-as-dialog", async (_event, defaultPath?: string) => {
    const dialogOpts: any = {};
    if (defaultPath) dialogOpts.defaultPath = defaultPath;
    const result = await dialog.showSaveDialog(dialogOpts);
    if (result.canceled || !result.filePath) return null;
    return result.filePath;
  });
}
