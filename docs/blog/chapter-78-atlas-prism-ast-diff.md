# Chapter 78 — Atlas Prism: Structural AST-Aware Semantic Git Diff Engine

**Date:** 2026-08-01  
**Phase:** Priority #2 Intelligence Breakthrough Engine

---

## Overview

This chapter documents the implementation of **Atlas Prism** (`AtlasPrism.ts`), Atlas Studio's structural AST-aware semantic diff visualizer.

Unlike standard line-based git diff tools (which choke on whitespace or large AI reformats), **Atlas Prism** parses source trees and classifies diff hunks into high-level AST change categories:
- **Function Signature Changes** (`function_signature`) — HIGH importance
- **Logic Block Modifications** (`logic_modification`) — MEDIUM importance
- **Import Modifications & Reordering** (`import_reorder`) — LOW importance
- **Formatting & Whitespace Only** (`whitespace_formatting`) — TRIVIAL / Collapsible

---

## Architecture & Implementation

### 1. Engine Core (`packages/graph/src/AtlasPrism.ts`)

- Analyzes raw text diffs and classifies them into structured `PrismDiffHunk[]` objects.
- Computes aggregate metrics: `functionsChanged`, `importsChanged`, `formattingOnlyLines`, `logicChanges`.
- Identifies whitespace-only modifications to allow 1-click collapse/hide.

### 2. UI Component (`apps/editor/src/components/AtlasPrismDiffPanel.tsx`)

- Displays color-coded category badges (`FUNCTION SIG`, `LOGIC CHANGE`, `IMPORT MOD`, `FORMATTING ONLY`).
- Interactive filter bar to filter by change category or toggle "Hide Whitespace".
- Collapsible hunk cards showing exact line numbers (`L42 → L45`) and line diff previews.
- Wired into `App.tsx` via `prismDiff` activity bar item (`#c084fc` purple icon).

---

## Verification & Type Safety

- Clean build across `@atlas/graph` (`tsc --build`).
- Clean typecheck across `@atlas/editor` (`tsc --noEmit`).

---

## Commit Reference

`feat(diff): Atlas Prism AST-aware semantic git diff engine and visualizer (Chapter 78)`
