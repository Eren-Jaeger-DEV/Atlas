# Chapter 75 — Atlas Horizon: Spec-Driven Swarm Intelligence & Context Engine

## Overview

This chapter implements **Atlas Horizon**, Atlas Studio's proprietary spec-driven swarm execution protocol engineered natively into `@atlas/agents` (`HorizonEngine.ts`) and `@atlas/editor` (`HorizonPanel.tsx`).

---

## 1. Proprietary Architecture & Advantages over Legacy Prompt Tools

Unlike prompt-wrapper tools that rely on manual markdown file loading, **Atlas Horizon** combines:
- **Virtual Context Isolation Pipes (VCIP)**: Sub-agent tasks run in isolated context windows, eliminating context rot (0% token degradation).
- **Structured `.atlas/horizon/` State Matrix**: State persisted as high-performance JSON models (`spec.json`, `active.json`) with deterministic AST boundary metadata.
- **Automated AST & Test Verification Gate**: Stage 4 automatically executes typechecks, AST security audits (`verifyAST`), and test verifiers before staging commits.

---

## 2. The 4 Horizon Stages

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────┐     ┌────────────────┐
│  1. DISCOVER    │ ──> │  2. ARCHITECT   │ ──> │  3. SWARM-EXECUTE   │ ──> │  4. AUDIT      │
│ Intent & Graph  │     │ DAG Wave Spec   │     │ Parallel Subagents  │     │ AST & Tests    │
└─────────────────┘     └─────────────────┘     └─────────────────────┘     └────────────────┘
```

1. **Discover**: Scans codebase and maps AST boundary edges.
2. **Architect**: Builds parallel task wave plans.
3. **Swarm-Execute**: Concurrently executes tasks across sub-agent workers (`[CODER]`, `[TESTER]`, `[REVIEWER]`).
4. **Audit**: Verifies AST integrity and compilation clean state.

---

## 3. Interactive Workbench UI (`HorizonPanel.tsx`)

- **Stage Pipeline HUD Bar**: Real-time visual progress chips with stage-specific color branding (`#38bdf8`, `#a855f7`, `#fbbf24`, `#f97316`, `#34d399`).
- **Swarm Wave Matrix**: Interactive list displaying active wave tasks, assigned sub-agent workers, and task status badges (`PENDING`, `EXECUTING`, `VERIFIED`).
- **Activity Bar Integration**: Dedicated **Horizon Spec** toggle icon in the activity bar.

---

## Files Changed

| File | Change |
|---|---|
| `packages/agents/src/horizon/HorizonTypes.ts` | Define `HorizonSpec`, `HorizonWave`, `HorizonTask`, `HorizonStage` types |
| `packages/agents/src/horizon/HorizonEngine.ts` | Implement `HorizonEngine` with wave creation, VCIP wave execution, and audit verifier |
| `packages/agents/src/index.ts` | Export `HorizonEngine` and horizon types |
| `apps/editor/src/components/HorizonPanel.tsx` | Create interactive Atlas Horizon Workbench UI |
| `apps/editor/src/App.tsx` | Wire `HorizonPanel` into `SidebarView` and Activity Bar |
