# Chapter 12: Internal Commands, Sidecar Architecture & Hidden Developer APIs

## Overview

By extracting all internal command IDs and configuration keys from `extension.js`, we've mapped Antigravity's **complete internal surface** — including undocumented developer-only commands, crash simulation tools, sidecar communication protocols, and terminal management systems.

---

## 1. Complete Internal Command Surface

The following commands are registered in the extension but are **not documented in any public API** or package.json contribution:

### Tracing & Debug Commands
| Command | Purpose |
|---|---|
| `antigravity.captureTraces` | Capture distributed traces for debugging agent operations |
| `antigravity.getManagerTrace` | Get the trace log from the Manager process |
| `antigravity.getWorkbenchTrace` | Get the trace log from the Workbench process |
| `antigravity.simulateSegFault` | **Force a segfault** — used for crash reporter testing |
| `antigravity.getLintErrors` | Get current lint errors for AI context |
| `antigravity.uploadErrorAction` | Upload an error/crash report manually |
| `antigravity.sendAnalyticsAction` | Send an analytics event manually |

The presence of `simulateSegFault` is extraordinary — it's a deliberate crash trigger for internal testing of the crash reporter pipeline.

### Terminal Management
| Command | Purpose |
|---|---|
| `antigravity.showManagedTerminal` | Show the AI-managed terminal panel |
| `antigravity.readTerminal` | Read current terminal output for AI context |
| `antigravity.onManagerTerminalCommandStart` | Hook: terminal command started |
| `antigravity.onManagerTerminalCommandData` | Hook: terminal command produced output |
| `antigravity.onManagerTerminalCommandFinish` | Hook: terminal command finished |
| `antigravity.onShellCommandCompletion` | Hook: shell command completed (more general) |
| `antigravity.updateTerminalLastCommand` | Update the "last command" tracking for AI context |

**Architecture Insight**: These hooks form a **complete terminal observation pipeline**. The AI agent can observe every command, every output stream, and the final completion — without requiring terminal integration hacks. This is done through the extension host, not process injection.

### Language Server Management
| Command | Purpose |
|---|---|
| `antigravity.persistentLanguageServer` | Check if persistent LSP mode is active |
| `antigravity.togglePersistentLanguageServer` | Toggle persistent LSP mode (keeps running after window close) |
| `antigravity.killLanguageServerAndReloadWindow` | Emergency LSP reset with full window reload |
| `antigravity.killRemoteExtensionHost` | Kill the remote extension host (for debugging remote hangs) |
| `antigravity.openPersistentLanguageServerLog` | View the persistent LSP log file |
| `antigravity.showLanguageServerCrashFullScreenView` | Show the full-screen LSP crash screen |
| `antigravity.showLanguageServerInitFailureFullScreenView` | Show the full-screen LSP init failure screen |

The two "full-screen view" commands reveal that Antigravity has **dedicated crash UI screens** for LSP failures — not just error popups, but full-screen takeovers that guide the user through recovery.

### Sidecar Architecture
| Command | Purpose |
|---|---|
| `antigravity.sidecar.sendDiffZone` | Send diff zones to the sidecar process |

**"Sidecar"** is a new undocumented subsystem. The single command `sidecar.sendDiffZone` suggests there's a parallel process (the "sidecar") that handles **diff zone rendering and management** separately from the main extension host. This is consistent with the pattern of isolating AI-generated diffs from the main thread.

### Auth & User Management
| Command | Purpose |
|---|---|
| `antigravity.handleAuthRefresh` | Trigger token refresh flow |
| `antigravity.pendingApiKeyMigration` | Check if API key migration is pending |
| `antigravity.hasShownIdeMigrationNudge` | Track if migration nudge has been shown |
| `antigravity.migrateWindsurfSettings` | Migrate Windsurf settings to Antigravity |
| `antigravity.resetOnboardingBackend` | Reset onboarding state to force re-onboarding |

### Onboarding & Browser Integration
| Command | Purpose |
|---|---|
| `antigravity.getBrowserOnboardingPort` | Get the local port for browser-based onboarding flow |
| `antigravity.openGenericUrl` | Open a URL in the system browser |
| `antigravity.openConversationWorkspaceQuickPick` | Open workspace picker for conversation context |

