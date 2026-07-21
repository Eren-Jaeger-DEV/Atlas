# Chapter 20: Multi-root Workspaces

## The Challenge
Supporting monorepos and cross-project development in a single editor instance requires robust multi-root workspace support. Previously, Atlas Studio relied on a singular `global.__atlasRepoRoot`, limiting users to one project directory per window.

## The Solution
We transitioned the backend and frontend architecture to handle multiple active workspace roots simultaneously:

1. **State Migration**: Replaced the single `repoPath` fallback in `apps/editor/electron/main.ts` with `global.__atlasWorkspaceRoots`. 
2. **IPC Expansion**: Added `atlas:add-directory` and `atlas:add-repo` IPC endpoints, allowing users to append new directories to their workspace session without discarding the existing state.
3. **Frontend Overhaul**: Rebuilt the `FileExplorer.tsx` tree generation logic. Instead of fetching the children of a single repo immediately, the explorer now treats each workspace root as a top-level node, enabling seamless browsing across multiple disparate directories.
4. **Action Integration**: Exposed "Add Folder to Workspace..." through the native file menu, the command palette, and the File Explorer UI to ensure a frictionless user experience.

## The Impact
Atlas Studio now rivals VS Code's project management capability, providing a unified interface for complex environments like monorepos, microservices, and interdependent libraries. The architectural shift from single-root to multi-root establishes the foundation for future workspace-wide features like global search and cross-project dependency graphs.
