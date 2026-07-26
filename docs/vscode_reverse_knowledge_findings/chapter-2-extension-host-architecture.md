# Chapter 2: Extension Host and LSP Architecture

## Overview
A critical part of our investigation into the proprietary forks (Antigravity and Cursor) was understanding how they isolated their AI Agents and Language Server Protocols (LSPs). By analyzing the vanilla VS Code source code, we can see exactly what tools Microsoft provided them out-of-the-box.

## Key Findings

### 1. Native Extension Host Kinds
In `src/vs/workbench/services/extensions/common/extensionHostKind.ts`, we discovered that VS Code natively supports exactly three extension host environments:

```typescript
export const enum ExtensionHostKind {
	LocalProcess = 1,     // Standard Node.js extension host
	LocalWebWorker = 2,   // Browser-based Web Worker extension host
	Remote = 3            // Remote extension host (SSH, Dev Containers, etc.)
}
```

### 2. Antigravity's LSP Crash Explained
Recall from our Antigravity research that their custom LSP frequently crashed the UI because it was running inside a Web Worker. 
By looking at the vanilla VS Code source, it becomes clear why: **Antigravity did not build a custom sandbox from scratch.** Instead, they simply configured their `jetskiAgent` extension to run in the native `LocalWebWorker` environment (which is intended for lightweight browser-based extensions). Because their LSP was incredibly heavy, it overwhelmed the native Web Worker boundary, causing the crashes we observed.

### 3. IPC and RPC Protocols
VS Code handles communication between the main rendering process and these extension hosts using a robust RPC Protocol defined in `rpcProtocol.ts`. Both Cursor and Antigravity leverage this exact protocol for their agents to talk back to the UI.

## Takeaways for Atlas Studio
When building the AI Agent Runtime for Atlas Studio, we must carefully choose our Extension Host Kind. If we run our heavy AI orchestration in `LocalWebWorker`, we risk the same crashes Antigravity faced. 
Instead, we should ensure our AI agents execute in a dedicated `LocalProcess` (Node.js) or a custom sandboxed process that communicates asynchronously via an optimized RPC layer.
