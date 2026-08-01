# Chapter 86 — Atlas Canvas: In-Editor Reactive Notebook Engine (.atlas-nb)

**Date:** 2026-08-01  
**Phase:** Priority #10 Intelligence Breakthrough Engine

---

## Overview

This chapter documents the design and implementation of **Atlas Canvas** (`ReactiveNotebookEngine.ts`), Atlas Studio's in-editor reactive notebook layer (.atlas-nb).

Unlike VS Code Jupyter (clunky, non-reactive JSON `.ipynb` files) or DataSpell (JetBrains separate product), **Atlas Canvas** provides an in-IDE reactive notebook experience where code cells execute reactively. When cell A mutates variable values, dependent cell B automatically re-runs.

---

## Architecture & Implementation

### 1. Engine Core (`packages/core/src/notebook/ReactiveNotebookEngine.ts`)

- Parses `.atlas-nb` document JSON format containing interactive code cells (`NotebookCell`).
- Tracks read and written variables per cell (`readsVariables`, `writesVariables`).
- Builds reactive variable dependency DAGs and automatically triggers downstream dependent cells upon cell output mutation.

### 2. UI Component (`apps/editor/src/components/AtlasCanvasPanel.tsx`)

- Cell-based reactive notebook editor layout.
- Per-cell Run button, execution count badges `[1]`, status indicators (`IDLE`, `RUNNING`, `SUCCESS`, `ERROR`).
- Variable Dependency Tracker chip (`reads: rawData`, `writes: processedSum`).
- Inline text, JSON, and SVG output cards.
- Wired into `App.tsx` via `canvas` activity bar item (`#ec4899` pink book icon).

---

## Verification & Type Safety

- Clean build across `@atlas/core` (`tsc --build`).
- Clean typecheck across `@atlas/editor` (`tsc --noEmit`).

---

## Commit Reference

`feat(notebook): Atlas Canvas reactive notebook layer engine (Chapter 86)`
