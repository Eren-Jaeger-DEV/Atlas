# RFC-017: Autonomous Browser & Dynamic DOM Tool Subsystem (`@atlas/agents/browser`)

**Status**: PROPOSED & APPROVED  
**Author**: Atlas Core Team  
**Date**: 2026-07-22  

---

## 1. Executive Summary

This RFC specifies the architecture and implementation for **Autonomous Browser Control & Dynamic Tool Selection** within Atlas Studio. Inspired by modern agentic systems (such as Google Antigravity's Browser Subagent and Chrome DevTools MCP), this subsystem equips AI agents with the ability to navigate live web applications, extract semantic accessibility (a11y) trees, capture full-viewport screenshots, inspect network events, and autonomously interact with web elements (click, type, scroll, hover, submit) to verify UI implementations and execute automated browser workflows.

---

## 2. System Architecture

```
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                         AUTONOMOUS AGENT ORCHESTRATOR                       │
 │                    (Gemini 2.0 Flash / Pro LLM Engine)                       │
 └───────────────────────┬─────────────────────────────▲───────────────────────┘
                         │ Tool Call Execution         │ Observation (AXTree + Image)
                         ▼                             │
 ┌─────────────────────────────────────────────────────┴───────────────────────┐
 │                        DYNAMIC BROWSER TOOL REGISTRY                        │
 │  ┌─────────────────────┐  ┌──────────────────────┐  ┌────────────────────┐  │
 │  │ browser_click(id)   │  │ browser_type(text)   │  │ take_screenshot()  │  │
 │  └─────────────────────┘  └──────────────────────┘  └────────────────────┘  │
 └───────────────────────┬─────────────────────────────────────────────────────┘
                         │ Playwright / CDP Commands
                         ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                        BROWSER ENGINE & PLAYWRIGHT                          │
 │  ┌─────────────────────────────────┐   ┌─────────────────────────────────┐  │
 │  │       Live Headless Browser     │   │  AXTree (Accessibility Snapshot)│  │
 │  └─────────────────────────────────┘   └─────────────────────────────────┘  │
 └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Subsystem Modules (`packages/agents/src/browser/`)

### 3.1 `AXTreeExtractor.ts` — Semantic DOM & Node Indexer
- **Purpose**: Converts noisy DOM trees into compact, structured accessibility node arrays with unique integer IDs.
- **Node Representation**:
  ```typescript
  export interface AXNode {
    id: number;
    role: string;
    name: string;
    value?: string;
    description?: string;
    bounds?: { x: number; y: number; width: number; height: number };
    disabled?: boolean;
    children?: AXNode[];
  }
  ```

### 3.2 `VisionGrounding.ts` — Screenshot & Set-of-Marks Overlay Engine
- **Purpose**: Captures page screenshots and draws bounding boxes/numerical badges over interactive DOM elements.
- **Output**: Returns Base64/Buffer images for multimodal vision model perception.

### 3.3 `BrowserEngine.ts` — CDP & Process Lifecycle Manager
- **Purpose**: Manages browser launching, page creation, viewport configuration, and network log streaming.
- **Methods**: `launch()`, `navigate(url)`, `getAXTree()`, `screenshot()`, `close()`.

### 3.4 `BrowserTools.ts` — Dynamic Tool Definitions & Execution Wrappers
- **Purpose**: Registers standardized tools (`browser_navigate`, `browser_click`, `browser_type`, `browser_screenshot`, `browser_evaluate`, `browser_inspect_network`) for LLM function calling.

### 3.5 `BrowserSubagent.ts` — Autonomous Execution Loop
- **Purpose**: Sequentially executes the Action-Observation loop until a user-defined goal is achieved or max iterations are reached.

---

## 4. Verification Plan

1. **Unit Tests**: Add `packages/agents/src/tests/browser.test.ts` to test node extraction, tool dispatch, and subagent iteration.
2. **Build Verification**: Run `pnpm typecheck && pnpm test && pnpm build` across all 7 monorepo packages.
3. **Milestone Zip**: Update clean `Atlas-Studio-Source.zip` archive.
