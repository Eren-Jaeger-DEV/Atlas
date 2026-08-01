# Chapter 83 — Atlas Torch: One-Click CPU & Heap Flamegraph Profiler

**Date:** 2026-08-01  
**Phase:** Priority #7 Performance Breakthrough Engine

---

## Overview

This chapter documents the design and implementation of **Atlas Torch** (`FlamegraphProfiler.ts`), Atlas Studio's one-click CPU and Heap memory flamegraph profiler engine.

While basic metrics dashboards show aggregate CPU or memory percentages, **Atlas Torch** captures exact call stack frames, computes exclusive self-time vs total execution time, renders visual Flamegraph node trees, and isolates CPU/memory hotspots consuming >20% execution time with 1-click AI optimization prompts.

---

## Architecture & Implementation

### 1. Engine Core (`packages/core/src/release/FlamegraphProfiler.ts`)

- Captures execution call stacks and constructs hierarchical `FlameFrame` node trees.
- Calculates self-time (exclusive time spent inside function) vs total time (inclusive of child function calls).
- Identifies execution hotspots consuming >20% total time.
- Generates targeted optimization advice per hotspot frame.

### 2. UI Component (`apps/editor/src/components/AtlasTorchPanel.tsx`)

- High-tech dark UI panel featuring CPU Time vs Heap Memory mode toggles.
- Stacked Flamegraph call frame tree with color intensity mapping to CPU percentage.
- Hotspot cards highlighting function name, line location, total vs self time, and 1-click **"Optimize Hotspot with AI"** prompt button.
- Wired into `App.tsx` via `torch` activity bar item (`#eab308` yellow flame icon).

---

## Verification & Type Safety

- Clean build across `@atlas/core` (`tsc --build`).
- Clean typecheck across `@atlas/editor` (`tsc --noEmit`).

---

## Commit Reference

`feat(profiler): Atlas Torch CPU and heap flamegraph profiler engine (Chapter 83)`
