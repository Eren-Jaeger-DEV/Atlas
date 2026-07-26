# Chapter 50: Real-Time Reasoning & Process Visualization in AI Chat

## Overview
In this chapter, we integrated real-time reasoning visualization and live process metrics into Atlas Studio's AI Chat sidebar, bringing user experience parity with modern agentic IDE interfaces.

## Key Improvements

### 1. Real-Time Token Streaming & Chat Wiring
- Refactored `Orchestrator` in `@atlas/agents` to execute `provider.stream()` during chat interactions, emitting `token` events in real-time.
- Updated `LLMProvider` implementations (`GeminiProvider`, `OpenAIProvider`, `AnthropicProvider`) to ensure system instructions, full chat history, and model options are passed correctly to streaming API methods.

### 2. Collapsible Reasoning & Worked Metrics (`AiSidebar.tsx`)
- Introduced structured metadata for `ChatMessage`: `thinkingText`, `thinkingMs`, `durationMs`, and `steps`.
- Rendered `Worked for Xm Xs` collapsible process headers for agent responses.
- Embedded `Thought for Xs` expandable blocks that display the Planner agent's actual reasoning rationale (`plan.planningReasoning`).
- Added step process chips reflecting active tasks (e.g., plan step counts, file modification counts).

### 3. Model Override Propagation
- Fixed `createProvider()` in `apps/editor/electron/main.ts` to consume the `context.model` parameter sent from the UI model selector.
- Ensures selected LLM model choices (e.g., Gemini 2.5, Claude Sonnet, OpenAI models, or `routing.run` endpoints) directly configure the agent provider instance.

### 4. Event Pipeline Wiring
- Updated `Orchestrator` to emit `step_start` and `coder_output` events during DAG task execution.
- Connected real backend execution metrics to front-end visualization without mock or hardcoded data fallbacks.
