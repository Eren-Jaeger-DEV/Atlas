# Atlas Studio

**The IDE that actually understands your codebase.**

You shouldn't have to explain your own code to your editor. Atlas Studio knows your entire codebase — every function, every dependency, every architectural decision — before you type a single character. That knowledge powers everything: the AI that writes code, the sidebar that shows you what breaks before you change it, the agent that plans, implements, tests, and reviews in one shot.

---

## Why Atlas Studio

| | VS Code + Copilot | Cursor | **Atlas Studio** |
|---|---|---|---|
| AI edits code | ✅ | ✅ | ✅ |
| Knows your whole codebase | ❌ | Partial | ✅ Full graph |
| Shows blast radius before you edit | ❌ | ❌ | ✅ Live, < 500ms |
| Runs full agent loop (plan → code → test → review) | ❌ | ❌ | ✅ |
| Works with OpenAI, Anthropic, Gemini | ❌ | Partial | ✅ |
| Queryable memory across sessions | ❌ | ❌ | ✅ Persistent graph |
| Remembers every architectural decision | ❌ | ❌ | ✅ Decision log |

---

## Core Features

### Live Blast-Radius Analysis
Change a function — Atlas instantly shows you every file, test, and API endpoint that will break. Before you write a single line. No AI needed, no network call, purely your codebase's own graph.

```bash
atlas impact src/auth/login.ts:validateToken
# → 12 files affected, 3 test files, 1 API endpoint — HIGH RISK
# Computed in 8ms
```

### AI Agent Loop
Tell Atlas what you want. It plans the work, reads the relevant files, writes the code, runs your tests, and reviews its own changes for risk — autonomously.

```bash
atlas run "add rate limiting to all public API endpoints"
# Planner   → reads codebase, decomposes into steps
# Coder     → edits files, follows your patterns
# Tester    → runs your test suite, retries on failure
# Reviewer  → scores risk, flags breaking changes
```

Works with **OpenAI, Anthropic, or Gemini** — set whichever API key you have.

### Memory Graph
Every function, class, import, and decision is indexed into a persistent knowledge graph. The AI agents query it before touching your code. You can query it too:

```bash
atlas ask "where is authentication handled?"
atlas ask "what calls the payment service?"
```

### AI Timeline
Every agent run is stored. You can replay what the AI did, why it made each decision, and what the test results were — across sessions.

---

## Getting Started

### Requirements
- Node.js ≥ 20
- pnpm ≥ 9

```bash
pnpm install
pnpm build
```

### Index your repo
```bash
atlas init .
# Indexed 1,247 files → 8,432 nodes, 14,891 edges in 3.1s
```

### Check what breaks before you change it
```bash
atlas impact src/payments/charge.ts
atlas impact src/payments/charge.ts:processCard   # symbol-level
```

### Run the AI on a real goal
```bash
# Set one of these in .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AI...

atlas run "refactor the user service to use repository pattern"
```

### Open the editor
```bash
pnpm --filter @atlas/editor dev
```

---

## Architecture

```
apps/
  cli/        — 5-command CLI (init, impact, run, ask, doctor)
  editor/     — Electron + React + CodeMirror 6

packages/
  core/       — Shared types, plugin API
  parser/     — tree-sitter indexer (TypeScript, JavaScript, Python)
  graph/      — SQLite memory graph + impact engine
  agents/     — Multi-agent runtime (Planner, Coder, Tester, Reviewer)
```

### The 4-Agent Orchestrator

```
PLANNING → CODING → TESTING → REVIEWING → DONE
                  ↑__________|
                (auto-retry on test failure)
```

A debuggable state machine — not a black box.

### The Memory Graph

Persistent SQLite knowledge graph, built from your actual source code. Every agent reads from it before acting. Every decision the AI makes gets written back to it. It gets smarter the more you use it.

---

## Tech Stack

| | Choice |
|---|---|
| Language | TypeScript throughout |
| Database | SQLite via sql.js (WASM — zero native compilation) |
| Parser | tree-sitter (incremental AST, 40+ languages planned) |
| Editor | CodeMirror 6 |
| Shell | Electron |
| Build | Turborepo + pnpm |
| AI | OpenAI / Anthropic / Gemini (your choice) |

---

## Status

Phase 1 complete. The graph, impact engine, agent loop, CLI, and editor shell are all functional.

**What's live:**
- `atlas init` — indexes TypeScript, JavaScript, Python dynamically by scanning packages
- `atlas impact` — blast-radius in < 15ms, resolving exact method-to-method call-graph boundaries
- `atlas run` — full Planner → Coder → Tester → Reviewer loop
- `atlas ask` — memory graph search
- **Dynamic package resolution** — automatically indexes monorepos via package.json scanning
- **Call-graph indexing** — AST-level function-to-function call connection resolution
- **Unit & Integration Test Suite** — 10 test suites (18 tests total) verifying full agent state transitions, tool execution, and Orchestrator retries
- **Standalone Electron packaging** — NSIS Windows installer builder pipeline configured
- Editor shell — CodeMirror 6, live impact panel

**Coming in Phase 2:**
- In-editor AI coding (inline completions + agent-driven edits)
- Multi-file diff review UI
- Git integration (commit, blame, history in-graph)
- 40-language parser support
- Local vector embeddings for semantic query matching

---

## License

© 2026 Atlas Studio. All rights reserved.

This repository is source-available for reference and collaboration purposes. It is not open source — no license is granted to use, copy, modify, or distribute this code without explicit written permission from the author.
