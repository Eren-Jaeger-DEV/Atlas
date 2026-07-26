# Chapter 3: Built-in Extensions Comparison

## Overview
The `extensions/` directory in the vanilla VS Code source tree contains the default extensions that ship with the editor. Comparing this against what we found in Cursor and Antigravity IDE reveals exactly how much proprietary code is layered on top of the open-source base.

## Key Findings

### 1. The Vanilla Baseline
The open-source repository ships with roughly 90 built-in extensions. These are almost entirely foundational:
- **Language Syntax:** `html`, `css`, `json`, `markdown-basics`, `typescript-basics`.
- **Basic Language Features:** `html-language-features`, `typescript-language-features`.
- **Themes:** `theme-monokai`, `theme-solarized-dark`, etc.

### 2. What is Missing?
The most notable finding is what is **not** there:
- **No Remote Development:** The proprietary Microsoft extensions (`ms-vscode-remote.remote-ssh`, `ms-vscode-remote.remote-wsl`) are completely absent from the open-source tree.
- **No Proprietary LSPs:** Pylance and other closed-source language servers are missing.
- **No Cursor/Antigravity Agents:** The massive suite of modular extensions we found in Cursor (`cursor-agent-exec`, `cursor-retrieval`, `cursor-mcp`) are proprietary additions injected during their build process.

### 3. Copilot Integration
Interestingly, the open-source `extensions/` folder contains a `copilot` directory, and `package.json` includes development dependencies for `@github/copilot`. This indicates that Microsoft is heavily integrating Copilot support directly into the core OSS repository, serving as the default AI assistant framework before any proprietary forks modify it.

## Takeaways for Atlas Studio
Atlas Studio will inherit the same basic extensions as VS Code OSS. To achieve parity with Cursor and Antigravity, we must build our own suite of robust "built-in" extensions. Following Cursor's model (Chapter 3 of the Cursor research), we should build granular, single-purpose extensions for our AI features (e.g., `atlas-agent-exec`, `atlas-retrieval`, `atlas-mcp`) rather than a single monolithic plugin.
