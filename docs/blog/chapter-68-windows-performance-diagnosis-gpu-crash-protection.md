# Chapter 68 — Windows Performance Diagnosis, GPU Crash Protection & Memory Leak Optimization

## Overview

This chapter addresses performance issues reported by Windows users (high CPU consumption, frozen UI, and blank screen crashes). A deep empirical diagnosis identified three primary causes across the Electron main process and React renderer, and resolved each root cause.

---

## 1. Diagnostic Findings & Root Cause Analysis

### Cause A — `useWorkspaceTabs.ts` Auto-Save State Churn Loop
- **Problem**: `tabs` was included directly in the `useEffect` dependency array for the auto-save `setInterval` timer (running every 1500ms). When `setTabs` was called to update `isDirty: false` after auto-saving, `tabs` changed, destroying and re-creating the timer and triggering a continuous re-render loop that consumed high CPU and kept disk IO active constantly.
- **Fix**: Refactored the auto-save effect to read from a stable `tabsRef`. Increased interval to 3000ms and removed `tabs` from the dependency array, eliminating the re-render churn loop.

### Cause B — Windows GPU Process Crash / Blank Screen Freeze
- **Problem**: On Windows PCs (particularly laptops with integrated Intel/AMD GPUs, dual GPUs, or outdated DirectX drivers), Electron's hardware acceleration often crashes the GPU process (`render-process-gone` or `child-process-gone`). When Chromium GPU process crashes in Electron without recovery handlers, the window turns into a **solid blank/black screen**.
- **Fix**: Added stability flags and GPU process recovery listeners in `main.ts`:
  - `disable-gpu-process-crash-limit`
  - `max-active-webgl-contexts: 32`
  - Added `app.on("child-process-gone", ...)` listener to isolate and gracefully handle GPU process exits without freezing the application.

### Cause C — Unthrottled Terminal Output IPC Flooding
- **Problem**: High-volume terminal outputs (like `npm run dev` or build logs) emitted `node-pty` `proc.onData` callbacks hundreds of times per second. Firing an IPC message for every single byte chunk flooded the IPC pipe, locking up the renderer UI thread.
- **Fix**: Implemented a 16ms (60fps) buffer batcher for terminal IPC outputs in `main.ts`. Output chunks are now coalesced into 16ms batches, keeping the UI completely fluid under heavy output streams.

### Cause D — Monaco Editor Heap Retention
- **Problem**: Closing editor tabs removed the tab state in React but left Monaco TextModels allocated in browser memory, accumulating heap overhead over long coding sessions.
- **Fix**: Added explicit Monaco model cleanup (`model.dispose()`) inside `handleCloseTab()` in `useWorkspaceTabs.ts`.

---

## Files Changed

| File | Change |
|---|---|
| `apps/editor/src/hooks/useWorkspaceTabs.ts` | Refactor auto-save effect with `tabsRef` & add Monaco model disposal on tab close |
| `apps/editor/electron/main.ts` | Add Windows GPU crash protection flags & batch terminal IPC outputs to 16ms frames |
