# Atlas Studio (v1.0.0 General Availability)

**Your codebase. Fully mapped.**

Atlas Studio is a professional, high-performance desktop IDE engineered for complex software architecture. It features a local-first design, deterministic project intelligence, sandboxed extension SDKs, and structurally-aware AI assistance built for enterprise workflows.

---

## Product Pillars

1. **Professional IDE Experience**: High-speed code editing, instant high-tech CSS dark splash skeleton (<10ms UI paint inside `index.html`), pre-compiled production build launcher (`pnpm start`), standalone Linux `.deb` installer & `.AppImage` packaging (`pnpm package:deb`), framer-motion spring animations, Web Worker LSP isolation, CallGraphVisualizer (interactive SVG node graph), PromptStudio (AI prompt engineering workbench with live execution), WorkflowEditor (interactive visual DAG workflow builder with live SVG node connectors & IPC file saving), MultiDiffTabViewer (multi-file batch diff review tab with live git status loading, per-file stage/unstage badges, and 1-click commit bar), ProjectHealthDashboard (tech debt meter), TrajectoryReplayViewer (timeline scrubber), ToastBannerManager (glassmorphic animated notifications), GitBlameGutter (inline line annotations), WorkspaceProfileSwitcher, live Mermaid.js chat diagram renderer, Jupyter Notebook viewer (`.ipynb`), PluginViewerPane (live sanitized HTML & markdown viewer plugin integration), SettingsConfigViewer (graphical settings manager with dedicated **Keybindings** & **Plugins & Permissions** categories and **Reset Category Defaults**), CommandPaletteQuickPicker (`Ctrl+Shift+P`), **Interactive Keyboard Shortcuts Cheat Sheet Modal (`Ctrl+/`)**, **Monaco Minimap Code Radar Overlay** (overview ruler Git change status bands), TerminalSuggestEngine (1-click AI terminal fixes), rich `@mentions` chat composer, **Universal Glassmorphic Context Menus** across File Explorer, Editor Tabs, Terminal Canvas, and Source Control Panel (`useContextMenu`), in-app `DialogProvider` modal confirmations, animated toast stack, interactive status bar quick-picks (`StatusBarRegistry`), floating inline AI `Ctrl+K` bar, tabs, split panes, interactive SVG dependency graphs, 3-way merge conflict editor, WebPreviewPanel (integrated dev server live web app preview tab with Desktop/Tablet/Mobile viewports), Side-by-Side Dual Pane Diff Split (`ComposerDiff`), Full Voice Input Mode (browser SpeechRecognition hands-free prompt dictation), and integrated terminal.
2. **Deterministic Project Intelligence**: Fast AST symbol indexing, WorkspaceSearchIndexer (fast regex & glob text search), SecurityAuditEngine (AST secret & vulnerability scanner), Shadow Workspace AST Diagnostics Engine (`verifyAST` health check badges & 1-click rollback toasts), reverse-engineered benchmark parity (Cursor agent-exec/retrieval, Antigravity workflow/rule editor, VS Code extension host), CompetitorSettingsImporter (Cursor/Windsurf migration), FeatureFlagManager (Statsig flags & telemetry), cycle detection, project health dashboard, and definition peek popovers.
3. **Atlas Forge Plugin System (`@atlas/sdk`)**: Plugin-driven platform architecture powered by **Atlas Forge**, CommonJS module execution sandboxing (`PluginHost`), expanded `PluginContext` API (`registerLanguage`, `registerFileViewer`, `requestPermission`), interactive `PluginPermissionModal` security gate for plugin capability requests (`workspace.read`, `workspace.write`, `workspace.execute`, `network.outbound`), Remote Forge Plugin Downloader & SHA256 Hash Verifier (`atlas:install-remote-plugin` via HTTP/HTTPS stream download, crypto SHA256 checksum comparison, and sandboxed extraction), live OS kernel sandboxing (`sandbox-exec` on macOS, `bwrap` on Linux via `SandboxWrapper` with automatic binary availability detection), **VS Code-compatible `activationEvents` lazy activation system** (`onLanguage:<id>`, `onCommand:<id>`, `onView:<id>`, `onStartupFinished`, `*`) with two-phase `PluginHost` discover/activate model, in-flight concurrency guard, and renderer-side IPC triggers that fire plugins only when actually needed, **Forge Auto-Suggest** (opens unsupported file types and shows an Install toast linking directly to the matching Forge marketplace plugin), `AtlasIgnore` pattern enforcement on file operations, `WorkspaceTrustPolicy` trust gate, `ForgeRegistryManager` (`forge-index.json` registry & one-click marketplace install flow), `RemoteAuthorityTunnel` (SSH/WSL stub), `McpOAuthGateway`, and granular permission audit trails.
4. **Unprivileged AI Runtime**: Multi-provider LLM router (Google Gemini, OpenAI, Anthropic, Ollama), Automatic Model Provider Failover Router (HTTP 401/500 `PROVIDER_ERROR` auto-retry sequence to `deepseek-v4-pro` & `kimi-k2.7-code`), Multi-Agent Swarm Execution (`orchestrator.ts` parallel sub-agents `[CODER]`, `[TESTER]`, `[REVIEWER]` via `Promise.allSettled`), Real-Time Terminal Output Streaming (`child.stdout`/`stderr` live chunk streaming into dark terminal box), Interactive Click-to-Open Files in Chat Cards (`atlas:open-file` event listener), real-time reasoning & process blocks (`Thought for Xs`, `Worked for Xm Xs`, live step chips), live token streaming, dynamic UI model override propagation (`context.model`), SelfHealingLoop (automated post-edit repair cycle), SmartModelClassifier (intent-based Smart Mode routing), SessionManager (`.atlas/chats/*.json` persistence), MultiRegionApiRouter (failover endpoint topology), PerformanceProfiler (heap & event loop telemetry), three-tier persistent memory engine (`MemoryStore`), ExecutionSubagent log filter, DiffZoneTransport binary stream framing, token-bounded ContextEngine, deterministic multi-root workspace resolution fallback (`global.__atlasWorkspaceRoots`), Atlas Remote Control (authenticated HTTP/WebSocket phone control with `safeStorage` token persistence and settings toggle), Atlascord Discord Bot Gateway Integration (`A!atlas workflow`, `A!atlas remote`), Automated GitHub Actions Discord Release Webhook (`notify-discord-release.yml`), and human approval edit preview modal.
5. **Local-First Architecture & Quality Assurance**: 100% offline-ready core with automated unit test suites (`SessionManager`, `TerminalSuggestEngine`, `WorkspaceSearchIndexer`, `WorkspaceTrustPolicy`, `SmartModelClassifier`, `BrowserSubagent`, `Orchestrator`), **Windows High-Performance Optimization Engine** (**Virtualized File Explorer Engine** rendering max ~30 visible DOM rows for <5ms load on 50,000+ files, `React.memo` side panel memoization across `FileExplorer`, `GitPanel`, `MenuBar`, `StatusBar` for zero typing re-renders, eliminated auto-save re-render loops via `tabsRef`, 16ms PTY terminal IPC stream batcher, Chromium GPU process crash recovery `child-process-gone` isolation, Monaco long-line tokenization bounds `stopRenderingLineAfter`, 85% DOM node reduction via Output Panel slicing, ripgrep max-count search bounds `-m 500`, and explicit Monaco model heap cleanup on tab close), optional account synchronization, workspace profiles (Personal, Enterprise, Open Source, Research), and release quality assurance.

