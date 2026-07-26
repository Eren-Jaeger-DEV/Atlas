# Chapter 10: Cursor Extension Architecture Deep Dive — Extensions, Patches & Custom APIs

## Overview

Cursor ships 20 exclusive extensions that form its complete agent execution pipeline. This chapter maps each extension's role, activation conditions, and API surface — culminating in a detailed look at Cursor's proprietary patches to the MCP SDK.

---

## 1. Complete Extension Map

### Tier 1: Core Agent Execution

| Extension | Description | Key API Proposals |
|---|---|---|
| `cursor-agent-exec` | Agent execution with user permission gates | `cursorAgentHost`, `cursorPseudoterminal`, `cursorTracing`, `control` |
| `cursor-agent-host` | Manages agent subprocess lifecycle | `cursorAgentHost`, `cursorTracing`, `control` |
| `cursor-agent-worker` | Web Worker for isolated agent computation | `cursor` |
| `cursor-local-agent-runtime` | **Private Inference Host** — runs AI locally in UI process | `cursor` |

### Tier 2: File & Code Operations

| Extension | Description | Key API Proposals |
|---|---|---|
| `cursor-shadow-workspace` | Parallel isolated workspace for speculative edits | `cursor` |
| `cursor-file-service` | File system service for agent access | (none) |
| `cursor-retrieval` | Code indexing and semantic search | `cursor`, `textSearchProvider2`, `cursorNoDeps` |
| `cursor-explorer` | Enhanced file explorer with AI context | `cursor` |
| `cursor-checkout` | Git branch/worktree checkout for agents | `cursor` |

### Tier 3: Networking & Communication

| Extension | Description | Key API Proposals |
|---|---|---|
| `cursor-mcp` | MCP protocol handler | `cursor`, `cursorTracing`, `control` |
| `cursor-socket` | **TCP/TLS socket provider** | `cursor`, `cursorNoDeps` |
| `cursor-browser-automation` | Built-in MCP browser automation | `cursor`, `cursorTracing`, `control` |
| `cursor-deeplink` | Deep link URI handler (`cursor://`) | `cursor`, `control`, `externalUriOpener` |
| `cursor-ndjson-ingest` | NDJSON streaming parser for AI responses | (proprietary) |

### Tier 4: Telemetry & Metrics

| Extension | Description | Key API Proposals |
|---|---|---|
| `cursor-commits` | **Online metrics tracking** — tracks requests and commits | `cursor`, `cursorTracing`, `cursorNoDeps`, `control` |
| `cursor-always-local` | Experimentation features + environment/permissions schemas | `cursor`, `control`, `externalUriOpener`, `contribSourceControlInputBoxMenu`, `textDocumentTextLength` |

### Tier 5: Remote & Workspace

| Extension | Description | Key API Proposals |
|---|---|---|
| `cursor-resolver` | Custom remote authority resolution | `cursor` |
| `cursor-resolver-helper` | Helper for workspace resolution | `cursor` |
| `cursor-polyfills-remote` | Compatibility layer for remote environments | `cursor` |
| `cursor-worktree-textmate` | TextMate grammar for worktree diffs | (grammar) |

---

## 2. The `cursor-commits` Telemetry System

The `cursor-commits` extension is described as "Tracks **requests and commits** for Cursor **online metrics**." This is Cursor's internal performance and usage telemetry system, using:
- `cursorTracing` — for distributed tracing
- `cursorNoDeps` — minimal dependency mode (runs in security-sensitive contexts)

The reference to "online metrics" suggests this powers Cursor's real-time dashboards and SLA monitoring.

---

## 3. The `cursor-socket` TCP/TLS Extension

`cursor-socket` is a **TCP/TLS socket provider** for Cursor extensions. Key characteristics:
- **Activation**: `onResolveRemoteAuthority:background-composer` and `onStartupFinished`
- Uses `cursorNoDeps` — runs without any external dependencies
- The `background-composer` activation means it's active **whenever a background agent workspace is created**

