# Chapter 66 — Lazy Plugin Activation, Boot Sequence Deferral, and Forge Auto-Suggest

## Overview

This chapter implements a production-grade lazy plugin activation system for Atlas Studio, directly modelled after VS Code's `activationEvents` architecture. The goal was simple: make Atlas feel instant at startup regardless of how many extensions are installed — and turn unsupported file types from a dead-end into a discovery moment.

---

## The Problem with Eager Activation

Prior to this chapter, `autoLoadExtensions()` in `main.ts` ran a sequential `for` loop over every installed extension and called `loadExtension()` on each one at startup. This meant:

- Every plugin's code executed before or alongside the window appearing
- A user with 10 extensions installed would wait 10x as long for the UI to paint
- There was no concept of "this plugin is only needed when a .py file opens" — everything loaded everything, always

---

## Section 1 — `activationEvents` Manifest Field

The `PluginManifest` interface in both `@atlas/sdk` and `@atlas/core` now includes:

```ts
activationEvents?: Array<
  | "*"
  | "onStartupFinished"
  | `onLanguage:${string}`
  | `onCommand:${string}`
  | `onView:${string}`
>;
```

Using VS Code's exact vocabulary means plugin authors coming from VS Code need zero learning curve. All three built-in plugins were updated:

| Plugin | Events |
|---|---|
| `atlas-lang-typescript` | `onLanguage:typescript`, `onLanguage:javascript`, `onCommand:typescript.restartLsp` |
| `atlas-lang-python` | `onLanguage:python`, `onCommand:python.runFile` |
| `atlas-viewer-markdown` | `onLanguage:markdown`, `onCommand:markdown.openPreview` |

If a plugin omits `activationEvents`, it defaults to `["onStartupFinished"]` — a safe, non-blocking fallback.

---

## Section 2 — Two-Phase `PluginHost`

`packages/core/src/services/PluginHost.ts` gained four new public methods and one critical private guard:

**Phase 1 — Discovery (no activation)**
```ts
discoverFromManifest(id: string, activationEvents: string[]): void
```
Stores manifest metadata. The plugin's `activate()` function is never called here.

**Phase 2a — Startup plugins**
```ts
activateStartupPlugins(): Promise<void>
```
Runs only plugins declaring `*` or `onStartupFinished`. Called once, after the window is already visible.

**Phase 2b — On-demand triggers**
```ts
activateForLanguage(languageId: string): Promise<void>
activateForCommand(commandId: string): Promise<void>
activateForView(viewId: string): Promise<void>
```
Each scans `discoveredManifests` for matching events and activates only what's needed.

**In-flight concurrency guard**

Opening 5 `.py` files in quick succession used to risk activating the Python plugin 5 times in parallel. The new `_activateOnce()` method uses a `Map<string, Promise<void>>` to deduplicate:

```ts
private _activateOnce(id: string): Promise<void> {
  if (this.activePlugins.has(id)) return Promise.resolve();
  const inflight = this.activatingPlugins.get(id);
  if (inflight) return inflight;
  const p = this.activatePlugin(id).finally(() => this.activatingPlugins.delete(id));
  this.activatingPlugins.set(id, p);
  return p;
}
```

---

## Section 3 — Boot Sequence Deferral

`main.ts` was refactored from a single `autoLoadExtensions()` function into a proper two-phase runtime:

```
discoverExtensions()          <- reads manifests, builds discoveredPlugins map, zero activation
activateStartupExtensions()   <- activates only * / onStartupFinished plugins, after window is visible
activateExtensionsForLanguage() <- called via IPC atlas:activate-for-language
activateExtensionsForCommand()  <- called via IPC atlas:activate-for-command
```

The window `createWindow()` call is untouched — it still runs first. Only after the window is painted and the 500ms idle timer fires does any plugin code execute.

Three new IPC handlers wire the renderer to the main process:
- `atlas:activate-for-language` — fired from `openFile()` in App.tsx every time a file is opened
- `atlas:activate-for-command` — available for command palette integrations
- `atlas:check-forge-for-extension` — Section 4 registry query

---

## Section 4 — Forge Auto-Suggest for Unsupported Files

When a user opens a file that `determineLanguage()` classifies as `"plaintext"` (no installed plugin recognises the extension), Atlas now:

1. Calls `atlas:check-forge-for-extension` with the file extension
2. The main process checks the per-session `suggestedExtensions` Set (no repeat toasts)
3. Queries the Forge `forge-index.json` registry for a matching plugin
4. If found, fires back to the renderer which shows a `NotificationProvider` toast:

> "No support installed for .rs files."  
> [ Install Rust Language Support ]

The Install action calls the existing `installPlugin()` flow — no new install logic required.

---

## Additional Fixes

- **`EditorTab.tabType`** — Added `"plugin-viewer"` to the union and `usePluginViewer?: boolean` to the interface. These were pre-existing TypeScript errors at lines 2574 and 2604 of `App.tsx` where the plugin viewer pane was rendered.
- **`ToastBannerManager`** — Removed hardcoded mock toasts ("Smart Model Active", "Workspace Trusted") that violated the no-hardcoded-data rule. Component now starts empty and only shows real dynamically-injected toasts.

---

## Files Changed

| File | Change |
|---|---|
| `packages/sdk/src/types.ts` | Add `activationEvents` to `PluginManifest` |
| `packages/core/src/types/plugin.ts` | Add `activationEvents` to `PluginManifest` |
| `packages/core/src/services/PluginHost.ts` | Two-phase model, in-flight guard, 4 new methods |
| `packages/plugins/*/plugin.json` | All 3 plugins updated with `activationEvents` |
| `apps/editor/electron/main.ts` | Two-phase runtime, 3 new IPC handlers |
| `apps/editor/electron/preload.ts` | Bridge `activateForLanguage`, `activateForCommand`, `checkForgeForExtension` |
| `apps/editor/src/App.tsx` | Wire lazy triggers + Forge auto-suggest into `openFile` |
| `apps/editor/src/types/atlas.d.ts` | Type declarations for 3 new IPC methods |
| `apps/editor/src/hooks/useWorkspaceTabs.ts` | Fix `EditorTab.tabType` union + `usePluginViewer` field |
| `apps/editor/src/components/ToastBannerManager.tsx` | Remove hardcoded mock toasts |
