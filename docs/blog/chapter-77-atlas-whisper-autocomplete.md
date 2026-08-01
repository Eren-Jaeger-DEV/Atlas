# Chapter 77 — Atlas Whisper: Zero-Config FIM Inline Ghost Text Autocomplete Engine

**Date:** 2026-08-01  
**Phase:** Priority #1 Intelligence Breakthrough Engine

---

## Overview

This chapter documents the design and implementation of **Atlas Whisper** (`GhostTextEngine.ts`), Atlas Studio's zero-config local & cloud Fill-In-the-Middle (FIM) inline ghost text autocomplete engine.

Unlike GitHub Copilot (cloud subscription) or Tabby (requires separate server setup), **Atlas Whisper** automatically hooks into endpoints discovered by `LocalModelRadar` (Ollama, LM Studio, vLLM, Llama.cpp, GPT4All, Jan) with zero manual setup.

---

## Architecture & Implementation

### 1. Engine Core (`packages/agents/src/autocomplete/GhostTextEngine.ts`)

- **Automatic Model Resolution:** Calls `localModelRadar.scan()` to find the best running local LLM endpoint (e.g. Qwen2.5-Coder, DeepSeek-Coder, StarCoder2).
- **FIM Prompt Formatting:** Constructs standard Fill-In-the-Middle tokens:
  ```
  <|fim_prefix|>{prefix}<|fim_suffix|>{suffix}<|fim_middle|>
  ```
- **Non-blocking Latency Bounds:** Uses an `AbortController` signal with a strict 3000ms timeout to prevent typing lag.
- **Provider Fallback:** Gracefully yields if no local model is actively running or if user typing is too fast.

### 2. Editor Integration (`apps/editor/src/components/EditorPane.tsx`)

- Registered directly into Monaco Editor using `monaco.languages.registerInlineCompletionsProvider("*", ...)`.
- Captures cursor offset, extracts prefix/suffix text boundaries, and queries `ghostTextEngine.requestCompletion`.
- Displays suggested completions as native grey ghost text overlays inside the active Monaco editor pane.
- Accepts on `Tab`, dismisses on `Escape` or character entry.

---

## Verification & Type Safety

- Clean build across `@atlas/agents` (`tsc --build`).
- Clean typecheck across `@atlas/editor` (`tsc --noEmit`).

---

## Commit Reference

`feat(autocomplete): Atlas Whisper zero-config local FIM inline ghost text engine (Chapter 77)`
