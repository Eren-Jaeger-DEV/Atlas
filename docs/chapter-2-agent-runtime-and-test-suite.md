# Atlas Studio Development Log — Chapter 2: Agent Runtime & Test Suite

This chapter documents the construction of the Multi-Agent Runtime, Orchestrator state machine, ESM testing framework configuration, and dynamic monorepo workspace package resolution.

---

## 1. Multi-Agent Architecture (`@atlas/agents`)

The agent runtime is configured as a simple, highly-legible 4-state loop:

```
 PLANNING (Goal) ────> CODING ───> TESTING ───> REVIEWING ───> DONE
                         ^           │             │            ^
                         │           v             v            │
                         └────── [FAIL (Retry)]   [HIGH RISK] ──┴ AWAITING_HUMAN
```

- **Planner**: Evaluates a codebase goal, references the memory graph, and generates a structured sequence of PlanSteps.
- **Coder**: Takes a single step, interacts with filesystem tools (`read_file`, `write_file`, `list_directory`), and formats modifications as unified diffs.
- **Tester**: Executes the workspace test runner (e.g., `npm test`) and parses stderr/stdout failures into diagnostic errors (fed back to the Coder on retry).
- **Reviewer**: Evaluates the coder's final diff to determine security, structural, and consistency risks before applying.
- **Orchestrator**: Manages state machine sequencing and schedules self-correcting loops when compiler/test runs fail.

---

## 2. Dynamic Workspace Indexer

To resolve bare package imports (e.g., `import { ... } from "@atlas/core"`) without static path mappings, we implemented a recursive directory scanner in the indexer:
- Scans the repository for all `package.json` files.
- Identifies exports/entrypoints for each package name.
- Dynamically resolves workspace imports to their source file paths on disk during tree-sitter AST parsing.
- Increases graph fidelity by tracing connections across monorepo package boundaries dynamically.

---

## 3. Jest & ts-jest ESM Testing Config

To test the agents and orchestrator offline, we built a mock-driven unit/integration test suite:
- **Environment**: Set up Jest with `ts-jest` using hybrid module compilation (ESM).
- **Sandboxed IO**: Implemented a sandbox creator utility (`src/tests/mocks/sandbox.ts`) that initializes isolated git directories, fake test runners, and mock packages in temporary OS space.
- **Mock LLM Providers**: Implemented a mock LLM client that queues structured JSON models and tool executions to verify complete multi-turn self-correcting loops.
- **Windows Symlinks & Path Remappings**: Resolved relative ESM import extensions (`.js` to `.ts`) and cross-package monorepo type paths to compiled outputs (`dist/`) to prevent ts-compiler `TS6059` scoping issues.
