/**
 * @atlas/agents — Filesystem Tools
 *
 * Sandboxed file system operations. All paths are validated against
 * the repo root — agents cannot read/write outside the workspace.
 */

import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createPatch } from "diff";
import type { LLMToolDefinition } from "@atlas/core";

// ---------------------------------------------------------------------------
// Sandbox validation
// ---------------------------------------------------------------------------

export function validatePath(filePath: string, repoRoot: string): string {
  const resolved = path.resolve(repoRoot, filePath);
  if (!resolved.startsWith(path.resolve(repoRoot))) {
    throw new Error(`Path escapes repo root: ${filePath}`);
  }
  return resolved;
}

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

export async function readFileTool(
  filePath: string,
  repoRoot: string
): Promise<string> {
  const resolved = validatePath(filePath, repoRoot);
  try {
    return await readFile(resolved, "utf-8");
  } catch {
    return `[Error: file not found at ${filePath}]`;
  }
}

export async function writeFileTool(
  filePath: string,
  content: string,
  repoRoot: string,
  onCheckPermission?: (permission: string, data: any) => Promise<boolean>
): Promise<string> {
  const resolved = validatePath(filePath, repoRoot);
  if (onCheckPermission) {
    const granted = await onCheckPermission("workspace.write", { filePath, proposedCode: content });
    if (!granted) throw new Error("Permission denied by user.");
  }
  await writeFile(resolved, content, "utf-8");
  return `Written: ${filePath}`;
}

export async function listDirectoryTool(
  dirPath: string,
  repoRoot: string
): Promise<string> {
  const resolved = validatePath(dirPath, repoRoot);
  try {
    const entries = await readdir(resolved, { withFileTypes: true });
    return entries
      .map((e) => `${e.isDirectory() ? "dir" : "file"} ${e.name}`)
      .join("\n");
  } catch {
    return `[Error: directory not found at ${dirPath}]`;
  }
}

export async function multiReplaceFileContentTool(
  filePath: string,
  chunks: Array<{ targetContent: string; replacementContent: string }>,
  repoRoot: string,
  onCheckPermission?: (permission: string, data: any) => Promise<boolean>
): Promise<string> {
  const resolved = validatePath(filePath, repoRoot);
  const content = await readFile(resolved, "utf-8");
  let newContent = content;

  for (const chunk of chunks) {
    if (!newContent.includes(chunk.targetContent)) {
      throw new Error(`Target content not found in file: ${chunk.targetContent}`);
    }
    // Replace the exact chunk
    newContent = newContent.replace(chunk.targetContent, chunk.replacementContent);
  }

  if (onCheckPermission) {
    const granted = await onCheckPermission("workspace.write", { filePath, proposedCode: newContent });
    if (!granted) throw new Error("Permission denied by user.");
  }

  await writeFile(resolved, newContent, "utf-8");
  return `Successfully replaced ${chunks.length} block(s) in ${filePath}`;
}

export async function applyDiffTool(
  filePath: string,
  originalContent: string,
  newContent: string,
  repoRoot: string,
  onCheckPermission?: (permission: string, data: any) => Promise<boolean>
): Promise<string> {
  const resolved = validatePath(filePath, repoRoot);
  if (onCheckPermission) {
    const granted = await onCheckPermission("workspace.write", { filePath, proposedCode: newContent });
    if (!granted) throw new Error("Permission denied by user.");
  }
  await writeFile(resolved, newContent, "utf-8");
  const diff = createPatch(filePath, originalContent, newContent);
  return diff;
}

export async function fileExistsTool(
  filePath: string,
  repoRoot: string
): Promise<boolean> {
  const resolved = validatePath(filePath, repoRoot);
  return existsSync(resolved);
}

// ---------------------------------------------------------------------------
// LLM tool definitions (Zod-compatible JSON Schema)
// ---------------------------------------------------------------------------

export const FS_TOOL_DEFINITIONS: LLMToolDefinition[] = [
  {
    name: "read_file",
    description:
      "Read the full content of a file in the repository. Use this to understand existing code before making changes.",
    parameters: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the file, relative to the repository root.",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "write_file",
    description:
      "Write content to a file. This replaces the entire file content. Prefer this over patching for new files.",
    parameters: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the file, relative to the repository root.",
        },
        content: {
          type: "string",
          description: "The complete new content of the file.",
        },
      },
      required: ["file_path", "content"],
    },
  },
  {
    name: "list_directory",
    description: "List files and subdirectories in a directory.",
    parameters: {
      type: "object",
      properties: {
        dir_path: {
          type: "string",
          description:
            "Path to the directory, relative to the repository root. Use '.' for the root.",
        },
      },
      required: ["dir_path"],
    },
  },
  {
    name: "multi_replace_file_content",
    description:
      "Edit an existing file by making targeted replacements. This is the preferred way to edit code.",
    parameters: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the file, relative to the repository root.",
        },
        chunks: {
          type: "array",
          description: "List of targeted replacements to make in the file.",
          items: {
            type: "object",
            properties: {
              targetContent: {
                type: "string",
                description: "The exact character sequence to replace, including whitespaces.",
              },
              replacementContent: {
                type: "string",
                description: "The new content to replace it with.",
              },
            },
            required: ["targetContent", "replacementContent"],
          },
        },
      },
      required: ["file_path", "chunks"],
    },
  },
];
