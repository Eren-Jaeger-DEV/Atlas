# Chapter 1: Baseline Architecture

## Overview
By examining the raw open-source repository for VS Code (`microsoft/vscode`), we can establish a baseline for how the editor is architected out-of-the-box, providing clarity on exactly what proprietary forks (Antigravity and Cursor) had to modify to achieve their features.

## Key Findings in the Baseline configuration

### 1. The Missing Marketplace
In the raw `product.json` of the OSS repo, the `extensionsGallery` field is **completely missing**. 
This is because Microsoft legally restricts the official VS Code Marketplace to official Microsoft binaries.
- **Antigravity & Cursor:** Both of these forks had to explicitly patch `product.json` with their own custom extension gallery endpoints (`https://marketplace.cursorapi.com` for Cursor, and the internal registry for Antigravity) to provide users with extensions.

### 2. Proprietary Extensions are Absent
The `builtInExtensions` list in the OSS `product.json` contains only three basic JavaScript debugging tools (`ms-vscode.js-debug`, etc.).
- There are no Remote SSH extensions.
- There are no proprietary language servers like Pylance.
- **Cursor's Approach:** As we saw in the Cursor investigation, Cursor explicitly mapped proprietary Microsoft extensions to their own open-source-friendly equivalents (e.g., `anysphere.remote-ssh`) directly in the `product.json`.

### 3. Native AI Integrations
Interestingly, the OSS `product.json` includes a `defaultChatAgent` configuration explicitly set to `GitHub.copilot`. This indicates that Microsoft is baking structural support for Copilot directly into the open-source tree, even if the Copilot extension itself is closed-source.

## Takeaways for Atlas Studio
When we build Atlas Studio on top of our own architecture, we must remember that if we ever rely on VS Code's core components (e.g. Monaco Editor or LSP infrastructure), we do not automatically get a marketplace or advanced remote development tools. We must build or route our own extension ecosystem, just as Antigravity and Cursor did.
