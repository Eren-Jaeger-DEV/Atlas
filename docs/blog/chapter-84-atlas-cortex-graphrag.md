# Chapter 84 — Atlas Cortex: GraphRAG Code Knowledge Graph & Semantic Relation Index

**Date:** 2026-08-01  
**Phase:** Priority #8 Intelligence Breakthrough Engine

---

## Overview

This chapter documents the design and implementation of **Atlas Cortex** (`GraphRagEngine.ts`), Atlas Studio's GraphRAG code knowledge graph and semantic relation index engine.

While simple vector databases only perform flat text chunk similarity searches, **Atlas Cortex** indexes structural code entity relationships (`calls`, `inherits`, `imports`, `instantiates`, `type_references`). It retrieves the 2-hop graph neighborhood of target symbols to augment AI prompt context, eliminating hallucinated function calls and invalid method signatures in AI-generated code.

---

## Architecture & Implementation

### 1. Engine Core (`packages/graph/src/GraphRagEngine.ts`)

- Indexes codebase entities (`KnowledgeNode`: functions, classes, interfaces, modules) and typed edges (`KnowledgeEdge`: `calls`, `inherits`, `imports`, `instantiates`, `type_references`).
- Computes 2-hop graph neighborhood (`targetNode`, `callers`, `callees`, `dependencies`).
- Auto-generates structured GraphRAG prompt context strings for LLM injection.

### 2. UI Component (`apps/editor/src/components/AtlasCortexPanel.tsx`)

- High-tech dark UI panel featuring symbol search input with real-time graph querying.
- Visual node cards displaying incoming callers (cyan), outgoing callees (purple), and entity kind badges.
- GraphRAG AI Prompt Context preview card with 1-click **"Copy Context for AI Prompt"** button.
- Wired into `App.tsx` via `cortex` activity bar item (`#34d399` emerald network icon).

---

## Verification & Type Safety

- Clean build across `@atlas/graph` (`tsc --build`).
- Clean typecheck across `@atlas/editor` (`tsc --noEmit`).

---

## Commit Reference

`feat(graph): Atlas Cortex GraphRAG code knowledge graph engine (Chapter 84)`
