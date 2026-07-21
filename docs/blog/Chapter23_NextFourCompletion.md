# Chapter 23: Next Four - LSP Completeness & Python DAP

In this sprint, we addressed the "Next Four" critical roadmap items to achieve feature parity with modern professional IDEs:

### 1. LSP Completeness (WorkspaceEdit Support)
- **The Problem:** The `monaco-languageclient` generated `WorkspaceEdit` objects during Code Actions and multi-file Renames (F2), but Monaco lacks physical file-system access, meaning edits were dropped silently.
- **The Solution:** Added a dedicated interceptor in `LSPClient.ts` that captures `workspace/applyEdit` requests. This groups all character-level text splices by file and bridges them to the main process via `atlas:apply-workspace-edit`.
- **The Backend:** `main.ts` now handles precise, reverse-sorted patching of lines and characters to safely rewrite source files on disk without offset skew.

### 2. Python Language & DAP Integration
- **LSP:** Configured the application to auto-spawn `pyright-langserver` over standard I/O streams using `npx`.
- **DAP:** Implemented a raw TCP socket bridge in `main.ts` for Python's `debugpy` (Debug Adapter Protocol). 
- Designed a custom stream parser to manually chunk `Content-Length` headers, bypassing the prior WebSocket-only CDP implementation to support native DAP servers.

### 3. Task Runner Activation
- Re-wired the Task Runner execution context in `App.tsx` to correctly target active terminal instances (`term-1`), resolving silent execution drops.
- Shell scripts and npm commands now open the bottom terminal drawer automatically upon execution.

### 4. Settings UI Enhancement
- Ensured all core preferences (Theme, Font Size, Tab Size, Auto Save, AI Model, Shell) are mapped to `SettingsPanel.tsx`.
- Integrated `Format On Save` into the Editor Behavior UI pane.

The source code package is updated and archived, marking this milestone 100% complete.
