# Chapter 59: Plugin System Consumption Wiring & Real Implementation

## Overview
This chapter details the completion of the Plugin System consumption layer as specified in `Atlas_Studio_Plugin_Next_Steps.md`.

## Key Implementations
1. **Consumption Wiring in `main.ts` & `PluginHost.ts`**:
   - Added `getRegisteredLanguage` method to `PluginHost` in `@atlas/core`.
   - Updated `handleStartLsp` in `main.ts` to query `pluginHost.getRegisteredLanguage(language)` before falling back to plain highlighting or default handlers.
   - Added `atlas:get-file-viewer` IPC handler in `main.ts` and exposed `getFileViewer` in `preload.ts`.

2. **Real Plugin Implementations**:
   - **`atlas-lang-typescript`**: Migrated real `typescript-language-server` child_process spawn logic into the plugin's `startLsp` implementation.
   - **`atlas-lang-python`**: Migrated real `pyright-langserver` child_process spawn logic into the plugin's `startLsp` implementation.
   - **`atlas-viewer-markdown`**: Installed `marked` parser dependency and implemented real markdown rendering from file path.

3. **UI Renderer Integration**:
   - Created `PluginViewerPane.tsx` component in `@atlas/editor` to render plugin-supported file previews and markdown HTML output seamlessly.
