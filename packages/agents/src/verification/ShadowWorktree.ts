/**
 * @atlas/agents — ShadowWorktree
 *
 * Isolated Git Worktree Sandbox Engine.
 *
 * When the AI proposes complex multi-file changes, it stages them into an
 * isolated git worktree, runs validation commands (build, lint, tests), and
 * collects the pass/fail results — WITHOUT touching the user's main working
 * tree. Only after a clean verify run does the caller decide to accept the changes.
 *
 * Completely original Atlas implementation — not based on OpenHands or any other project.
 * Uses only the standard `git worktree` subcommand which ships with every git installation.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ShadowCommandStatus = "pass" | "fail" | "skipped";

export interface ShadowCommand {
  /** Display label shown in the UI */
  label: string;
  /** Executable, e.g. "pnpm" */
  cmd: string;
  /** Arguments, e.g. ["build"] */
  args: string[];
  /** Optional working directory relative to worktree root */
  cwd?: string;
  /** If true, a failure won't abort subsequent commands */
  allowFailure?: boolean;
}

export interface ShadowCommandResult {
  label: string;
  status: ShadowCommandStatus;
  durationMs: number;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export interface ShadowFileChange {
  /** Relative path within the worktree (e.g. "src/components/Foo.tsx") */
  relativePath: string;
  /** New file content to write. If null, the file is deleted. */
  content: string | null;
}

export interface ShadowVerifyOptions {
  /** Path to the git repository root */
  repoPath: string;
  /** Branch name for the shadow worktree (auto-generated if omitted) */
  shadowBranchName?: string;
  /** File changes to stage into the worktree before running commands */
  changes: ShadowFileChange[];
  /** Validation commands to run in order */
  commands: ShadowCommand[];
  /** Timeout per command in milliseconds. Default: 120_000 (2 min) */
  commandTimeoutMs?: number;
}

export interface ShadowVerifyResult {
  /** Unique ID for this shadow run */
  runId: string;
  /** ISO timestamp when the run started */
  startedAt: string;
  /** ISO timestamp when the run finished */
  finishedAt: string;
  /** Total duration */
  totalDurationMs: number;
  /** Whether ALL non-allowFailure commands passed */
  overallPass: boolean;
  /** Per-command results */
  commandResults: ShadowCommandResult[];
  /** The shadow branch name that was created */
  shadowBranch: string;
  /** Path on disk of the worktree (cleaned up after run) */
  worktreePath: string;
  /** Any infrastructure-level error (worktree setup failed, etc.) */
  infrastructureError?: string;
}

// ---------------------------------------------------------------------------
// ShadowWorktree engine
// ---------------------------------------------------------------------------

export class ShadowWorktree {
  /**
   * Create an isolated git worktree, apply file changes, run all commands, then clean up.
   * Returns a structured verification report.
   */
  public async verify(options: ShadowVerifyOptions): Promise<ShadowVerifyResult> {
    const {
      repoPath,
      changes,
      commands,
      commandTimeoutMs = 120_000,
    } = options;

    const runId = `shadow-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const startedAt = new Date().toISOString();
    const start = performance.now();

    const shadowBranch = options.shadowBranchName ?? `atlas/shadow/${runId}`;
    const worktreePath = path.join(os.tmpdir(), runId);

    const baseResult: Omit<ShadowVerifyResult, "finishedAt" | "totalDurationMs" | "overallPass" | "commandResults"> = {
      runId,
      startedAt,
      shadowBranch,
      worktreePath,
    };

    // --------------- Step 1: Create shadow worktree ---------------------------
    try {
      await execFileAsync("git", [
        "worktree", "add", "--detach", worktreePath,
      ], { cwd: repoPath });
    } catch (err) {
      return this.buildErrorResult(baseResult, start, commands, `Failed to create git worktree: ${String(err)}`);
    }

    // --------------- Step 2: Apply file changes ------------------------------
    try {
      for (const change of changes) {
        const targetPath = path.join(worktreePath, change.relativePath);
        if (change.content === null) {
          await rm(targetPath, { force: true });
        } else {
          await mkdir(path.dirname(targetPath), { recursive: true });
          await writeFile(targetPath, change.content, "utf8");
        }
      }
    } catch (err) {
      await this.cleanupWorktree(repoPath, worktreePath);
      return this.buildErrorResult(baseResult, start, commands, `Failed to apply file changes to shadow worktree: ${String(err)}`);
    }

    // --------------- Step 3: Run validation commands -------------------------
    const commandResults: ShadowCommandResult[] = [];
    let abortEarly = false;

    for (const cmd of commands) {
      if (abortEarly) {
        commandResults.push({ label: cmd.label, status: "skipped", durationMs: 0, stdout: "", stderr: "", exitCode: null });
        continue;
      }

      const cmdStart = performance.now();
      let result: ShadowCommandResult;

      try {
        const cwd = cmd.cwd ? path.join(worktreePath, cmd.cwd) : worktreePath;
        const { stdout, stderr } = await this.runWithTimeout(
          cmd.cmd,
          cmd.args,
          cwd,
          commandTimeoutMs
        );
        result = {
          label: cmd.label,
          status: "pass",
          durationMs: performance.now() - cmdStart,
          stdout: stdout.slice(0, 4000),
          stderr: stderr.slice(0, 2000),
          exitCode: 0,
        };
      } catch (err: any) {
        const exitCode: number | null = typeof err.code === "number" ? err.code : null;
        result = {
          label: cmd.label,
          status: "fail",
          durationMs: performance.now() - cmdStart,
          stdout: (err.stdout ?? "").slice(0, 4000),
          stderr: (err.stderr ?? String(err)).slice(0, 2000),
          exitCode,
        };
        if (!cmd.allowFailure) {
          abortEarly = true;
        }
      }

      commandResults.push(result);
    }

    // --------------- Step 4: Cleanup -----------------------------------------
    await this.cleanupWorktree(repoPath, worktreePath);

    const finishedAt = new Date().toISOString();
    const totalDurationMs = performance.now() - start;
    const overallPass = commandResults.every((r) => r.status !== "fail");

    return {
      ...baseResult,
      finishedAt,
      totalDurationMs,
      overallPass,
      commandResults,
    };
  }

  // ---------------------------------------------------------------------------
  private async runWithTimeout(cmd: string, args: string[], cwd: string, timeoutMs: number): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Command timed out after ${timeoutMs}ms: ${cmd} ${args.join(" ")}`));
      }, timeoutMs);

      execFile(cmd, args, { cwd, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
        clearTimeout(timer);
        if (err) {
          const enriched: any = err;
          enriched.stdout = stdout;
          enriched.stderr = stderr;
          reject(enriched);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }

  private async cleanupWorktree(repoPath: string, worktreePath: string): Promise<void> {
    try {
      await execFileAsync("git", ["worktree", "remove", "--force", worktreePath], { cwd: repoPath });
    } catch {
      // Worktree might already be gone — ignore
    }
    try {
      await rm(worktreePath, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  }

  private buildErrorResult(
    base: Omit<ShadowVerifyResult, "finishedAt" | "totalDurationMs" | "overallPass" | "commandResults">,
    start: number,
    commands: ShadowCommand[],
    error: string
  ): ShadowVerifyResult {
    return {
      ...base,
      finishedAt: new Date().toISOString(),
      totalDurationMs: performance.now() - start,
      overallPass: false,
      commandResults: commands.map((c) => ({ label: c.label, status: "skipped", durationMs: 0, stdout: "", stderr: "", exitCode: null })),
      infrastructureError: error,
    };
  }
}

/** Singleton export for use across the IDE */
export const shadowWorktree = new ShadowWorktree();

// ---------------------------------------------------------------------------
// Default verification command preset for Atlas monorepo
// ---------------------------------------------------------------------------

export const ATLAS_DEFAULT_SHADOW_COMMANDS: ShadowCommand[] = [
  { label: "Install dependencies",     cmd: "pnpm", args: ["install", "--frozen-lockfile"], allowFailure: true },
  { label: "TypeScript type-check",    cmd: "pnpm", args: ["--filter", "@atlas/editor", "typecheck"] },
  { label: "Build core packages",      cmd: "pnpm", args: ["--filter", "@atlas/core", "build"], allowFailure: true },
  { label: "Build agents package",     cmd: "pnpm", args: ["--filter", "@atlas/agents", "build"], allowFailure: true },
  { label: "Run unit tests",           cmd: "pnpm", args: ["test", "--passWithNoTests"], allowFailure: true },
];
