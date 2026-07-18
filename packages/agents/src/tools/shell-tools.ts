/**
 * @atlas/agents — Shell Tools
 *
 * Sandboxed command execution for running tests.
 * Commands are restricted to the repo root and a whitelist of allowed programs.
 */

import { execa } from "execa";
import path from "node:path";
import type { LLMToolDefinition } from "@atlas/core";

// ---------------------------------------------------------------------------
// Allowed commands (whitelist)
// ---------------------------------------------------------------------------

const ALLOWED_COMMANDS = new Set([
  "npm",
  "npx",
  "pnpm",
  "yarn",
  "node",
  "jest",
  "vitest",
  "pytest",
  "python",
  "python3",
  "tsc",
  "ts-node",
  "mocha",
]);

function isCommandAllowed(command: string): boolean {
  const base = path.basename(command).replace(/\.exe$/i, "");
  return ALLOWED_COMMANDS.has(base);
}

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

export interface ShellToolResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export async function runCommandTool(
  command: string,
  args: string[],
  repoRoot: string,
  timeoutMs = 120_000
): Promise<ShellToolResult> {
  if (!isCommandAllowed(command)) {
    return {
      stdout: "",
      stderr: `Command not allowed: ${command}. Allowed commands: ${[...ALLOWED_COMMANDS].join(", ")}`,
      exitCode: 1,
      durationMs: 0,
    };
  }

  const start = Date.now();
  try {
    const result = await execa(command, args, {
      cwd: repoRoot,
      timeout: timeoutMs,
      reject: false,
      all: true,
    });
    return {
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      exitCode: result.exitCode ?? 0,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      stdout: "",
      stderr: err instanceof Error ? err.message : String(err),
      exitCode: 1,
      durationMs: Date.now() - start,
    };
  }
}

/**
 * Detect and run the repo's test suite.
 * Checks for common test commands in order of preference.
 */
export async function runTestsTool(
  repoRoot: string,
  testPattern?: string
): Promise<ShellToolResult> {
  const { existsSync } = await import("node:fs");
  const pkg = path.join(repoRoot, "package.json");

  if (existsSync(pkg)) {
    const { readFile } = await import("node:fs/promises");
    const content = JSON.parse(await readFile(pkg, "utf-8"));
    const scripts = content.scripts ?? {};

    if (scripts.test) {
      const args = testPattern ? ["test", "--", testPattern] : ["test"];
      return runCommandTool("npm", args, repoRoot);
    }
  }

  // Check for pytest
  const pytestResult = await runCommandTool(
    "python",
    ["-m", "pytest", "--tb=short", ...(testPattern ? [testPattern] : [])],
    repoRoot
  );
  return pytestResult;
}

// ---------------------------------------------------------------------------
// LLM tool definitions
// ---------------------------------------------------------------------------

export const SHELL_TOOL_DEFINITIONS: LLMToolDefinition[] = [
  {
    name: "run_tests",
    description:
      "Run the repository's test suite. Returns the test output including pass/fail counts and any error messages. Use this after making code changes to verify correctness.",
    parameters: {
      type: "object",
      properties: {
        test_pattern: {
          type: "string",
          description:
            "Optional pattern to filter which tests to run (e.g., 'auth', 'signup').",
        },
      },
      required: [],
    },
  },
  {
    name: "run_command",
    description:
      "Run a whitelisted command in the repository. Only use this when run_tests is insufficient.",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: `The command to run. Must be one of: ${[...ALLOWED_COMMANDS].join(", ")}`,
        },
        args: {
          type: "array",
          items: { type: "string" },
          description: "Command arguments.",
        },
      },
      required: ["command", "args"],
    },
  },
];
