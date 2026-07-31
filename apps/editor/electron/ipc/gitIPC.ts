/**
 * Git Source Control IPC Handlers
 */

import { ipcMain } from "electron";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function registerGitIPCHandlers() {
  ipcMain.handle("atlas:git-status", async (_event, repoPath: string) => {
    try {
      const { stdout } = await execFileAsync("git", ["status", "--porcelain"], { cwd: repoPath });
      const lines = stdout.split("\n").filter(Boolean);
      return lines.map((line) => {
        const stagedCode = line.substring(0, 1);
        const unstagedCode = line.substring(1, 2);
        const filePath = line.substring(3).trim();
        const staged = stagedCode !== " " && stagedCode !== "?";
        const statusCode = staged ? stagedCode : unstagedCode;
        return { path: filePath, status: statusCode, staged };
      });
    } catch {
      return [];
    }
  });

  ipcMain.handle("atlas:git-stage", async (_event, repoPath: string, filePath: string) => {
    await execFileAsync("git", ["add", filePath], { cwd: repoPath });
  });

  ipcMain.handle("atlas:git-unstage", async (_event, repoPath: string, filePath: string) => {
    await execFileAsync("git", ["restore", "--staged", filePath], { cwd: repoPath });
  });

  ipcMain.handle("atlas:git-commit", async (_event, repoPath: string, message: string) => {
    await execFileAsync("git", ["commit", "-m", message], { cwd: repoPath });
  });

  ipcMain.handle("atlas:git-diff", async (_event, repoPath: string, filePath: string, staged: boolean) => {
    try {
      const args = staged ? ["diff", "--cached", filePath] : ["diff", filePath];
      const { stdout } = await execFileAsync("git", args, { cwd: repoPath });
      return stdout;
    } catch {
      return "";
    }
  });

  ipcMain.handle("atlas:git-blame", async (_event, repoPath: string, filePath: string) => {
    try {
      const { stdout } = await execFileAsync("git", ["blame", "--porcelain", filePath], { cwd: repoPath });
      return stdout;
    } catch {
      return "";
    }
  });

  ipcMain.handle("atlas:git-init", async (_event, repoPath: string) => {
    try {
      await execFileAsync("git", ["init"], { cwd: repoPath });
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle("atlas:git-clone", async (_event, url: string, targetPath: string) => {
    try {
      await execFileAsync("git", ["clone", url, targetPath]);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle("atlas:git-log", async (_event, repoPath: string, limit = 20) => {
    try {
      const { stdout } = await execFileAsync("git", ["log", `-n${limit}`, "--pretty=format:%H|%an|%ad|%s"], { cwd: repoPath });
      return stdout.split("\n").filter(Boolean).map((line) => {
        const [hash, author, date, message] = line.split("|");
        return { hash: hash || "", author: author || "", date: date || "", message: message || "" };
      });
    } catch {
      return [];
    }
  });

  ipcMain.handle("atlas:git-stash-list", async (_event, repoPath: string) => {
    try {
      const { stdout } = await execFileAsync("git", ["stash", "list"], { cwd: repoPath });
      return stdout.split("\n").filter(Boolean);
    } catch {
      return [];
    }
  });
}