### Inline Suggestion State
| Command | Purpose |
|---|---|
| `antigravity.inlineSuggest.disableDebounce` | Disable suggestion debounce (developer/testing mode) |
| `antigravity.postApplyDecorationShown` | Track if post-apply decoration has been shown |
| `antigravity.tabJumpShown` | Track if tab-jump UI has been shown |

### Demo Mode
| Command | Purpose |
|---|---|
| `antigravity.startDemoMode` | Start demo/presentation mode |
| `antigravity.endDemoMode` | End demo/presentation mode |
| `antigravity.snooze` | Snooze AI suggestions temporarily |
| `antigravity.snoozeTime` | Get/set snooze duration |

### Other Internal State
| Command | Purpose |
|---|---|
| `antigravity.isCommandDisabled` | Check if a specific command is disabled (feature flags) |
| `antigravity.isFileGitIgnored` | Check if a file is git-ignored (for AI context filtering) |
| `antigravity.workspaceCascadeMap` | Access the workspace-to-Cascade session mapping |

---

## 2. Key Configuration Namespace Findings

The `codeiumDev.*` namespace reveals **developer/debug-only configuration**:

```json
{
  "codeiumDev.externalLanguageServerAddress": "...",
  "codeiumDev.externalLanguageServerLspPort": "...",
  "codeiumDev.forceDisableExperiments": ["expA", "expB"],
  "codeiumDev.forceEnableExperiments": ["expC"],
  "codeiumDev.forceEnableExperimentsWithVariants": {"exp": "variant"},
  "codeiumDev.languageServerBinaryPath": "/path/to/ls",
  "codeiumDev.languageServerEnv": {"ENV_VAR": "value"},
  "codeiumDev.machineLanguageServerBinaryPath": "/path/to/ls"
}
```

These keys allow developers to:
- Point the IDE to an **external, custom language server** for testing
- **Force-enable or force-disable experiments** (A/B test override)
- Set specific **variant values** for A/B experiments
- Use a **custom language server binary** instead of the bundled one

The `codeium.*` namespace for storage:
```json
{
  "codeium.installationId": "uuid-...",
  "codeium.snoozeEndTimeKey": 1700000000000,
  "codeium.hasOneTimeUpdatedUnspecifiedMode": true
}
```

---

## 3. Jetski Internal Config Keys

```json
{
  "jetski.cloudCodeUrl": "...",    // URL for Cloud Code integration
  "jetski-trace": "..."           // Distributed trace ID header
}
```

`jetski-trace` is an HTTP header name used to propagate distributed traces across Jetski's internal RPC calls — this is the telemetry correlation mechanism for cross-service debugging.

`jetski.cloudCodeUrl` is the integration point with Google Cloud Code, suggesting Jetski can run inside **Cloud Code for VS Code** or the **Cloud Shell** environment, not just standalone Antigravity IDE.

---

## 4. The "Cascade" Architecture (Confirmed)

The `antigravity.workspaceCascadeMap` command confirms the **Cascade** architecture: each workspace has its own Cascade session, and the extension maintains a map of `{workspaceId → cascadeSessionId}`. This is how Antigravity supports **multi-root and multi-window** AI session isolation.

---

## 5. Protobuf Transport Layer

Antigravity uses **Google Protocol Buffers** natively in the extension for all AI API communication:

- Full `google.protobuf.*` descriptor set embedded in the bundle
- `googleapis.com` type URL format for message type identification
- `google.protobuf.FeatureSet.*` includes experimental Edition-based features (Editions is protobuf's new language version system, still in preview)

This confirms Antigravity communicates with Google's backend via **gRPC/Connect-protocol over protobuf**, not REST/JSON. This is the same transport as internal Google services, meaning the Antigravity IDE communicates with Google's AI backends using the exact same protocol stack as internal Google engineers.

**Key types detected**:
- `google.protobuf.Struct` — used for semi-structured AI response payloads
- `google.protobuf.ListValue` — for streaming list responses
- `google.protobuf.FeatureSet.FieldPresence` — proto3 optional field tracking
- `google.colaboratory.intrinsic+json` — **Colab format support** (hidden Jupyter/Colab integration!)
- `google.colaboratory.module+javascript` — **JavaScript execution in Colab notebooks**
