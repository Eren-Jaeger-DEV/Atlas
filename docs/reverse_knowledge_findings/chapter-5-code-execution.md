# Chapter 5: Code Execution and Remote Development

## Overview
Beyond chat and code completion, the Antigravity IDE is built to execute code autonomously and run in remote environments (like SSH and Containers) without relying on Microsoft's proprietary extension marketplace.

## 1. Autonomous Code Execution (`antigravity-code-executor`)
We found a dedicated extension named `antigravity-code-executor`.
- **Description:** "Execute generated code from cascade."
- **Purpose:** This implies that when the agent (referred to internally as "cascade" or "jetski") generates bash commands or scripts, this extension handles securely executing that code on the user's host machine. This is how agents build, test, and run code autonomously.

## 2. Remote Development Forks
Microsoft's official Remote Development extensions (Remote-SSH, Dev Containers, WSL) are proprietary and technically restricted by their license to only run in official Microsoft VS Code binaries.
To bypass this limitation and provide remote development, Antigravity bundles its own custom forks:
- `antigravity-remote-openssh`
- `antigravity-remote-wsl`
- `antigravity-dev-containers`

This allows the IDE (and its embedded AI agents) to operate entirely within remote servers or Docker containers seamlessly.

## 3. Premium Themes
The IDE also bundles popular premium themes like `theme-synthwave` and `theme-tokyo-night` directly into the core, ensuring the default aesthetic feels much more modern than a vanilla editor.

## Takeaways for Atlas Studio
For **Atlas Studio** to be fully agentic, we must ensure our Parallel Agents have a secure execution environment. We should mimic `antigravity-code-executor` by building an isolated execution sandbox where agents can run bash scripts, spin up servers, and run tests independently of the user's manual actions.
