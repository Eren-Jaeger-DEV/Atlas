/**
 * @atlas/parser — File Indexer
 *
 * Walks a repository, parses every supported source file using tree-sitter,
 * and emits GraphNode[] and GraphEdge[] to be stored in the Memory Engine.
 *
 * This module has NO knowledge of the database layer — it just produces data.
 */

import { readFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { sha256 } from "js-sha256";
import fg from "fast-glob";
import TreeSitter from "tree-sitter";
import type { GraphNode, GraphEdge, NodeKind } from "@atlas/core";
import {
  getTypeScriptParser,
  getTSXParser,
  FUNCTION_QUERY,
  CLASS_QUERY,
  IMPORT_QUERY,
  TODO_QUERY,
} from "./languages/typescript.js";
import { getPythonParser } from "./languages/python.js";
import * as TSQueries from "./languages/typescript.js";
import * as PYQueries from "./languages/python.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface IndexerResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Files that failed to parse */
  errors: Array<{ filePath: string; error: string }>;
  /** Total files scanned */
  totalFiles: number;
  /** Time taken in ms */
  durationMs: number;
}

export interface IndexerOptions {
  /** Absolute path to the repository root */
  repoRoot: string;
  /** Progress callback — called for each file processed */
  onProgress?: (current: number, total: number, filePath: string) => void;
  /** File patterns to ignore (in addition to node_modules, dist) */
  ignore?: string[];
}

// ---------------------------------------------------------------------------
// Supported file extensions
// ---------------------------------------------------------------------------

const SUPPORTED_EXTENSIONS: Record<
  string,
  "typescript" | "tsx" | "javascript" | "python"
> = {
  ".ts": "typescript",
  ".tsx": "tsx",
  ".js": "javascript",
  ".mjs": "javascript",
  ".py": "python",
};

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

function makeNodeId(filePath: string, label: string, kind: NodeKind): string {
  return sha256(`${kind}:${filePath}:${label}`).slice(0, 24);
}

function makeEdgeId(fromId: string, kind: string, toId: string): string {
  return sha256(`${fromId}:${kind}:${toId}`).slice(0, 24);
}

// ---------------------------------------------------------------------------
// Per-file parsing
// ---------------------------------------------------------------------------

function resolveImportPath(
  baseDir: string,
  importSpecifier: string,
  repoRoot: string
): string | null {
  const WORKSPACE_PACKAGES: Record<string, string> = {
    "@atlas/core": "packages/core/src/index.ts",
    "@atlas/parser": "packages/parser/src/index.ts",
    "@atlas/graph": "packages/graph/src/index.ts",
    "@atlas/agents": "packages/agents/src/index.ts",
  };

  if (importSpecifier in WORKSPACE_PACKAGES) {
    return path.resolve(repoRoot, WORKSPACE_PACKAGES[importSpecifier]!).replace(/\\/g, "/");
  }

  if (!importSpecifier.startsWith(".")) {
    return null;
  }

  let absolutePath = path.resolve(baseDir, importSpecifier);
  const ext = path.extname(absolutePath);

  // If it ends with .js or .jsx, check for .ts/.tsx first
  if (ext === ".js" || ext === ".jsx") {
    const basePath = absolutePath.slice(0, -ext.length);
    for (const testExt of [".ts", ".tsx", ".d.ts", ext]) {
      const p = basePath + testExt;
      if (existsSync(p)) {
        return p.replace(/\\/g, "/");
      }
    }
  }

  // Check if target is a file or a directory
  if (existsSync(absolutePath)) {
    const stat = statSync(absolutePath);
    if (stat.isDirectory()) {
      for (const indexFile of ["index.ts", "index.tsx", "index.js", "index.jsx"]) {
        const p = path.join(absolutePath, indexFile);
        if (existsSync(p)) {
          return p.replace(/\\/g, "/");
        }
      }
    }
    return absolutePath.replace(/\\/g, "/");
  }

  // Try appending extensions for extensionless imports
  for (const testExt of [".ts", ".tsx", ".js", ".jsx", ".py"]) {
    const p = absolutePath + testExt;
    if (existsSync(p)) {
      return p.replace(/\\/g, "/");
    }
  }

  // Try index files for directory extensionless imports
  for (const indexFile of ["index.ts", "index.tsx", "index.js", "index.jsx"]) {
    const p = path.join(absolutePath, indexFile);
    if (existsSync(p)) {
      return p.replace(/\\/g, "/");
    }
  }

  return null;
}

