# Chapter 1: Core Architecture

## Overview
Cursor, created by Anysphere, Inc., is a fork of Microsoft's VS Code, similar to Antigravity IDE. By examining its core bootstrapper configuration (`package.json` and `product.json`), we can understand how it modifies the base VS Code experience.

## Key Findings

### 1. Custom Telemetry and Feedback
Cursor completely replaces standard VS Code telemetry endpoints with its own:
- `statsigLogEventProxyUrl`: `https://api3.cursor.sh/tev1/v1`
- `reportIssueUrl`: `https://github.com/getcursor/cursor/issues/new`
- Custom update URLs (`https://api2.cursor.sh/updates`)

### 2. Custom Extension Marketplace
Cursor does not use Microsoft's official extension marketplace, as it is strictly limited to official VS Code binaries by Microsoft's Terms of Service. Instead, it points to a custom marketplace backend hosted at `https://marketplace.cursorapi.com/_apis/public/gallery`.

### 3. Proprietary Extension Replacements (`extensionReplacementMapForImports`)
To provide features like Remote Development and advanced intellisense without violating Microsoft's licenses, Cursor injects its own custom replacements for Microsoft's proprietary extensions:
- **Remote SSH:** `ms-vscode-remote.remote-ssh` -> `anysphere.remote-ssh`
- **Dev Containers:** `ms-vscode-remote.remote-containers` -> `anysphere.remote-containers`
- **Python Intellisense (Pylance):** `ms-python.vscode-pylance` -> `anysphere.cursorpyright`
- **C/C++ Tools:** `ms-vscode.cpptools` -> `anysphere.cpptools`

## Comparison to Antigravity IDE
The architecture is identical to Antigravity in how it approaches Microsoft's restrictions:
1. Both forks rely on a custom extension marketplace.
2. Both forks rewrite the `product.json` to swap out Microsoft's proprietary Remote Development extensions (Remote SSH, WSL, Dev Containers) with their own custom-built equivalents (`anysphere.remote-ssh` vs `antigravity-remote-openssh`).
