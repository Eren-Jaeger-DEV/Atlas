# Chapter 8: Product Configuration, Extension Ecosystem & Proprietary API Proposals

## Overview

Cursor's `product.json` is the master configuration file that reveals their business strategy, infrastructure topology, and proprietary extension API surface. This is the single most information-rich file in the entire binary.

---

## 1. Infrastructure Topology (Backend URLs)

From `reactiveStorageService.js`, we mapped out Cursor's complete API infrastructure:

| Service | URL |
|---|---|
| Main Website | `https://cursor.com` |
| Primary Backend API | `https://api2.cursor.sh` |
| Telemetry Backend | `https://api3.cursor.sh` |
| Cmd-K Backend | `https://api3.cursor.sh` |
| Geo C++ Backend | `https://api4.cursor.sh` |
| C++ Config Backend | `https://api4.cursor.sh` |
| Repository Backend | `https://repo42.cursor.sh` |
| Origin Backend | `https://origin.cursor.com` |
| Staging Origin | `https://origin-staging.cursor.com` |
| **Agent (Privacy)** | `https://agent.api5.cursor.sh` |
| **Agent (Non-Privacy)** | `https://agentn.api5.cursor.sh` |
| Agent GCP US-West | `https://agent-gcpp-uswest.api5.cursor.sh` |
| Agent GCP EU-Central | `https://agentn-gcpp-eucentral.api5.cursor.sh` |
| Agent GCP AP-Southeast | `https://agentn-gcpp-apsoutheast.api5.cursor.sh` |

**Key Insight**: Cursor has a multi-region, privacy-aware agent routing system. The `api5.cursor.sh` domain hosts their most powerful inference infrastructure, with distinct privacy and non-privacy traffic lanes. The `api5` domain is different from the standard `api2/api3/api4` domains for the main IDE, indicating **dedicated AI agent clusters** isolated from general API traffic.

---

## 2. Telemetry: Statsig Feature Flags

Cursor uses **Statsig** as their feature flag and A/B testing platform:
- **Client Key**: `client-Bm4HJ0aDjXHQVsoACMREyLNxm5p6zzuzhO50MgtoT5D`
- **Log Event Proxy**: `https://api3.cursor.sh/tev1/v1` (proxied through their own infrastructure, preventing direct observation by Statsig)

This is a critical finding: **Cursor proxies all Statsig telemetry through their own servers**, ensuring that user feature flag data never directly hits Statsig's servers. This provides an additional layer of privacy protection for user data.

---

## 3. Extension Marketplace Strategy

Cursor operates its **own private extension marketplace** (`cursorapi.com`), separate from the official VS Code marketplace:
- **Gallery Service**: `https://marketplace.cursorapi.com/_apis/public/gallery`
- **Item URL**: `https://marketplace.cursorapi.com/items`
- **Resource Template**: `https://marketplace.cursorapi.com/{publisher}/{name}/{version}/{path}`
- **Control URL**: `https://api2.cursor.sh/extensions-control` (Cursor-controlled extension gating)

This means Cursor can **approve, block, or modify extensions** at the marketplace level. The `cannotImportExtensions` list confirms this:
- `github.copilot-chat` — blocked (direct competitor)
- `github.copilot` — blocked (direct competitor)
- `ms-vscode.remote-explorer` — blocked (uses official MS remote extensions)

---

## 4. Extension Replacement Map

Cursor silently **substitutes competitor/official extensions** with their own forks:

| Official Extension | Cursor Replacement |
|---|---|
| `ms-vscode-remote.remote-ssh` | `anysphere.remote-ssh` |
| `ms-vscode-remote.remote-containers` | `anysphere.remote-containers` |
| `ms-vscode-remote.remote-wsl` | `anysphere.remote-wsl` |
| `jeanp413.open-remote-ssh` | `anysphere.remote-ssh` |
| `ms-python.vscode-pylance` | `anysphere.cursorpyright` |
| `ms-vscode.cpptools` | `anysphere.cpptools` |
| `ms-dotnettools.csharp` | `anysphere.csharp` |

