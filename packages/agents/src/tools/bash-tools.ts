/**
 * @atlas/agents — Bash Tools
 *
 * Sandboxed command execution for agents.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import type { LLMToolDefinition } from "@atlas/core";

const execAsync = promisify(exec);

export async function runCommandTool(
  command: string,
  cwd: string,
  repoRoot: string,
  onCheckPermission?: (permission: string, data: any) => Promise<boolean>
): Promise<string> {
  const resolvedCwd = path.resolve(repoRoot, cwd);
  if (!resolvedCwd.startsWith(path.resolve(repoRoot))) {
    return `[Error: Path escapes repo root: ${cwd}]`;
  }

  if (onCheckPermission) {
    const granted = await onCheckPermission("workspace.execute", { command, cwd: resolvedCwd });
    if (!granted) {
      return `[Error: Permission denied to run command '${command}']`;
    }
  }

  try {
    const { stdout, stderr } = await execAsync(command, { cwd: resolvedCwd, timeout: 10000 });
    let output = "";
    if (stdout) output += `STDOUT:\n${stdout}\n`;
    if (stderr) output += `STDERR:\n${stderr}\n`;
    return output.trim() || "[Command completed successfully with no output]";
  } catch (error: any) {
    let output = `[Error executing command (Exit Code: ${error.code})]\n`;
    if (error.stdout) output += `STDOUT:\n${error.stdout}\n`;
    if (error.stderr) output += `STDERR:\n${error.stderr}\n`;
    return output.trim();
  }
}

export const BASH_TOOL_DEFINITIONS: LLMToolDefinition[] = [
  {
    name: "run_command",
    description:
      "Run a bash command in the terminal. Useful for running linters, tests, or build scripts to verify your changes.",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The command to run (e.g. 'npm run check', 'tsc --noEmit').",
        },
        cwd: {
          type: "string",
          description: "The directory to run the command in, relative to the repository root. Use '.' for the root.",
        },
      },
      required: ["command", "cwd"],
    },
  },
];
