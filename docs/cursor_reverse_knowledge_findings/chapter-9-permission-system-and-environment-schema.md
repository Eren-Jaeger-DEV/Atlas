# Chapter 9: Cursor's Permission System, Environment Schema & Auto-Run Architecture

## Overview

Cursor's `cursor-always-local` extension validates two critical JSON configuration files: `.cursor/permissions.json` and `.cursor/environment.json`. These schemas define Cursor's **complete permission and sandboxing model** for autonomous AI agents.

---

## 1. The `.cursor/permissions.json` Schema (Complete)

This file controls **how Cursor's agent decides whether to run a tool automatically or ask for approval**.

### `approvalMode` (Core Decision Gate)

```json
{
  "approvalMode": "allowlist" | "unrestricted" | "manual"
}
```

| Mode | Behavior |
|---|---|
| `manual` | Maps to "Ask Every Time" — every tool call requires explicit user approval |
| `allowlist` | Only tools/commands on the explicit allowlist run automatically |
| `unrestricted` | Full "YOLO mode" — agent runs anything without asking (the "Auto-Run" mode) |

### `mcpAllowlist` — Fine-Grained MCP Tool Control

```json
{
  "mcpAllowlist": [
    "server:tool",        // Allow specific tool on specific server
    "server:*",           // Allow all tools on a server
    "*:tool",             // Allow a tool across all servers
    "*:*"                 // Allow everything (equivalent to unrestricted for MCP)
  ]
}
```

Pattern syntax is strictly validated: `^[^:*]+:[^:*]+$|^[^:*]+:\*$|^\*:[^:*]+$|^\*:\*$`

### `terminalAllowlist` — Command Pattern Allowlist

```json
{
  "terminalAllowlist": [
    "npm run *",          // Glob patterns for terminal commands
    "git *",
    "python *.py"
  ]
}
```

Terminal commands are matched against these patterns. Only matching commands run automatically in `allowlist` mode.

### `autoRun` / `autoReview` — Natural Language Rules

The most powerful and unique feature: **AI-evaluated natural language permission rules**:

```json
{
  "autoRun": {
    "allow_instructions": [
      "Safe to run: Read-only file operations",
      "Safe to run: npm install in the project root"
    ],
    "block_instructions": [
      "Must block: Any command that modifies git history",
      "Must block: Deleting files outside the project directory"
    ]
  }
}
```

**Architecture Insight**: These instructions are evaluated by an **AI review step** (Auto-review) before each tool call. Instead of hardcoded rules, Cursor uses a mini-AI-review-agent that reads the natural language instructions and decides whether the proposed action is allowed. This is a **meta-AI that governs the main AI**.

The `autoReview` key is identical in schema — it's a currently undocumented alias that may be the newer canonical name.

---

## 2. The `.cursor/environment.json` Schema (Complete)

This file defines a **complete development environment specification** that Cursor's agent can provision and run inside. This is Cursor's version of a devcontainer, but with deep AI integration.

### Container Configuration

```json
{
  "build": {
    "dockerfile": "./Dockerfile",          // Path to Dockerfile
    "dockerfileContents": "FROM node...",  // OR inline Dockerfile content
    "context": "./"                        // Build context path
  },
  "snapshot": "snap-abc123",              // Pre-built snapshot ID
  "agentCanUpdateSnapshot": true          // Allow agent to persist environment changes
}
```

`agentCanUpdateSnapshot` is extraordinary: the agent can **update the base snapshot**, meaning it can make permanent changes to the development environment itself. This enables self-modifying workspaces.

### Process & User Configuration

```json
{
  "name": "My Dev Environment",
  "user": "developer",                    // Run environment as this user
  "install": "npm install",              // Startup dependency refresh command
  "start": "npm run dev"                 // Service start command
}
```

### Repository Dependencies

```json
{
  "repositoryDependencies": [
    "github.com/org/frontend",
    "github.com/org/backend"
  ]
}
```

These repos get **included in the generated GitHub access token** for the environment — the agent can access multiple repositories securely.

### MCP Server Allowlist (Environment-Scoped)

```json
{
  "mcpServerAllowlist": [
    { "serverUrl": "https://mcp.example.com" },    // HTTP MCP server
    { "command": "npx @acme/mcp-server" }           // stdio MCP server
  ]
}
```

