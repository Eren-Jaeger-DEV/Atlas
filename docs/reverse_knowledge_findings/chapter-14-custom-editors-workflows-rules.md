# Chapter 14: Antigravity Custom Editors, Workflows, and Rules Architecture

## Overview

A deeper dive into the `antigravity` extension's `package.json` reveals custom editors and file validation mechanisms that define how users and agents interact with workflows, rules, and MCP configurations. This confirms that Antigravity relies heavily on markdown-based declarative programming for its agents.

---

## 1. Custom Editors for Agents

Antigravity registers two proprietary custom editors designed specifically for managing agent behavior:

### 1. Workflow Editor (`antigravity.workflowEditor`)
This custom editor activates for specific markdown files representing agent workflows. 

**Selectors:**
- `**/.agent/workflows/**/*.md`
- `**/_agent/workflows/**/*.md`
- `**/.agents/workflows/**/*.md`
- `**/_agents/workflows/**/*.md`
- `**/.gemini/jetski*/global_workflows/*.md`
- `**/.gemini/antigravity*/global_workflows/*.md`

**Insight**: Antigravity has a global and workspace-level "workflow" system. Workflows are defined in markdown files, and this custom editor likely provides a rich UI (possibly a visual builder or structured form) instead of a standard text editor. Note the `.gemini/jetski` and `.gemini/antigravity` paths, confirming that global workflows are stored in the user's home directory.

### 2. Rule Editor (`antigravity.ruleEditor`)
This custom editor is dedicated to agent rules.

**Selectors:**
- `**/.agent/rules/**/*.md`
- `**/_agent/rules/**/*.md`
- `**/.agents/rules/**/*.md`
- `**/_agents/rules/**/*.md`

**Insight**: Similar to workflows, rules (like system prompts or behavioral guidelines) are defined in markdown files. The `Rule Editor` gives users a specialized interface for configuring the agent's constraints.

---

## 2. Configuration & Validation

### MCP Configuration Validation
Antigravity automatically validates any file named `mcp_config.json` against a bundled schema:
- **File Match**: `**/mcp_config.json`
- **Schema**: `./schemas/mcp_config.schema.json`

This indicates that Antigravity has a standardized way of defining MCP (Model Context Protocol) configurations across workspaces.

### Internal Configuration Properties
Several unique configuration settings are exposed to the user/developer:
- `antigravity.searchMaxWorkspaceFileCount`: Controls how many files Jetski will attempt to embed for semantic search. "This file count ignores .gitignore and binary files."
- `antigravity.enableCursorImportCursor`: Boolean to enable commands that import settings/extensions from Cursor.
- `antigravity.persistentLanguageServer`: Boolean to keep the LSP running even when the editor is closed.

---

## 3. Extension Importers & Migration

Antigravity contains dedicated commands for migrating from competitor IDEs, reflecting an aggressive adoption strategy:
- `antigravity.importVSCodeSettings` / `Extensions` / `RecentWorkspaces`
- `antigravity.importCursorSettings` / `Extensions`
- `antigravity.importWindsurfSettings` / `Extensions`
- `antigravity.importCiderSettings` (Cider is Google's internal web-based IDE, further proving Antigravity bridges the gap between internal and public tools).

---

## 4. Keybindings & "Supercomplete"

Antigravity features a highly prioritized set of keybindings focused on accepting agent edits and "Supercomplete" (the inline ghost text engine).

- **Agent Edit Acceptance**:
  - `Alt+Enter`: Accept focused hunk (`antigravity.prioritized.agentAcceptFocusedHunk`)
  - `Alt+Shift+Backspace`: Reject focused hunk
  - `Alt+J` / `Alt+K`: Navigate hunks
- **Supercomplete**:
  - `Tab`: Accept inline suggestion (`antigravity.prioritized.supercompleteAccept`)
  - `Escape`: Cancel inline suggestion (`antigravity.prioritized.supercompleteEscape`)

The keybindings include specific logic for `vim` and `neovim` compatibility (e.g., `vim.mode == 'Normal'`), showing a strong focus on power users.
