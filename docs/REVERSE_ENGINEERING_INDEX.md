# IDE Reverse Engineering — Master Index

## Last Updated: 2026-07-25

A comprehensive reverse-engineering study of the three major AI IDEs:
- **Cursor** (Anysphere) — 14 chapters
- **Antigravity IDE** (Google) — 15 chapters
- **VS Code** (Microsoft) — 8 chapters

Total chapters: **37 research documents**

---

## Cursor IDE Findings (cursor_reverse_knowledge_findings/)

| Chapter | Title | Key Discoveries |
|---|---|---|
| 1 | Core Architecture | VS Code fork, Node.js 22, Electron 35, SolidJS signals |
| 2 | AI Components | Composer system, Tab completion, neural architecture |
| 2b | AI Orchestration & UI | AI panel design, reactive state management |
| 3 | Extensions | Extension marketplace, replacement map |
| 4 | Security Findings | Auth tokens, OAuth, telemetry |
| 5 | Agent Sandboxing & Environment | Sandbox policy types, container model |
| 6 | MCP Integration Layer | MCP server management, tool routing |
| 7 | SolidJS UI & Smoothness | Fine-grained reactivity, animation system |
| **8** | **Product.json & Extension Ecosystem** | **Multi-region API topology, Statsig keys, extension replacement map, 20 custom extensions, Nordic theme** |
| **9** | **Permission System & Environment Schema** | **Complete .cursor/permissions.json & .cursor/environment.json schemas, auto-run NL rules, UNSAFE_ALWAYS_ALLOWED** |
| **10** | **Extension Architecture & MCP SDK Patches** | **cursorNoDeps, cursorTracing, TCP/TLS socket, background-composer remote authority, MCP SDK OAuth patch** |
| **11** | **Canvas, Telemetry & Protobuf API** | **Canvas React runtime, complete telemetry catalog, agent.v1 & aiserver.v1 proto types, agent KV store tiers** |
| **12** | **aiserver.v1 Backend API** | **AgentStore distributed FS, multipart uploads, file locking, Smart Mode classifier, team management API** |
| **13** | **agent.v1 Background Execution** | **Background shell/subagent spawn, cloud subagents, custom modes, parallel tool calls, .workspace-trusted** |
| **14** | **Shadow Workspaces & Browser MCP** | **cursor-shadow-workspace background workspace process, cursor-browser-automation MCP server, SolidJS signal reactivity** |

---

## Antigravity IDE Findings (reverse_knowledge_findings/)

| Chapter | Title | Key Discoveries |
|---|---|---|
| 1 | Core Architecture | Jetski agent, Cascade framework, protobuf transport |
| 2 | Jetski Agent | Agent workflow, tool orchestration |
| 3 | LSP Isolation | Language server design, crash isolation |
| 4 | Core Extensions | Built-in extension surface |
| 5 | Code Execution | Agent-driven code execution |
| 6 | Security Findings | Auth flows, credential management |
| 7 | AI Orchestration & UI | Cascade panel, agent state |
| 8 | Deep Dive: Antigravity Core | exa design system, agent-ui-toolkit |
| 9 | Native Remote Development | SSH, WSL, devcontainer integration |
| 10 | UI/UX Animations & Tailwind | Keyframe animations, Tailwind integration |
| **11** | **Product.json, Extension Ecosystem & Design System** | **Open VSX marketplace, Google One pricing, Argon codename, Jetski branding, complete Tailwind color palette + CSS variable bridge** |
| **12** | **Internal Commands, Sidecar & Hidden APIs** | **simulateSegFault, sidecar.sendDiffZone, codeiumDev.* debug config, jetski-trace header, Colab integration, protobuf transport** |
| **13** | **macOS Sandbox, .agyignore & Remote Extensions** | **sandbox-wrapper.sh full sandbox policy, .agyignore format, gitignore→sandbox regex, Cloudtop integration, language_server binary** |
| **14** | **Custom Editors, Workflows & Rules** | **Markdown-based custom editors for .agent/workflows, MCP config schema validation, and competitor settings migration commands (Windsurf, Cider, Cursor)** |
| **15** | **Code Executor & Mermaid Renderers** | **antigravity-code-executor runner, mermaid-chat-features chatOutputRenderer & renderMermaidDiagram language model tool** |

---

## VS Code Findings (vscode_reverse_knowledge_findings/)

| Chapter | Title | Key Discoveries |
|---|---|---|
| 1 | Baseline Architecture | OSS build, extension host, native DOM |
| 2 | Extension Host Architecture | Multi-process extension hosting |
| 3 | Built-in Extensions Comparison | VS Code baseline vs. AI IDE additions |
| 3b | Microsoft Binary | Marketplace gating, proprietary extensions |
| 4 | AI Orchestration & UI | Copilot integration, webview panels |
| 5 | Copilot Subagents & Memory | Memory system, subagent protocol |
| 6 | UI/UX & Theming | ColorRegistry, CSS variables, FastDOM |
| **7** | **Product.json & Copilot Extension API** | **Full Copilot API proposal surface (30+ proposals), defaultChatParticipant exclusivity, mermaid chat feature, Trusted Extension Auth** |
| **8** | **Copilot Subagents, Memory & Skills** | **execution_subagent, search_subagent, three-tier /memories/ system (user, session, repo), skill tool & SKILL.md integration** |

---

## Cross-IDE Comparison: Key Insights

### Permission Systems
| Feature | Cursor | Antigravity | VS Code |
|---|---|---|---|
| Permission model | JSON schema (permissions.json) | macOS sandbox-exec | Extension trust levels |
| Custom ignore files | .cursorignore + allowlists | .agyignore | .vscodeignore |
| AI-evaluated rules | Yes (autoRun NL instructions) | No | No |
| Smart ML classifier | Yes (Smart Mode) | No | No |
| Kernel-level sandbox | macOS sandbox (sandbox-exec) | macOS sandbox-exec | No |

### Agent Architecture
| Feature | Cursor | Antigravity | VS Code |
|---|---|---|---|
| Background agents | Yes (BackgroundSubagent) | Yes (Jetski background tasks) | Limited (Copilot) |
| Cloud agents | Yes (CloudSubagentReference) | Yes (Cloud Code integration) | No |
| Agent forking | Yes (isSelfForkRequested) | Unknown | No |
| Parallel tool calls | Yes (tracked by telemetry) | Yes | No |
| Named agents | Yes (AdminNamedAgent) | No | No |

### Transport Layer
| Feature | Cursor | Antigravity | VS Code |
|---|---|---|---|
| Protocol | Protobuf (aiserver.v1) | Protobuf (google.protobuf) | JSON/REST |
| RPC style | gRPC/Connect | gRPC | REST |
| Streaming | SSE + WebSocket | SSE | SSE |
| Distributed tracing | cursorTracing | jetski-trace header | None |

### UI Framework
| Panel | Cursor | Antigravity | VS Code |
|---|---|---|---|
| Chat/Agent | SolidJS (high performance) | React + Tailwind (exa design system) | Native DOM |
| Canvas/Artifacts | React | N/A | N/A |
| Editor decorations | Native CodeMirror/Monaco | Native Monaco | Native Monaco |
| Inline completions | SolidJS ghost text | Native + Tailwind overlay | Native |
