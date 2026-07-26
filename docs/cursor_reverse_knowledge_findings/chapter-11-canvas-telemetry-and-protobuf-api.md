# Chapter 11: Cursor Canvas — The Secret Data Visualization & Code Execution Runtime

## Overview

Hidden inside the `cursor-agent-exec` extension's `dist/canvas-runtime/` directory is a complete **data visualization and interactive execution runtime** for Cursor's Canvas feature. This React-based system allows AI agents to render interactive charts, previews, and UI components directly in the IDE.

---

## 1. What Is "Canvas"?

Cursor Canvas is an **interactive AI artifact rendering system** — a sandboxed environment where:
- The AI can generate and execute code that renders visual output
- Users see live-updating charts, tables, and UI components
- The canvas acts as an "AI scratchpad" for interactive data exploration

It's conceptually similar to Claude's Artifacts feature, but deeply integrated into the IDE.

---

## 2. Technology Stack

The canvas runtime uses **React** (not SolidJS, which is used for the main Composer UI):

```
react (Meta Platforms, Inc.)
react-dom (Meta Platforms, Inc.)
react-dom-client (React 18 concurrent mode)
scheduler (React scheduler)
```

This confirms Cursor uses **two different reactive frameworks**:
- **SolidJS** — for the Composer/chat panel (high performance, fine-grained reactivity)
- **React** — for the Canvas system (component-based rendering, broader ecosystem)

---

## 3. Canvas API & Communication Protocol

The canvas communicates with the host IDE via custom events:

| Event | Direction | Purpose |
|---|---|---|
| `cursor-canvas-state-change` | Canvas → Host | Canvas state changed (emit to host) |
| `cursor-canvas-data-change` | Canvas → Host | Canvas data changed |
| `cursor-canvas-preview-resize` | Canvas → Host | Preview panel resized |
| `action dispatch failed` | Internal | Redux-like action dispatch error |
| `state persist failed` | Internal | State serialization error |

Canvas routes:
```
GET /canvas/{id}/action{query}
```

The canvas fetches its content and actions via a local HTTP server running on the canvas runtime, not directly from the Cursor backend.

---

## 4. Canvas Design System

The canvas has its own complete design system with consistent spacing, colors, and typography:

### Color Palettes
- `canvasPaletteLight` — light mode colors (foreground, background, etc.)
- `canvasShikiPaletteLight` — code syntax highlighting palette (uses Shiki)

### Spacing System
```js
canvasSpacing[0.5]  // 2px
canvasSpacing[1]    // 4px
canvasSpacing[1.5]  // 6px
canvasSpacing[2]    // 8px
canvasSpacing[2.5]  // 10px
canvasSpacing[3]    // 12px
canvasSpacing[5]    // 20px
canvasSpacing[7]    // 28px
```

### Border Radius
```js
canvasRadius.full  // Pill/circular
canvasRadius.lg    // Large rounded corners
```

### Typography
```js
canvasTypography.small.fontSize  // Small text size
```

---

## 5. Chart & Visualization Components

The canvas includes built-in chart rendering:

```js
// Y-axis rendering
renderYAxis(element, data, options, ...)

// Reference lines
renderReferenceLines(...)

// Label truncation
truncateLabel(label)
```

With a full code syntax highlighting system using **Shiki** (`applyCanvasShikiVars`).

---

## 6. The Sandbox Preview System

```js
function isCanvasPreviewMode() { if ("...") { ... } }
```

Canvas has a `previewMode` that changes the rendering behavior:
- In preview mode: different padding, border styles
- Canvas errors are reported to the host: `[CursorCanvas] Failed to report error to host`
- Failed renders: `[CursorCanvas] Preview render failed`
- Runtime errors: `[CursorCanvas] Runtime error`

---

## 7. Cursor's Complete Telemetry Event Catalog

From `cursor-agent-exec/dist/main.js`, the complete agent telemetry catalog:

### Agent Lifecycle Events
```
agent.assistant_message_looping             — Detected an infinite loop
agent.assistant_message_looping.latency_ms
agent.background_task_completion            — Background task finished
agent.step.count                            — Number of steps in conversation
agent.prompt_suggestion.outcome             — User accepted/rejected prompt suggestion
agent.lifecycleHook.afterAgentThought      — After model responds
agent.lifecycleHook.preCompact             — Before context compaction
agent.lifecycleHook.subagentStart          — Subagent launched
agent.lifecycleHook.subagentStop           — Subagent stopped
agent.finalize_step.root_prompt_restore_mode
agent.named_agent_self_document.load_failed
```

### Conversation State Events
```
agent.conversation_state.compute.root_prompt_mode
agent.conversation_state.restore.duration_ms
agent.conversation_state.restore.file_state_blob_get_count
agent.conversation_state.restore.file_state_path_count
agent.conversation_state.restore.root_prompt_message_count
agent.conversation_state.restore.total_restored_bytes
agent.conversation_state.restore.turn_reference_count
```

### Background Summarization (Context Window Management)
```
agent.background_summarization.started
agent.background_summarization.discarded        — Summarization abandoned
agent.background_summarization.persisted        — Summarization saved
agent.background_summarization.persisted_additional_messages
agent.background_summarization.persisted_estimated_tokens
agent.background_summarization.time_saved_ms    — Time saved by compaction
agent.summarization.attempts
agent.summarization.compression_percent         — % tokens saved
agent.summarization.compute_maxmin_fair_allocations_duration_ms
agent.summarization.deterministic_fallback.used — Fell back to deterministic compaction
agent.summarization.failures
agent.summarization.fallback_attempts
agent.summarization.input_tokens
agent.summarization.output_tokens
agent.summarization.original_length_chars
agent.summarization.persisted_length_chars
agent.summarization.retries
agenticComposer.summarization
agenticComposer.summarizationGenerationTime
agenticComposer.summarizationTime
```