This is a **nested security layer**: the environment can restrict which MCP servers the agent is allowed to use, independent of the global permissions.json. Empty or omitted = unrestricted.

### Port Forwarding

```json
{
  "ports": [
    { "name": "web server", "port": 3000 },
    { "name": "api", "port": 8080 }
  ]
}
```

Similar to devcontainer port forwarding, but exposed to the agent with descriptive names.

### Terminal Definitions (Agent-Visible)

```json
{
  "terminals": [
    {
      "name": "dev server",
      "command": "npm run dev",
      "description": "Runs the Next.js development server on port 3000"
    },
    {
      "name": "test watcher",
      "command": "npm test -- --watch",
      "description": "Runs Jest in watch mode"
    }
  ]
}
```

`description` is explicitly marked as **"displayed to the agent"** — these descriptions become part of the agent's tool context, letting it understand which terminal to use for which task.

---

## 3. The Cursor Permission Model Architecture

```
User Action (agent wants to run a tool)
         |
         v
   approvalMode check
   /       |        \
manual  allowlist  unrestricted
  |         |           |
Ask     MCP/terminal   Execute
every   allowlist      immediately
time    check
          |
     autoReview AI
     evaluates
     allow/block
     instructions
          |
     Allow or Ask
```

### The `UNSAFE_ALWAYS_ALLOWED` State

From the extracted code in the earlier chapter:
```js
{state: HR(u.state, Bo.UNSAFE_ALWAYS_ALLOWED), hasToolCall: u.hasToolCall}
```

There's an internal state value `UNSAFE_ALWAYS_ALLOWED` — prefixed with `UNSAFE_` to make clear it bypasses the permission system entirely. This is the internal flag set when the user has granted "unrestricted" approval mode.

### The `shouldBlockMcp` Function

```js
const r = !t.skipApproval && await n.permissionsService.shouldBlockMcp(e, t);
if (r) return await X(r, {onNeedsApproval: async (e, r) => {
  if ("...") { ... }
}});
```

The permission check:
1. Skippable with `skipApproval: true` flag
2. Returns a blocking reason `r` if blocked
3. If blocked, calls `onNeedsApproval` callback — which shows the UI approval dialog

### Subagent Architecture (Discovered from Code)

From the extracted code:
```js
const {subagentConfig, effectiveReadonly, useAskModeForSubagent, 
       resolvedModelId, subagentIdToResume, subagentId,
       isSelfForkRequested, effectiveEnvironment} = T
```

Key subagent concepts:
- `isSelfForkRequested` — an agent can **fork itself** into a parallel subagent
- `subagentIdToResume` — subagents can be **resumed** across sessions
- `effectiveReadonly` — subagents can be spawned in read-only mode
- `useAskModeForSubagent` — subagents can be restricted to always-ask mode
- `parentRequestedModelName` / `parentMaxMode` — subagents inherit model preferences from parent

---

## 4. The `background-composer` Remote Authority

From `cursor-always-local/package.json`:
```json
"activationEvents": ["onStartupFinished", "onResolveRemoteAuthority:background-composer"]
```

The `background-composer` is a **virtual remote authority** — a custom workspace type that appears as a "remote" to VS Code but runs locally. This is how Cursor runs background agents that have their own isolated workspace context without opening a full editor window.

---

## 5. Web Search & Fetch Integration

From the extracted code:
```js
function s4(e, t) { return !!e && (t?.webSearchEnabled ?? !0) }
function i4(e) { return (e.webFetchAvailable ?? !1) && e.webFetchEnabledByUser }
```

Cursor has two distinct web capabilities:
- `webSearchEnabled` — web search via the agent (Perplexity/Bing integration)
- `webFetchAvailable && webFetchEnabledByUser` — raw URL fetching must be **enabled by the user explicitly**

Web fetch is a user-opt-in feature, while web search is on by default (opt-out).

---

## 6. Secret Redaction

```js
function u4(e) { return !0 === e?.env?.secretRedactionEnabled }
```

Cursor has a configurable **secret redaction** system in the agent environment. When enabled, secrets (API keys, tokens, passwords) are automatically scrubbed from tool outputs before they're included in the AI context.
