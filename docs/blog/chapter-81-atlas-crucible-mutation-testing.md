# Chapter 81 — Atlas Crucible: Live Background Mutation Testing Score Dashboard

**Date:** 2026-08-01  
**Phase:** Priority #5 Intelligence Breakthrough Engine

---

## Overview

This chapter documents the design and implementation of **Atlas Crucible** (`MutationTestEngine.ts`), Atlas Studio's live background mutation testing dashboard (Stryker class).

While raw line coverage % is often misleading (tests can achieve 100% line coverage while asserting nothing), **Atlas Crucible** deliberately injects AST code faults (mutants) to calculate a true **Mutation Score** (`Killed Mutants / Total Mutants * 100`).

---

## Architecture & Implementation

### 1. Engine Core (`packages/agents/src/testing/MutationTestEngine.ts`)

- AST mutation generators:
  - **Equality Operators**: `===` -> `!==`
  - **Boolean Literals**: `true` -> `false`
  - **Conditional Boundaries**: `<` -> `<=`
  - **Return Values**: `return x` -> `return null`
- Calculates overall Mutation Score % and groups mutants into `killed`, `survived`, `timeout`, and `error`.
- Provides remediation advice for surviving mutants ("survived" = tests passed despite broken code = weak test coverage!).

### 2. UI Component (`apps/editor/src/components/AtlasCruciblePanel.tsx`)

- High-tech dark UI panel featuring a Mutation Score % gauge.
- Status filter tabs (`ALL`, `SURVIVED`, `KILLED`).
- Interactive mutant cards showing file location, line number, original vs mutated code diff, and 1-click **"Generate Test to Kill Mutant"** AI prompt button.
- Wired into `App.tsx` via `crucible` activity bar item (`#f97316` orange flame icon).

---

## Verification & Type Safety

- Clean build across `@atlas/agents` (`tsc --build`).
- Clean typecheck across `@atlas/editor` (`tsc --noEmit`).

---

## Commit Reference

`feat(testing): Atlas Crucible live background mutation testing score visualizer (Chapter 81)`
