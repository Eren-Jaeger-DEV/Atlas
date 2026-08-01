# Chapter 67 — Context Menus, Settings Completeness, and In-App Dialog Standardization

## Overview

This chapter completes the context menu coverage across all primary UI surfaces in Atlas Studio, fills remaining settings management gaps (Keybindings and Plugins/Permissions views), adds category reset capabilities, and replaces all remaining native browser `confirm()` dialog calls with glassmorphic `DialogProvider` modals.

---

## 1. Context Menus — 4/4 Primary UI Surfaces Wired

Prior to this chapter, `EditorPane.tsx` was the only surface with a full `useContextMenu()` implementation. Three key areas lacked context menu wiring.

### 1a. File Explorer Context Menu (`FileExplorer.tsx`)
Replaced the custom inline popover state with global `useContextMenu()` options:
- **Open** (for files)
- **New File Here...** / **New Folder Here...** (for directories)
- **Open in Terminal**
- **Rename**
- **Copy Path**
- **Delete** (now triggers `showDialog` instead of native `confirm()`)

### 1b. Editor Tab Context Menu (`App.tsx`)
Expanded tab right-click actions:
- **Close** / **Close Others** / **Close to the Right** / **Close Saved** / **Close All**
- **Copy Path** / **Copy Relative Path**
- **Reveal in Explorer**

### 1c. Integrated Terminal Context Menu (`TerminalPanel.tsx`)
Added right-click context menu to terminal canvas viewport & tab headers:
- **Copy** (enabled when selection exists) / **Paste**
- **Clear Terminal**
- **Kill Terminal**
- **New Terminal** / **Split Terminal**

### 1d. Source Control Panel Context Menu (`GitPanel.tsx`)
Added right-click context menu to staged & unstaged git file items:
- **Stage Changes** / **Unstage Changes**
- **Discard Changes** (triggers `showDialog` warning modal)
- **Open File**
- **Open Diff**

---

## 2. Settings Completeness & Management Polish

`SettingsPanel.tsx` was extended with two new main navigation categories:

1. **`Keybindings` Category** — Integrates the `KeybindingsPanel` component directly inside Settings so users can manage custom keyboard shortcuts in line with VS Code's settings model.
2. **`Plugins & Permissions` Category** — Lists all installed Atlas Forge plugins (fetched dynamically via `atlasAPI.listPlugins()`), shows active permission capability badges (`workspace.read`, `workspace.write`, `workspace.execute`, `network.outbound`), and includes a 1-click **Uninstall** action.
3. **Reset Category Defaults** — Header action button that resets all settings in the current category back to default values.

---

## 3. Native Dialog Elimination & In-App Standardization

Audited the codebase for native OS `window.confirm()`, `alert()`, or `prompt()` calls.
- **Replaced**: `FileExplorer.tsx` line 167 `confirm()` call swapped for `useDialog().showDialog({ type: "warning", title: "Delete File", ... })`.
- All user prompt dialogs in Atlas Studio now strictly render via glassmorphic React portals (`DialogProvider` and `QuickInputProvider`), preserving visual consistency.

---

## Files Changed

| File | Change |
|---|---|
| `apps/editor/src/components/FileExplorer.tsx` | Use `useContextMenu` & `useDialog`, remove native `confirm()` |
| `apps/editor/src/App.tsx` | Expand tab context menu (Close to Right, Close Saved, Copy Relative Path, Reveal) |
| `apps/editor/src/components/TerminalPanel.tsx` | Add right-click context menu on terminal viewport & session tabs |
| `apps/editor/src/components/GitPanel.tsx` | Add right-click context menu on git file items & discard confirmation |
| `apps/editor/src/components/SettingsPanel.tsx` | Add `Keybindings`, `Plugins & Permissions` categories & `Reset Category Defaults` |
