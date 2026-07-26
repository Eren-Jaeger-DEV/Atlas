# Chapter 4: Core Extensions and Integrations

## Overview
While the main AI UI is injected directly into the HTML workbench via `jetskiAgent/main.js` (as documented in Chapter 2), the Antigravity IDE also uses traditional VS Code Extension architecture to hook deep into the IDE's backend services. 

Inside the `resources/app/extensions` directory, we discovered several proprietary built-in extensions.

## The `antigravity` Extension
The primary bridge between the IDE and the custom AI features is the `antigravity` extension. By analyzing its `package.json`, we found the following integrations:

### 1. Model Context Protocol (MCP) Support
The extension registers native JSON schema validation for `mcp_config.json`. This proves that Antigravity officially supports the Model Context Protocol (MCP) to allow agents to connect to local tools and servers automatically.

### 2. Workflow and Rule Editors
It registers custom "Custom Editors" (`viewType: antigravity.workflowEditor` and `antigravity.ruleEditor`) for specific `.md` files. This means that when a user opens files in `.agents/workflows/**/*.md` or `.gemini/jetski*/global_workflows/*.md`, instead of seeing raw text, they likely see a custom GUI for designing AI agent workflows.

### 3. Agent "Supercomplete" Keybindings
The extension hijacks standard autocomplete and introduces new keybindings for reviewing multi-line AI diffs:
- `Alt+J` / `Alt+K`: Navigate through "Agent Hunks" (`antigravity.prioritized.agentFocusNextHunk`).
- `Alt+Enter` / `Alt+Shift+Backspace`: Accept or reject AI-generated hunks seamlessly within the text editor.

### 4. Advanced Authentication & Imports
It implements commands like `antigravity.loginWithAuthToken`, and specialized commands to migrate a user's settings and extensions from competitors like VS Code, Cursor, and Windsurf (`antigravity.importWindsurfSettings`, `antigravity.importCursorSettings`).

## Takeaways for Atlas Studio
To replicate the smooth developer experience of Antigravity, **Atlas Studio** should:
1. Implement a custom diff viewer (Hunk Viewer) that allows users to hit `Alt+J` to jump between code changes proposed by Parallel Agents.
2. Formally support `.agents/workflows/` directories so users can design multi-step AI tasks.