These replacements happen **silently** — the user may believe they have the official extension installed, but it's actually Cursor's fork, instrumented with `cursorTracing` API proposals for deep AI integration.

---

## 5. Proprietary API Proposals

Cursor registers several **exclusive API proposals** not available in standard VS Code. These are internal extension APIs that unlock capabilities only available to Anysphere's own extensions:

| API Proposal | Purpose |
|---|---|
| `cursor` | Core Cursor internal APIs (base proposal) |
| `cursorTracing` | Distributed tracing for AI agent operations |
| `cursorNoDeps` | Minimal dependency mode for security-sensitive extensions |
| `cursorAgentHost` | Host APIs for managing agent subprocesses |
| `cursorPseudoterminal` | Custom terminal for agent command execution |
| `control` | Internal process control APIs |

These proposals are why third-party extensions **cannot** replicate what Cursor's native extensions do — the APIs are simply unavailable unless whitelisted by Cursor's product configuration.

---

## 6. Cursor-Exclusive Built-in Extensions

Beyond the standard VS Code extensions, Cursor ships **17 custom extensions**:

| Extension | Purpose |
|---|---|
| `cursor-agent-exec` | Agent command/file execution with user permission gates |
| `cursor-agent-host` | Manages agent subprocess lifecycle |
| `cursor-agent-worker` | Web Worker for isolated agent computation |
| `cursor-always-local` | Environment sandboxing and permissions schema |
| `cursor-browser-automation` | Built-in MCP server for browser automation (Playwright) |
| `cursor-checkout` | Git branch/worktree checkout operations |
| `cursor-commits` | Commit attribution for agent-authored code |
| `cursor-deeplink` | Deep linking protocol handler (`cursor://`) |
| `cursor-explorer` | Enhanced file explorer with AI context |
| `cursor-file-service` | File system service for agent file access |
| `cursor-local-agent-runtime` | **Private Inference Host** — runs AI models locally, outside the workspace extension host |
| `cursor-mcp` | MCP protocol handler with `cursorTracing` |
| `cursor-ndjson-ingest` | NDJSON streaming parser for AI responses |
| `cursor-polyfills-remote` | Compatibility layer for remote environments |
| `cursor-resolver` / `cursor-resolver-helper` | Workspace resolution for custom remote environments |
| `cursor-retrieval` | Semantic code search/retrieval |
| `cursor-shadow-workspace` | Parallel, isolated workspace for speculative AI edits |
| `cursor-socket` | WebSocket client for real-time agent communication |
| `cursor-worktree-textmate` | TextMate grammar for worktree diff annotations |

**Most Significant**: `cursor-local-agent-runtime` runs AI inference as a **UI-kind extension** (outside the workspace host), meaning it can survive workspace crashes and hot-reloads. This is the foundation of Cursor's "local private mode".

---

## 7. Theme Library

Cursor ships 5 bespoke themes in `theme-cursor`:
1. `cursor-dark-color-theme.json` — The signature **Cursor Dark** (Nordic-inspired `#141414` background)
2. `cursor-dark-hc-color-theme.json` — High Contrast variant
3. `cursor-dark-midnight-color-theme.json` — Deeper black midnight variant
4. `cursor-light-color-theme.json` — Light variant
5. `cursor-light-colorblind-color-theme.json` — Colorblind-accessible light variant

**Cursor Dark Design Tokens** (extracted from `cursor-dark-color-theme.json`):
- Background: `#141414` (very dark, near-black)
- Active Editor: `#181818`
- Foreground: `#F0F0F0`
- Accent (blue): `#81A1C1`
- Accent (cyan): `#88C0D0`
- Error: `#E34671`
- Warning: `#F1B467`
- Success: `#3FA266`
- String tokens: `#e394dc` (soft purple-pink)
- Function tokens: `#efb080` (warm amber)
- Keyword tokens: `#82D2CE` (teal)
- Type tokens: `#87c3ff` (light blue)

This is a **Nordic-inspired color palette** (similar to Nord theme) but with more saturated token colors for better code readability.
