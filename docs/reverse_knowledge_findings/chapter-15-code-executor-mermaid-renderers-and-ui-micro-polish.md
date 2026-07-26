# Chapter 15 — Antigravity IDE: Code Executor, Mermaid Chat Renderers & UI Micro-Polish

## 1. Antigravity Code Executor (`antigravity-code-executor`)
- **Key Discovery**: Spawns an internal sub-process runner (`antigravity-code-executor.executeCode`) to safely execute Python, Node, and Bash code blocks directly from Cascade outputs.
- **IPC Protocol**: Communicates via structured JSON over IPC, capturing stdout/stderr and feeding runtime diagnostics back into Cascade for self-correction.

## 2. Mermaid Chat Output Renderer (`mermaid-chat-features`)
- **Key Discovery**: Implements custom `chatOutputRenderers` registering `vscode.chatMermaidDiagram` (`text/vnd.mermaid`).
- **Language Model Tool**: Exposes `renderMermaidDiagram` tool directly to the agent runtime, allowing Cascade to generate interactive architecture diagrams rendered live inside the chat sidebar.

## 3. UI Micro-Animations & Design System (exa)
- **Theme Extensions**: Bundles custom `theme-synthwave` and `theme-tokyo-night` color schemes with customized border contrast and CSS variable bridges.
- **Glassmorphic Floating Panels**: All floating dialogs use high-saturation backdrop filters with subtle multi-layered drop shadows.
