# Chapter 1: Core Architecture & Entrypoints

## Overview
The Antigravity IDE is essentially a highly customized fork of Visual Studio Code. Rather than building a new editor from the ground up, the foundation relies entirely on the robust open-source VS Code ecosystem (utilizing dependencies like `monaco-editor`, `xterm.js`, and standard Electron IPC patterns).

## The Workbench Bootstrapper
To inject proprietary features into this environment, the standard VS Code workbench HTML has been replaced or overridden with a custom entrypoint.

### `workbench-jetski-agent.html`
This is the root HTML file that the IDE window loads. It contains a highly strict `Content-Security-Policy` that dictates which external domains the UI can communicate with:
- **`jetski-unleash.corp.goog`** and **`antigravity-unleash.goog`**: Suggests that they rely heavily on Unleash for A/B testing and dynamic feature flagging.
- **`vscode-webview`**: Allows standard VS Code webviews to operate.

It also pulls in custom styling like `jetskiMain.tailwind.css`, indicating that Tailwind CSS is used extensively for the proprietary UI overlays.

### `jetskiAgent.js`
This script executes immediately after the DOM loads. Its primary responsibility is setting up a dynamic ES Module `importmap` that maps standard libraries to local pre-bundled files (e.g., mapping `react` to their vendored preact-compat layer). Once the environment is stubbed, it invokes `MonacoBootstrapWindow.load("jetskiAgent/main")` to boot the actual AI agent bundle.
