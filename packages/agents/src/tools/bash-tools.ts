/**
 * @atlas/agents — Bash Tools
 *
 * Sandboxed command execution for agents. Commands are gated by
 * WorkspaceTrustPolicy before execution, and wrapped by SandboxWrapper
 * for platform-native OS-level isolation (macOS sandbox-exec / Linux bwrap).
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import type { LLMToolDefinition } from "@atlas/core";
import { WorkspaceTrustPolicy, SandboxWrapper } from "@atlas/core";

const execAsync = promisify(exec);

export async function runCommandTool(
  command: string,
  cwd: string,
  repoRoot: string,
  onCheckPermission?: (permission: string, data: any) => Promise<boolean>,
  workspaceTrust?: WorkspaceTrustPolicy,
  onOutput?: (chunk: string) => void
): Promise<string> {
  const resolvedCwd = path.resolve(repoRoot, cwd);
  if (!resolvedCwd.startsWith(path.resolve(repoRoot))) {
    return `[Error: Path escapes repo root: ${cwd}]`;
  }

  // Trust gate: block execution if workspace is not in TRUSTED state
  if (workspaceTrust && !workspaceTrust.isCommandExecutionAllowed()) {
    return `[Error: Command execution blocked — workspace trust status is '${workspaceTrust.getTrustStatus()}'. Set workspace to TRUSTED to allow agent commands.]`;
  }

  if (onCheckPermission) {
    const granted = await onCheckPermission("workspace.execute", { command, cwd: resolvedCwd });
    if (!granted) {
      return `[Error: Permission denied to run command '${command}']`;
    }
  }

  // Wrap the command with platform-native sandbox isolation
  const sandboxedCommand = SandboxWrapper.wrapCommand(command, { repoPath: repoRoot });

  return new Promise((resolve) => {
    const child = exec(sandboxedCommand, { cwd: resolvedCwd, timeout: 60000 });
    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      const str = data.toString();
      stdout += str;
      onOutput?.(str);
    });

    child.stderr?.on("data", (data) => {
      const str = data.toString();
      stderr += str;
      onOutput?.(str);
    });

    child.on("close", (code) => {
      if (code === 0) {
        let output = "";
        if (stdout) output += `STDOUT:\n${stdout}\n`;
        if (stderr) output += `STDERR:\n${stderr}\n`;
        resolve(output.trim() || "[Command completed successfully with no output]");
      } else {
        let output = `[Error executing command (Exit Code: ${code})]\n`;
        if (stdout) output += `STDOUT:\n${stdout}\n`;
        if (stderr) output += `STDERR:\n${stderr}\n`;
        resolve(output.trim());
      }
    });

    child.on("error", (err) => {
      resolve(`[Error executing command: ${err.message}]`);
    });
  });
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