This is the low-level transport layer for real-time agent communication — likely the WebSocket/TCP connection from the background composer to the main Cursor backend (`api5.cursor.sh`).

---

## 4. The `cursor-retrieval` Semantic Search System

`cursor-retrieval` uses the exclusive `textSearchProvider2` API proposal (not available to third parties) to implement:
- **Semantic code indexing** — building vector embeddings of the codebase
- **Text search** — fast text search integrated into the agent's retrieval system
- **Hybrid search** — combining semantic and text search results

The `cursorNoDeps` mode ensures the indexer can run in sandboxed environments without external network calls.

---

## 5. Cursor's Patch to the MCP SDK (v1.25.1)

Cursor maintains a **forked/patched version** of `@modelcontextprotocol/sdk@1.25.1` with several production fixes:

### Patch 1: OAuth Concurrent Refresh Race Condition Fix

**Problem**: Multiple MCP connections to the same server could simultaneously trigger OAuth token refresh, causing race conditions.

**Cursor's Solution — "Sibling Already Refreshed" Protocol**:
```js
// [CURSOR PATCH] Allow the provider to coordinate concurrent refreshes
await provider.prepareForRefresh?.();
// ...
// [CURSOR PATCH] Re-throw SiblingAlreadyRefreshedError so the FSM
// can reconnect with the winner's fresh tokens instead of starting
// a redundant full re-authorization flow.
if (error && error.name === 'SiblingAlreadyRefreshedError') { throw error; }
```

New error types added:
- `SiblingAlreadyRefreshedError` — thrown by the "losing" refresher to tell other connections to use the "winner's" fresh tokens
- `OAuthRefreshTransientError` — wraps network/transient errors, prevents full re-auth

New provider lifecycle hooks:
- `provider.prepareForRefresh?.()` — acquire a refresh lease before attempting refresh
- `provider.releaseRefreshLeaseOnError?.(error)` — release the lease if the refresh fails
- `provider.isRetryableOAuthRefreshError?.(error)` — provider-specific retry logic
- `provider.getOAuthHttpFetch?.()` — separate HTTP client for OAuth (vs. data fetches)
- `provider.logRefreshCatchBranch?.(...)` — detailed telemetry for the catch branch

### Patch 2: SSE Reconnection Error Handling

**Problem**: When SSE (Server-Sent Events) reconnections fail with `SiblingAlreadyRefreshedError`, the original error information was swallowed and replaced with a generic reconnection error message.

**Fix**: Preserve the original error object and use the `.cause` property for proper error chain tracking in both reconnection paths.

---

## 6. The `background-composer` Remote Authority

Multiple extensions activate on `onResolveRemoteAuthority:background-composer`:
- `cursor-always-local`
- `cursor-socket`

This is a **virtual remote authority** that creates an isolated workspace "remote" running locally. When the background composer is active, these extensions provide:
- The socket transport layer (`cursor-socket`)
- The local permissions and environment schema (`cursor-always-local`)

This architecture allows background agents to run with a fully isolated workspace context — they appear to VS Code's extension system as if they were a "remote" machine.

---

## 7. `textDocumentTextLength` — The Proprietary Token Counter

`cursor-always-local` uses `textDocumentTextLength` — a custom VS Code API proposal that returns the **text length of documents** without loading them into memory. This is used for:
- Fast token estimation (to decide if context fits in the model's context window)
- Determining whether to include a file in the agent's context based on size
- Avoiding memory spikes from loading large files just to count their tokens

---

## 8. `cursorNoDeps` — The Minimal Security Mode

Several critical extensions use `cursorNoDeps`:
- `cursor-commits`
- `cursor-retrieval`  
- `cursor-socket`

This proposal signals that the extension runs with **zero external dependencies** — no npm packages that could be compromised or that make external network calls. It's used for extensions that run in highly trusted positions (telemetry, metrics, transport) where supply chain security is critical.
