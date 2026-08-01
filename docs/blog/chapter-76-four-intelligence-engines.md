# Chapter 76 — Four Intelligence Engines: AST Search, Local Model Radar, Impact Radar & Shadow Worktree

**Date:** 2026-08-01  
**Phase:** Atlas IDE — Intelligence Layer Expansion

---

## Overview

This chapter documents the simultaneous implementation of four original Atlas IDE intelligence engines — all built from scratch with unique Atlas-native names, architecture, and logic. None of these copy code or concepts directly from any external project.

---

## Feature 1: Atlas Structural AST Pattern Search Engine

**Files:**
- `packages/graph/src/StructuralAstSearch.ts` — Core engine
- `apps/editor/src/components/AstSearchPanel.tsx` — IDE panel

**What it does:**
Searches the entire workspace for structural code patterns using `$VAR` wildcard syntax rather than plain text regex. For example `console.log($MSG)` finds every console log call across 100+ files and shows each wildcard binding. A one-click `Replace All` rewrites all matches with an AST-aware replacement template.

**Architecture:**
- `patternToRegex()` — Converts `$NAME` placeholders into named capture groups `(?<NAME>...)`
- `matchContent()` — Line-by-line match with binding extraction
- `replaceContent()` — Template-driven replacement using captured binding values
- `collectSourceFiles()` — Recursive `readDir` fallback when `searchFiles` IPC is unavailable
- Four built-in presets: Un-awaited Async, Console Log Cleanup, Generic Error Throwing, Legacy var Declarations
- Activity bar icon: `astSearch` (sky-blue document icon)

---

## Feature 2: Atlas Local Model Radar

**Files:**
- `packages/agents/src/llm/LocalModelRadar.ts` — Core probe engine
- `apps/editor/src/components/LocalModelRadarPanel.tsx` — IDE panel

**What it does:**
Zero-configuration local LLM auto-discovery. Click "Scan" and it probes six well-known local inference server endpoints in parallel — no API keys, no manual config. Displays all discovered models with runtime badges, size/context metadata, and one-click selection that routes the Atlas AI runtime to that model.

**Supported runtimes:**
| Runtime    | Default Port | Color   |
|------------|-------------|---------|
| Ollama     | 11434       | Green   |
| LM Studio  | 1234        | Purple  |
| vLLM       | 8000/8080   | Blue    |
| Llama.cpp  | 8080/8000   | Orange  |
| GPT4All    | 4891        | Pink    |
| Jan        | 1337        | Yellow  |

**Architecture:**
- `probeFetch()` — Timeout-wrapped fetch with `AbortController` (2500ms default)
- `PROBES[]` — Declarative probe table with per-runtime model-list parser `extractModels()`
- `LocalModelRadar.scan()` — `Promise.allSettled` fan-out over all probes
- `buildCompatBaseUrl()` — Returns OpenAI-compatible endpoint URL for use in `ProviderRouter`
- Activity bar icon: `localModels` (violet server stack icon)

---

## Feature 3: Atlas Impact Radar

**Files:**
- `packages/graph/src/impact.ts` — Existing engine (unchanged)
- `apps/editor/src/components/ImpactRadarPanel.tsx` — [NEW] IDE panel

**What it does:**
Computes the full downstream blast radius of editing any file or named symbol. Shows risk level (LOW/MEDIUM/HIGH/CRITICAL), affected file count, test coverage impact, API surface exposure, and computation time. Each affected file shows its hop distance (color-coded green-to-red) from the changed symbol.

**Architecture:**
- Consumes `api.impact(filePath, symbolName?)` IPC bridge
- Risk config maps `RiskLevel` to color, background, label, and icon
- `HopDistancePip` — HSL-based color chip: 0 hops = green, 3+ hops = red
- Three grouped result sections: API Surfaces (highest priority), Test Coverage, All Files
- Activity bar icon: `impactRadar` (amber clock icon)

---

## Feature 4: Atlas Shadow Worktree

**Files:**
- `packages/agents/src/verification/ShadowWorktree.ts` — Core engine
- `apps/editor/src/components/ShadowWorktreePanel.tsx` — IDE panel

**What it does:**
Before the AI applies complex multi-file changes to the user's working tree, it stages them into an isolated `git worktree` sandbox, runs the full validation pipeline (install, typecheck, build, test), and returns a structured pass/fail report. If any non-`allowFailure` command fails, subsequent steps are skipped and the overall verdict is FAIL.

**Architecture:**
- `ShadowWorktree.verify(options)` — 4-stage pipeline:
  1. `git worktree add --detach <tmpdir>` — create isolated shadow branch
  2. Write `ShadowFileChange[]` into worktree (mkdir + writeFile, or rm for deletions)
  3. Execute `ShadowCommand[]` with per-command timeout via `AbortController`
  4. `git worktree remove --force` + `rm -rf` cleanup regardless of result
- `ATLAS_DEFAULT_SHADOW_COMMANDS` — Atlas monorepo preset: install, typecheck, build core, build agents, run tests
- UI shows expandable command result cards with stdout/stderr output, per-command timing, and an overall PASS/FAIL banner
- Activity bar icon: `shadowVerify` (green checkmark icon)

---

## Commit Reference

`feat(intelligence): AST Search, Local Model Radar, Impact Radar & Shadow Worktree verification engines`