### Agent KV Store (Persistent State)
The agent has a multi-tier key-value storage system with encryption:
```
agent_kv.cached.*          — Cached KV tier (fast, in-memory cached)
agent_kv.controlled.*      — Controlled KV tier (access-controlled)
agent_kv.encrypted.*       — Encrypted KV tier (for secrets)
agent_kv.in_memory.*       — Pure in-memory tier (ephemeral)
agent_kv.lazy_reference.*  — Lazy-loaded KV references
agent_kv.nearby.*          — "Nearby" encrypted storage (with fallback)
agent_kv.retry.*           — Retry-wrapped KV operations
agent_kv.writethrough.*    — Write-through KV (writes to multiple backends)
```

The "nearby" store has decrypt fallback (`agent_kv.nearby.decrypt_errors`, `agent_kv.nearby.decrypt_fallback_success`) suggesting it can recover from decryption failures by falling back to an alternative key.

### Agent Execution Events
```
agent_exec.controlled.exec.duration_ms
agent_exec.controlled.exec.error
agent_exec.controlled.exec.success
agent_exec.hook_additional_context.delivered
```

### Agent Client Stream Events
```
agent_client.stream.did_stall      — Stream stalled (no data for N seconds)
agent_client.stream.stall.count
agent_client.stream.stall.duration_ms
agent_client.stream.total
```

### Rules & Skills Events
```
AgentSkillsCursorRulesService.fileWatcher.subscribe
AgentSkillsCursorRulesService.loadAll
AgentSkillsCursorRulesService.reloadAtPath
agent_skills_proto.total
agent_skills.total
AGENTS.md                   — Cursor also uses AGENTS.md!
```

---

## 8. Cursor's Protobuf Permission API (agent.v1 & aiserver.v1)

Cursor's permission system is built on protobuf. These are the complete message types found:

### agent.v1 — Agent-Level Permission Messages

| Message | Purpose |
|---|---|
| `agent.v1.ReadPermissionDenied` | Read access denied |
| `agent.v1.WritePermissionDenied` | Write access denied |
| `agent.v1.DeletePermissionDenied` | Delete access denied |
| `agent.v1.EditReadPermissionDenied` | Edit + read denied |
| `agent.v1.EditWritePermissionDenied` | Edit + write denied |
| `agent.v1.DiagnosticsPermissionDenied` | Diagnostics access denied |
| `agent.v1.StrReplaceReadPermissionDenied` | String-replace read denied |
| `agent.v1.StrReplaceWritePermissionDenied` | String-replace write denied |
| `agent.v1.ShellPermissionDenied` | Shell command denied |
| `agent.v1.ShellSandboxUnsupported` | Sandbox not available on this platform |
| `agent.v1.McpPermissionDenied` | MCP tool denied |
| `agent.v1.McpApproved` | MCP tool approved |
| `agent.v1.McpAllowlistPrecheckArgs` | MCP allowlist pre-check input |
| `agent.v1.McpAllowlistPrecheckResult` | MCP allowlist pre-check result |
| `agent.v1.ShellAllowlistPrecheckArgs` | Shell allowlist pre-check input |
| `agent.v1.ShellAllowlistPrecheckResult` | Shell allowlist pre-check result |
| `agent.v1.WebFetchAllowlistPrecheckArgs` | Web fetch pre-check input |
| `agent.v1.WebFetchAllowlistPrecheckResult` | Web fetch pre-check result |
| `agent.v1.WebFetchRequestResponse.Approved` | Web fetch approved |
| `agent.v1.WebSearchRequestResponse.Approved` | Web search approved |
| `agent.v1.ConnectScmRequestResponse.Approved` | SCM connection approved |
| `agent.v1.GenerateImageRequestResponse.Approved` | Image generation approved |
| `agent.v1.McpAuthRequestResponse.Approved` | MCP OAuth auth approved |
| `agent.v1.SwitchModeRequestResponse.Approved` | Mode switch approved |
| `agent.v1.SandboxPolicy` | The complete sandbox policy object |
| `agent.v1.SandboxPolicyMergeSources` | How policies are merged |
| `agent.v1.PermissionsAutoRunInstructions` | Natural language auto-run rules |
| `agent.v1.GetAllowedModelIntentsRequest` | Get what model intents are allowed |
| `agent.v1.GetAllowedModelIntentsResponse` | Response with allowed intents |

### aiserver.v1 — AI Server-Level Messages

| Message | Purpose |
|---|---|
| `aiserver.v1.AllowedMCPConfiguration` | MCP server allowlist config |
| `aiserver.v1.AllowedMCPServer` | A single allowed MCP server |
| `aiserver.v1.ApprovePluginRequest` | Request to approve a plugin/tool |
| `aiserver.v1.ApprovePluginResponse` | Response to plugin approval |
| `aiserver.v1.AutoRunSandboxingControls` | Auto-run sandbox configuration |
| `aiserver.v1.BlockDiffPatch` | A block-level diff patch |
| `aiserver.v1.BlockDiffPatch.Change` | Individual change in a block diff |
| `aiserver.v1.BlockDiffPatch.ModelWindow` | Model context window for diff |
| `aiserver.v1.CheckReferralAllowlistRequest` | Check if a referral is allowed |
| `aiserver.v1.CheckReferralAllowlistResponse` | Referral allowlist result |
| `aiserver.v1.CloudSetupBlocker` | Blocks that prevent cloud setup |
| `aiserver.v1.CloudSetupBlockerAction` | Actions to resolve cloud setup blockers |
