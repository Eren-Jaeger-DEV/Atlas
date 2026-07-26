# Chapter 14 — Cursor IDE: Shadow Workspaces, Browser MCP & UI Micro-Architecture

## 1. Shadow Workspace Architecture (`cursor-shadow-workspace`)
- **Key Discovery**: Cursor runs a background extension called `cursor-shadow-workspace` (internal repo: `anysphere/vscode`).
- **Functionality**: Creates an unrendered, virtual duplicate of the user's current project in a background process.
- **Purpose**: Runs background language server diagnostics, AST index generation, and type-checker validation without dirtying the active editor buffer or causing UI thread locks.

## 2. Embedded Browser Automation MCP (`cursor-browser-automation`)
- **Key Discovery**: Cursor bundles an official internal Model Context Protocol (MCP) server for browser automation (`cursor-browser-automation`).
- **API Proposals**: Leverages `["control", "cursor", "cursorTracing"]` API proposals.
- **Functionality**: Spawns a headless browser context that allows Cursor's background agent to visually navigate web pages, inspect DOM trees, and verify local web app rendering.

## 3. UI Micro-Animations & SolidJS Fine-Grained Signals
- **Composition**: Cursor bypasses standard VS Code DOM rendering for the Composer and Chat panels by mounting a **SolidJS runtime**.
- **Signal-Based Typing**: Autocomplete suggestions and ghost text are updated via direct signal subscriptions rather than VDOM diffing, achieving microsecond-level render latency.
