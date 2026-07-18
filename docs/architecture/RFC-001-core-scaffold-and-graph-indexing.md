# Atlas Studio Development Log — Chapter 1: Core Scaffold & Graph Indexing

This chapter documents the construction of the Atlas monorepo structure, tree-sitter indexer, and the SQLite-based Memory Engine.

---

## 1. Monorepo Scaffolding (pnpm Workspaces)

To ensure code-sharing between the editor, agent runtime, CLI, and indexers, we initialized a workspace-based monorepo layout using `pnpm`:

```
f:/projects/Atlas/
├── apps/
│   ├── cli/          — Headless binary command line tool
│   └── editor/       — Electron + React front-end editor shell
├── packages/
│   ├── core/         — Types + Plugin IExtensionAPI
│   ├── parser/       — tree-sitter file indexer
│   ├── graph/        — SQLite Memory Engine & BFS impact analysis
│   └── agents/       — Agents, LLM adapters, and Orchestrator
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

We configured Turborepo (`turbo.json`) to cache builds and run workspace compiles efficiently.

---

## 2. Tree-Sitter Indexer (`@atlas/parser`)

The indexer walks the codebase directory, parsing every matching TypeScript/JavaScript or Python file to generate nodes and edges:
- **Parser Core**: Uses tree-sitter Node.js bindings (`tree-sitter`, `tree-sitter-typescript`, and `tree-sitter-python`).
- **AST Queries**: Uses tree-sitter queries (`TreeSitter.Query`) to extract symbols (classes, methods, functions, and TODO comments).
- **Import Mapping**: Identifies import edges. We normalized ESM subpath extensions (resolving `.js` to `.ts`/`.tsx` on disk), directory-indexing, and bare imports.

---

## 3. SQLite Memory Engine (`@atlas/graph`)

We implemented a pure WASM SQLite storage backend (`sql.js`) to store nodes, edges, decisions, and run traces. We avoided native SQLite bindings to guarantee zero binary compilation issues on target platforms (especially Windows).

### Live Blast Radius Analysis (Pure BFS)
The core differentiator of Atlas is **Live Dependency Impact**, which runs in < 15ms without any AI involvement.
- **Algorithm**: An iterative Breadth-First Search (BFS) starting at a target symbol or file.
- **Direction**: Traverses `upstream` (following `imports` and `contains` edges backwards) to see what other modules depend on the modified code.
- **Risk Score**: Estimates risk (Critical, High, Medium, Low) based on the depth of the blast radius and whether the affected files contain public API surfaces.

---

## 4. Operational Commands (CLI)

The command line tool (`apps/cli`) implements 5 core tasks:
1. `atlas init`: Performs AST-parsing and writes graph nodes/edges to `.atlas/graph.db`.
2. `atlas impact <file>:<symbol>`: Returns instant blast-radius calculation.
3. `atlas ask <query>`: Runs full-text SQLite search to query graph symbols offline.
4. `atlas run <goal>`: Initiates the agent loop.
5. `atlas doctor`: Validates node version, graph DB, and API key environment setup.
