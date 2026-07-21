# Atlas Studio (v1.0.0 General Availability)

**Developer-First Independent IDE Platform**

Atlas Studio is a modern, high-performance desktop IDE designed around local-first engineering, deterministic project intelligence, sandboxed extension SDKs, unprivileged AI assistance, and professional developer tools.

---

## 🌟 Product Pillars

1. **Professional IDE Experience**: High-speed code editing, tabs, split panes, interactive SVG dependency graphs, 3-way merge conflict editor, and integrated terminal.
2. **Deterministic Project Intelligence**: Fast AST symbol indexing, cycle detection, project health dashboard, and definition peek popovers.
3. **Sandboxed Extension SDK (`@atlas/sdk`)**: Secure plugin framework with granular permission gates (`workspace.read`, `workspace.write`, `terminal.execute`, `network.fetch`).
4. **Unprivileged AI Runtime**: Multi-provider LLM router (Google Gemini, OpenAI, Anthropic, Ollama), token-bounded ContextEngine, and human approval edit preview modal.
5. **Local-First Architecture**: 100% offline-ready core with optional account synchronization, workspace profiles (Personal, Work, Open Source, Research), and release quality assurance.

---

## 🏗️ Monorepo Architecture

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

## 🚀 Getting Started

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

## 🗺️ Roadmap Status

We are systematically building features to match and exceed standard editor capabilities, organized in tiers:
* **Tier 1 — Finish What's Already Started**: Core LSP (WorkspaceEdit multi-file rewrite), Python DAP & Node CDP Debugging, and Extension system features (Completed).
* **Tier 2 — Match VS Code's Breadth**:
  - [x] **Task Runner (2.2):** Standard npm scripts and `.atlas/tasks.json` runner integrated directly in the Command Palette and panel terminal.
  - [x] **Settings UI & disk persistence (2.3):** Full preferences editor with search filtering, disk storage (`~/.config/atlas/settings.json`), and dynamic editor live-sync (themes, font size/family, tab size, line numbers, word wrap, minimap).
  - [x] **2.4 Snippets & Auto-completion:** Language-specific snippet insertion.
  - [x] **2.5 Outline View & Breadcrumbs:** Document symbol tree and cursor-tracking breadcrumbs.
  - [x] **2.6 Inline Git Blame & Diff Gutters:** Visual source-control feedback.
* **Tier 3 — Beyond VS Code**: Live Blast-radius Dependency Impact, AI Timeline logs, unique design elements, and project metrics dashboard.

---

## 📖 Architecture & RFC Documentation

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
- [`RFC-016-v1.0-release-specification-and-final-architecture.md`](file:///f:/projects/Atlas/docs/architecture/RFC-016-v1.0-release-specification-and-final-architecture.md): Atlas Studio v1.0 System Blueprint

---

## 📜 License

Copyright (c) 2026 Atlas Studio. All rights reserved.

This software and its source code are proprietary and confidential. No part of this repository may be reproduced, distributed, modified, or used in any form without explicit written permission from the author.