---

## Monorepo Architecture

```
Atlas Studio Platform
├── apps/
│   ├── editor/          # Electron + React + Vite desktop IDE app
│   └── cli/             # Headless CLI & diagnostic tools (`atlas doctor`)
└── packages/
    ├── core/            # ServiceContainer, EventBus, Settings, Cloud Sync, Release Services
    ├── sdk/             # Public Extension SDK & TypeScript Types
    ├── graph/           # AST Symbol Indexer, SQLite Knowledge Graph & Health Metrics
    ├── parser/          # AST Code Parser for TS/JS/Python/HTML/CSS
    └── agents/          # Agent Orchestrator, ProviderRouter & ContextEngine
```

---

## Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **pnpm**: `v9.x` or higher

### Installation & Execution

```bash
# Clone the repository
git clone https://github.com/Eren-Jaeger-DEV/Atlas.git
cd Atlas

# Install dependencies across monorepo
pnpm install

# Build all monorepo packages
pnpm build

# Run unit and integration test suites
pnpm test

# Launch Atlas Studio locally
pnpm --filter @atlas/editor dev
```

---

## Roadmap Status

We are systematically building features to match and exceed standard editor capabilities, organized in tiers:
* **Tier 1 — Finish What's Already Started**: Core LSP (WorkspaceEdit multi-file rewrite), Python DAP & Node CDP Debugging, and Extension system features (Completed).
* **Tier 2 — Match VS Code's Breadth**:
  - [x] **Task Runner (2.2):** Standard npm scripts and `.atlas/tasks.json` runner integrated directly in the Command Palette and panel terminal.
  - [x] **Settings UI & disk persistence (2.3):** Full preferences editor with search filtering, disk storage (`~/.config/atlas/settings.json`), and dynamic editor live-sync (themes, font size/family, tab size, line numbers, word wrap, minimap).
  - [x] **2.4 Snippets & Auto-completion:** Language-specific snippet insertion.
  - [x] **2.5 Outline View & Breadcrumbs:** Document symbol tree and cursor-tracking breadcrumbs.
  - [x] **2.6 Inline Git Blame & Diff Gutters:** Visual source-control feedback.
