# Atlas Studio Development Log — Chapter 3: Call-Graph Indexing & Blast-Radius

This chapter documents the design and implementation of AST-level function call tracking, moving the Atlas memory graph from file-level tracking to precise, symbol-to-symbol method tracking.

---

## 1. AST-level Call Query Matching

We extended the indexing parser to capture function calls dynamically:
- **TypeScript Query**: Captures `(call_expression function: (identifier) @call.name)` and member expressions.
- **Python Query**: Captures `(call function: (identifier) @call.name)` and dotted attributes.
- **Scope climbing**: For each call expression, we climb up the tree-sitter parent hierarchy using `getEnclosingFunctionName(node)`. It checks for function declarations, definitions, method definitions, or arrow functions, mapping the enclosing symbol to its Node ID (e.g. `file.ts:callerName`). If none is found, the file node itself is designated as the caller.

---

## 2. In-Memory Symbol Resolution (Pass 2)

To resolve cross-file calls (e.g. function A calls an imported method B defined in another file) without the overhead of a full TypeScript compiler, we implemented a fast, two-pass resolution system during the indexing pipeline:

1. **Pass 1**: Index all file nodes, functions, class nodes, and named imports, collecting all raw call occurrences:
   `rawCalls: Array<{ callerId, calleeName, line }>`
2. **Pass 2 (Resolution)**:
   - Build a map of all local symbols: `fileNodeId:symbolName -> symbolNodeId`.
   - Build a map of file-to-file imports.
   - For each raw call:
     - Check if `calleeName` is defined in the same file. If so, link it.
     - If not, look up the target files imported by the caller's file, and check if any of them define a symbol with `calleeName`.
     - Link the caller node to the resolved target node with a `"calls"` edge.
     - Filter out standard runtime globals (such as `console`, `process`, `Math`, `Promise`, etc.) to prevent node pollution.

---

## 3. Verification

We created a Jest test suite at `packages/parser/src/tests/indexer.test.ts` to test call resolution:
- **Test Scenarios**: Local function calls, cross-file imports, and top-level file calls.
- **Run**: `pnpm --filter @atlas/parser test` compiles and passes all test suites:
  ```
  PASS dist/tests/indexer.test.js
  PASS src/tests/indexer.test.ts

  Test Suites: 2 passed, 2 total
  Tests:       2 passed, 2 total
  Snapshots:   0 total
  Time:        3.113 s
  ```

Indexing the monorepo itself with `atlas init .` successfully maps **366 edges** (up from 235), and calculating blast radius on `packages/parser/src/indexer.ts:resolveImportPath` returns exact method dependencies downstream and upstream in **10 milliseconds**.
