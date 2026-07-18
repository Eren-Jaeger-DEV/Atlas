# Atlas Studio Development Log — Chapter 7: Custom Frameless Window & Single-Bar UI Parity

This chapter documents the UI refactoring of **Atlas Studio** to achieve true design parity with modern IDEs like VS Code and Cursor, utilizing a single-line frameless header, custom window controls, and integrated dropdown navigation menus.

---

## 1. Design & Layout Goals

1. **Eliminate Dual Header Space**: Remove native OS window title bars to reclaim vertical space.
2. **Unified Control Header**: Merge title bar, workspace name display, top menu system, layout toggles, and window controls into a single 30px row.
3. **Interactive Top Navigation**: Provide functional dropdown menus (`File`, `Edit`, `Selection`, `View`, `Go`, `Run`, `Terminal`, `Help`) with keyboard shortcuts and mouse hover dynamics.

---

## 2. Technical Architecture & Implementation

### A. Frameless Electron Window (`electron/main.ts`)
- Configured Electron `BrowserWindow` with `frame: false` and `autoHideMenuBar: true`.
- Added IPC handlers for window lifecycle actions:
  - `window:minimize`
  - `window:maximize`
  - `window:close`
  - `window:is-maximized`

### B. IPC Bridge (`electron/preload.ts`)
Exposed secure window control methods via `atlasAPI`:
```ts
windowMinimize:    () => ipcRenderer.invoke("window:minimize"),
windowMaximize:    () => ipcRenderer.invoke("window:maximize"),
windowClose:       () => ipcRenderer.invoke("window:close"),
windowIsMaximized: (): Promise<boolean> => ipcRenderer.invoke("window:is-maximized")
```

### C. Drag Region Partitioning (`App.tsx`)
- Applied `-webkit-app-region: drag` to the main `<header>` container to allow window moving by dragging anywhere on empty space.
- Applied `-webkit-app-region: no-drag` to interactive child elements (menu buttons, search bar, window controls, and layout toggles) so click and hover events work smoothly.

### D. Interactive Dropdown Menus
- Built React-based stateful menu system (`openMenu` state, `useRef` outside-click handler).
- Integrated quick action triggers:
  - `File > Open Workspace Folder` -> Directory selection dialog.
  - `File > Save` / `Save All` -> File save routines over Electron IPC.
  - `View > Command Palette` -> Toggles command palette overlay.
  - `View > Explorer / Source Control / Impact / AI` -> Switches active sidebar.
  - `Terminal > New Terminal` -> Opens bottom dock terminal.

---

## 3. Verification & Build Confirmation

- **TypeScript Compilation**: `pnpm --filter @atlas/editor build` compiles cleanly with 0 errors.
- **Standalone Packaging**: Production build output verified at `apps/editor/dist-app/win-unpacked/AtlasStudio.exe`.
- **UI Aesthetics**: Compact single-line header with dark theme palette (`#09090b` / `#141417` / `#27272a`).