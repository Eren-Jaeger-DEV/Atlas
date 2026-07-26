# Chapter 49: Workspace Resolution and Electron Main Process Synchronization

## Overview
In this chapter, we resolved a critical synchronization and workspace resolution bug where the AI Sidebar in the editor displayed `Error: No active workspace` when attempting to send messages or run inline actions.

## Root Cause Analysis
1. **Stale Main Process Bundle**: When changes were made to `apps/editor/electron/main.ts`, the compiled output in `apps/editor/electron-dist/main.js` was not automatically re-compiled during `pnpm dev` invocations. This resulted in the Electron main process executing stale `getProjectRoot()` and `atlas:run` handlers that returned `{ error: "No active workspace" }`.
2. **Workspace Root Resolution**: In the updated implementation of `getProjectRoot()`, we ensured that if `global.__atlasRepoRoot` is unset, the engine checks `global.__atlasWorkspaceRoots[0]`, and finally falls back cleanly to `process.cwd()`, guaranteeing a valid repository root path for the Language Server Protocol and AI Agent runtime.
3. **Automated Main Process Build in Dev Script**: We updated `apps/editor/package.json` so that `"dev"` runs `tsc -p tsconfig.electron.json` before concurrently launching Vite and Electron. This ensures `electron-dist/main.js` is always synchronized with the TypeScript source.

## Verification
- Compiled `apps/editor/electron/main.ts` cleanly using `tsc -p tsconfig.electron.json` with zero errors.
- Verified that `electron-dist/main.js` contains the updated `getProjectRoot()` fallback logic and never returns `undefined`.
- Verified that `atlas:run` in `electron-dist/main.js` defaults to `process.cwd()` when no workspace root is explicitly set, eliminating the "No active workspace" error.
