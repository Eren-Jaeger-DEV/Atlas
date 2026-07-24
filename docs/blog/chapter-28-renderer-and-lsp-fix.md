# Chapter 28: Resolving Monaco Theme Tokenization & LSP IPC Registration

**Date:** July 24, 2026  
**Module:** `@atlas/editor` (`EditorPane.tsx` & `apps/editor/electron/main.ts`)  
**Status:** Completed & Re-Packaged  

---

## Executive Summary

When running the compiled `atlas-studio` binary, two runtime errors occurred:
1. **Monaco Token Color Error (`Illegal value for token color: var(...)`):** Monaco's internal theme engine (`monaco.editor.defineTheme`) expects strict hex colors (`#e4e4e7`, `#38bdf8`) rather than CSS `var()` strings.
2. **Missing LSP IPC Handler (`No handler registered for 'atlas:lsp-start'`):** `main.ts` registered `"atlas:start-lsp"`, whereas `preload.ts` invoked `"atlas:lsp-start"`.

---

## Technical Fixes

1. **Fixed Theme Colors (`EditorPane.tsx`):**
   Replaced all `var(--text-main, #e4e4e7)` and `var(--accent, #38bdf8)` strings in Monaco's `defineTheme` colors map with valid hex literals (`#e4e4e7` and `#38bdf8`).
2. **IPC Channel Aliasing (`main.ts`):**
   Bound `handleStartLsp` to both `"atlas:lsp-start"` and `"atlas:start-lsp"`.

---

## Verification & Package Re-Build

- **Typecheck:** `cd apps/editor && npx tsc --noEmit` $\implies$ **0 errors**.
- **Build:** Compiled Vite production bundle cleanly.
- **Installer:** Generated fresh, verified `.deb` package at `apps/editor/dist-app/atlas-studio-0.1.0-amd64.deb` (215MB).