interface ParsedFile {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Run a tree-sitter query using the TreeSitter.Query constructor.
 * This is the correct API for tree-sitter Node.js bindings.
 */
function runQuery(language: any, queryStr: string, tree: TreeSitter.Tree): any[] {
  try {
    const q = new TreeSitter.Query(language, queryStr);
    return q.matches(tree.rootNode);
  } catch {
    return [];
  }
}

async function parseFile(
  filePath: string,
  repoRoot: string
): Promise<ParsedFile> {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const now = Date.now();

  const content = await readFile(filePath, "utf-8");
  const ext = path.extname(filePath).toLowerCase();
  const lang = SUPPORTED_EXTENSIONS[ext];
  if (!lang) return { nodes: [], edges: [] };

  // Normalize path separators to forward slashes for cross-platform consistency
  const normalizedFilePath = filePath.replace(/\\/g, "/");

  // Create the file node
  const relPath = path.relative(repoRoot, filePath).replace(/\\/g, "/");
  const fileNodeId = makeNodeId(normalizedFilePath, relPath, "file");
  const fileNode: GraphNode = {
    id: fileNodeId,
    kind: "file",
    label: relPath,
    filePath: normalizedFilePath,
    indexedAt: now,
  };
  nodes.push(fileNode);

  // Get parser and language object
  let parser: TreeSitter;
  let language: any;
  let fnQuery: string;
  let classQuery: string;
  let importQuery: string;
  let todoQuery: string;

  if (lang === "python") {
    ({ parser, language } = await getPythonParser());
    fnQuery = PYQueries.FUNCTION_QUERY;
    classQuery = PYQueries.CLASS_QUERY;
    importQuery = PYQueries.IMPORT_QUERY;
    todoQuery = PYQueries.TODO_QUERY;
  } else {
    ({ parser, language } =
      lang === "tsx" ? await getTSXParser() : await getTypeScriptParser());
    fnQuery = TSQueries.FUNCTION_QUERY;
    classQuery = TSQueries.CLASS_QUERY;
    importQuery = TSQueries.IMPORT_QUERY;
    todoQuery = TSQueries.TODO_QUERY;
  }

  const tree = parser.parse(content);

  // --- Parse functions
  const fnMatches = runQuery(language, fnQuery, tree);
  for (const match of fnMatches) {
    const nameCapture = match.captures.find((c: any) =>
      c.name.endsWith(".name")
    );
    const nodeCapture = match.captures.find((c: any) =>
      c.name.endsWith(".node")
    );
    if (!nameCapture || !nodeCapture) continue;

    const fnName = nameCapture.node.text;
    const startLine = nodeCapture.node.startPosition.row + 1;
    const endLine = nodeCapture.node.endPosition.row + 1;
    const fnNodeId = makeNodeId(filePath, fnName, "function");

    nodes.push({
      id: fnNodeId,
      kind: "function",
      label: fnName,
      filePath,
      startLine,
      endLine,
      indexedAt: now,
    });

    edges.push({
      id: makeEdgeId(fileNodeId, "contains", fnNodeId),
      kind: "contains",
      fromId: fileNodeId,
      toId: fnNodeId,
      createdAt: now,
    });
  }

  // --- Parse classes
  const classMatches = runQuery(language, classQuery, tree);
  for (const match of classMatches) {
    const nameCapture = match.captures.find((c: any) =>
      c.name.endsWith(".name")
    );
    const nodeCapture = match.captures.find((c: any) =>
      c.name.endsWith(".node")
    );
    if (!nameCapture || !nodeCapture) continue;

    const className = nameCapture.node.text;
    const startLine = nodeCapture.node.startPosition.row + 1;
    const endLine = nodeCapture.node.endPosition.row + 1;
    const classNodeId = makeNodeId(filePath, className, "class");

    nodes.push({
      id: classNodeId,
      kind: "class",
      label: className,
      filePath,
      startLine,
      endLine,
      indexedAt: now,
    });

    edges.push({
      id: makeEdgeId(fileNodeId, "contains", classNodeId),
      kind: "contains",
      fromId: fileNodeId,
      toId: classNodeId,
      createdAt: now,
    });
  }

  // --- Parse imports → creates "imports" edges between file nodes
  const importMatches = runQuery(language, importQuery, tree);
  for (const match of importMatches) {
    const sourceCapture = match.captures.find((c: any) =>
      c.name.endsWith(".source")
    );
    if (!sourceCapture) continue;

    const rawSource = sourceCapture.node.text.replace(/['"]/g, "");
    if (!rawSource) continue;

    // Resolve workspace package or relative path to actual file on disk
    const resolvedPath = resolveImportPath(path.dirname(filePath), rawSource, repoRoot);
    if (!resolvedPath) continue;

    const targetRelPath = path.relative(repoRoot, resolvedPath).replace(/\\/g, "/");
    const targetNodeId = makeNodeId(resolvedPath, targetRelPath, "file");

    edges.push({
      id: makeEdgeId(fileNodeId, "imports", targetNodeId),
      kind: "imports",
      fromId: fileNodeId,
      toId: targetNodeId,
      createdAt: now,
      meta: { importSpecifier: rawSource },
    });
  }

  // --- Parse TODO/FIXME comments
  const todoMatches = runQuery(language, todoQuery, tree);
  for (const match of todoMatches) {
    const commentCapture = match.captures.find(
      (c: any) => c.name === "comment"
    );
    if (!commentCapture) continue;

    const text = commentCapture.node.text;
    if (!/TODO|FIXME|HACK|XXX/i.test(text)) continue;

    const line = commentCapture.node.startPosition.row + 1;
    const todoId = makeNodeId(filePath, `todo:${line}`, "todo");

    nodes.push({
      id: todoId,
      kind: "todo",
      label: text.replace(/^\/\/\s*/, "").trim(),
      filePath,
      startLine: line,
      endLine: line,
      indexedAt: now,
    });

    edges.push({
      id: makeEdgeId(fileNodeId, "contains", todoId),
      kind: "contains",
      fromId: fileNodeId,
      toId: todoId,
      createdAt: now,
    });
  }

  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// Main indexer
// ---------------------------------------------------------------------------

export async function indexRepository(
  options: IndexerOptions
): Promise<IndexerResult> {
  const { repoRoot, onProgress, ignore = [] } = options;
  const startTime = Date.now();

  // Gather all supported files
  const patterns = Object.keys(SUPPORTED_EXTENSIONS).map(
    (ext) => `**/*${ext}`
  );

  const files = await fg(patterns, {
    cwd: repoRoot,
    absolute: true,
    ignore: [
      "**/node_modules/**",
      "**/dist/**",
      "**/electron-dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.git/**",
      "**/.turbo/**",
      ...ignore,
    ],
  });

  const allNodes: GraphNode[] = [];
  const allEdges: GraphEdge[] = [];
  const errors: Array<{ filePath: string; error: string }> = [];

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i]!;
    onProgress?.(i + 1, files.length, filePath);

    try {
      const { nodes, edges } = await parseFile(filePath, repoRoot);
      allNodes.push(...nodes);
      allEdges.push(...edges);
    } catch (err) {
      errors.push({
        filePath,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    nodes: allNodes,
    edges: allEdges,
    errors,
    totalFiles: files.length,
    durationMs: Date.now() - startTime,
  };
}
