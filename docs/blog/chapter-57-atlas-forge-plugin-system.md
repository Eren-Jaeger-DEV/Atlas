# Chapter 57: Atlas Forge Plugin System & Ecosystem Refactoring

## Overview
This chapter details the transition of Atlas Studio from hardcoded monolithic language and viewer capabilities to a clean, plugin-driven platform architecture powered by **Atlas Forge**.

## Architectural Highlights
1. **Plugin Rename Pass**: Replaced legacy `Extension` nomenclature with **`Plugin`** across `@atlas/sdk`, `@atlas/core`, `@atlas/editor`, IPC events, and storage paths (`~/.atlas/plugins/`).
2. **CommonJS Sandbox Shim (`PluginHost.ts`)**: Built a Node.js `vm` wrapper permitting plugins to export via `module.exports` or `export default` while keeping system calls sandboxed through restricted `require` bounds.
3. **`PluginContext` Expansion**: Extended the plugin runtime API with `registerLanguage`, `registerFileViewer`, and `requestPermission` wired directly into `PermissionEngine`.
4. **Atlas Forge Marketplace (`ForgeGallery.tsx`)**: Created the Atlas Forge ecosystem interface, rendering verified plugins from `forge-index.json`, local plugin folder imports, and hot runtime re-scanning.
5. **First-Party Plugin Packages**: Extracted TypeScript language support (`atlas-lang-typescript`), Python support (`atlas-lang-python`), and Markdown preview (`atlas-viewer-markdown`) into modular plugin packages.