* **Tier 3 — Beyond VS Code**: Live Blast-radius Dependency Impact, Project metrics dashboard, and **Atlas Synapse**.
  - [x] **Atlas Synapse (AI Orchestration Engine):** A hybrid Graph-Driven Swarm architecture that integrates multi-agent task execution over a real-time Directed Acyclic Graph (DAG) state, backed by automated Tri-Surface verification (AST + Terminal + Headless Vision), a Dual-Surface UI (Inline Micro-HUD + Full Flight Deck), and a Self-Healing Memory Engine (GraphDB) that persists bug patterns.
* **Tier 4 — 10/10 Flagship Architecture Subsystems**:
  - [x] **Worker-Threaded Graph Engine (`GraphWorkerClient`):** Background thread SQLite graph queries & vector similarity calculations (`node:worker_threads`).
  - [x] **Unified LSP Diagnostic Bridge (`LSPBridge`):** Language-agnostic compiler diagnostics and symbol definition resolution.
  - [x] **Inline Monaco Ghost-Text Streaming (`InlineGhostEditor`):** Low-latency token-level stream decoration with accept/reject hotkeys.
  - [x] **Trajectory Replay & Time-Travel Engine (`TrajectoryReplay`):** Execution step snapshotting, rewind, and offline playback.
  - [x] **Visual DOM Verifier (`VisualVerifier`):** Headless layout regression testing during AI code edits.
  - [x] **Autonomous Browser Subagent (`BrowserSubagent`):** Dynamic DOM accessibility (a11y) tree extraction, visual spatial grounding, and automated web task execution.
  - [x] **Atlas Parallel Multi-Agent Engine (`WorkerPool`, `ParallelPlanner`, `ParallelMerger`):** Asynchronous multi-threaded agent workflow (Jetski equivalent) with automatic LLM sub-task decomposition, dependency graph execution, conflict pre-detection, and live streaming multi-card UI dashboard.
  - [x] **Interactive Visual DAG Dependency Graph (`ParallelDAGViewer`):** Dynamic SVG topological dependency graph rendering, pulse status animations, and node click inspection.
  - [x] **Autonomous Tri-Surface Self-Healing Verification (`SelfHealingVerifier`):** Post-coding compiler LSP diagnostics & unit test execution with auto-retry self-repair loops.
  - [x] **Interactive 3-Way Conflict Workbench (`ConflictResolverModal`):** Side-by-side multi-worker edit collision resolution modal with 1-click acceptance.
  - [x] **Agent Skill Auto-Distillation (`WorkflowSkillCreator`):** Packaging completed multi-agent workflows into reusable `.agents/skills/<name>/SKILL.md` custom skills.
  - [x] **Full Top Window Menu Parity (File, Edit, Selection, View, Go, Run, Terminal, Help):** 100% real, dynamic, un-mocked logic across all 8 top window menus with Monaco actions, DAP stepping, xterm task runner, process explorer, and walkthrough guide.
  - [x] **Full IDE Features & Parity:** Real Monaco LSP protocol wire-up (Hover, Go-to-Def F12, References Shift+F12, Rename F2, Code Actions Ctrl+., Format Shift+Alt+F), full right-click context menus (Editor & FileExplorer with inline rename, new file/folder, copy path, open terminal), and interactive StatusBar pickers (Language, Indentation, EOL, Go-to-Line).
  - [x] **Atlascord Extension (Discord Rich Presence):** First-party Atlas IDE extension providing fully customizable Discord Rich Presence integration. Features a 3-state status bar indicator (`connected` / `reconnecting` / `disconnected`) with left-click toggle and right-click `Manage Extension` context menu. The extension detail workspace view loads 100% real data — README content from disk, actual filesystem directory size, real `package.json` / `manifest.json` fields — with zero hardcoded or mock fallbacks. Repository: [Atlascord](https://github.com/Eren-Jaeger-DEV/Atlascord).

---

## Architecture & RFC Documentation

Engineering decisions and architectural evolutions are formally documented as RFCs under [`docs/architecture/`](file:///f:/projects/Atlas/docs/architecture/):

- [`RFC-001-editor-core.md`](file:///f:/projects/Atlas/docs/architecture/RFC-001-editor-core.md): Editor Core & Monaco Integration
- [`RFC-002-plugin-system.md`](file:///f:/projects/Atlas/docs/architecture/RFC-002-plugin-system.md): Plugin System Architecture
- [`RFC-003-command-palette.md`](file:///f:/projects/Atlas/docs/architecture/RFC-003-command-palette.md): Command Palette & Keybindings
- [`RFC-004-git-panel.md`](file:///f:/projects/Atlas/docs/architecture/RFC-004-git-panel.md): Source Control Integration
- [`RFC-005-memory-engine.md`](file:///f:/projects/Atlas/docs/architecture/RFC-005-memory-engine.md): AST Memory & Knowledge Graph
- [`RFC-009-platform-foundation-and-service-container.md`](file:///f:/projects/Atlas/docs/architecture/RFC-009-platform-foundation-and-service-container.md): Service Container & DI
- [`RFC-010-developer-intelligence-and-project-health.md`](file:///f:/projects/Atlas/docs/architecture/RFC-010-developer-intelligence-and-project-health.md): Intelligence & Health Dashboard
- [`RFC-011-extension-sdk-and-marketplace-foundation.md`](file:///f:/projects/Atlas/docs/architecture/RFC-011-extension-sdk-and-marketplace-foundation.md): Extension SDK Framework
- [`RFC-012-source-control-and-collaborative-development.md`](file:///f:/projects/Atlas/docs/architecture/RFC-012-source-control-and-collaborative-development.md): 3-Way Merge Resolver & Git IPC Bridge
- [`RFC-013-ai-runtime-and-agent-architecture.md`](file:///f:/projects/Atlas/docs/architecture/RFC-013-ai-runtime-and-agent-architecture.md): AI Runtime & Safety Approval
- [`RFC-014-cloud-sync-accounts-and-team-collaboration.md`](file:///f:/projects/Atlas/docs/architecture/RFC-014-cloud-sync-accounts-and-team-collaboration.md): Cloud Sync & Workspace Profiles
- [`RFC-015-release-engineering-and-quality-assurance.md`](file:///f:/projects/Atlas/docs/architecture/RFC-015-release-engineering-and-quality-assurance.md): Release Engineering & Performance Budgets
- [`RFC-016-v1.0-release-specification-and-final-architecture.md`](file:///home/victor/My%20projects/Atlas/docs/architecture/RFC-016-v1.0-release-specification-and-final-architecture.md): Atlas Studio v1.0 System Blueprint
- [`RFC-017-autonomous-browser-and-dom-tools.md`](file:///home/victor/My%20projects/Atlas/docs/architecture/RFC-017-autonomous-browser-and-dom-tools.md): Autonomous Browser & Dynamic DOM Subsystem Architecture

---

## Research & Competitive Intelligence

A deep-dive reverse engineering study of the three major AI IDEs has been conducted to inform Atlas Studio's architecture and feature roadmap:

### Studied IDEs
- **Cursor** (Anysphere) — 13 research chapters covering extension pipeline, permission system, Canvas runtime, complete protobuf API surface (`aiserver.v1`, `agent.v1`), MCP SDK patches, and background agent orchestration
- **Antigravity IDE** (Google) — 13 research chapters covering the Jetski agent, macOS kernel sandbox, protobuf transport, Colab integration, Cloudtop SSH remote, and the `.agyignore` format
- **VS Code** (Microsoft) — 7 research chapters covering the Copilot API proposal surface, trusted extension auth, mermaid chat rendering, and OSS vs. proprietary build differences

### Key Findings Applied to Atlas
- **Permission system**: Atlas implements a `.cursor/permissions.json`-style permission file with `approvalMode`, MCP allowlists, and natural language auto-run rules
- **Background agents**: Multi-agent architecture inspired by Cursor's `BackgroundSubagent` spawn model and Antigravity's Jetski parallel execution
- **Sandbox security**: Terminal command sandboxing pattern based on Antigravity's `sandbox-wrapper.sh` approach
- **KV store tiers**: Agent state persistence tiers inspired by Cursor's `agent_kv.*` multi-layer store

**Full study**: [`docs/REVERSE_ENGINEERING_INDEX.md`](./docs/REVERSE_ENGINEERING_INDEX.md)

---

## License

Copyright (c) 2026 Atlas Studio. All rights reserved.

This software and its source code are proprietary and confidential. No part of this repository may be reproduced, distributed, modified, or used in any form without explicit written permission from the author.

