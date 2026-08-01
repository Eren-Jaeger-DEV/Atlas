# Chapter 74 — Production-Grade Git Explorer Status & Badging Engine

## Overview

This chapter implements the **Real-Time Git Status & Badging Engine** inside Atlas Studio's File Explorer (`FileExplorer.tsx`), bringing full VS Code and Antigravity parity for repository file tree status indicators.

---

## 1. Features Implemented

### Real-Time Status Resolution & Propagation
- **`gitFileMap`**: Maps absolute file paths to exact Git status badges (`U`, `M`, `A`, `D`, `R`, `C`).
- **`gitDirSet`**: Ancestor folder path status bubbling. When any file inside a directory is modified or untracked, parent folders receive status dots (`•`) and status highlights.

### Status Badge Palette & Typography

| Status | Letter | Color | Description |
|---|---|---|---|
| **Untracked** | `U` | Emerald `#34d399` | New file created locally not yet in Git |
| **Modified** | `M` | Warm Amber `#fbbf24` | Existing tracked file with unsaved/uncommitted changes |
| **Added** | `A` | Mint Green `#4ade80` | File staged in Git (`git add`) |
| **Deleted** | `D` | Crimson `#f87171` | File deleted from repository |
| **Renamed** | `R` | Sky Blue `#38bdf8` | File renamed or moved |
| **Conflict** | `C` | Coral `#fb923c` | Unresolved Git merge conflict |

### Folder Indicator Dots (`•`)
- Directories containing uncommitted child files display a soft status indicator dot (`•`) next to the right margin with a subtle glowing halo (`boxShadow: "0 0 6px rgba(52, 211, 153, 0.4)"`).

---

## Files Changed

| File | Change |
|---|---|
| `apps/editor/src/components/FileExplorer.tsx` | Add `parseGitStatusKind`, `getGitBadgeDetails`, status map polling, and status row badging |
