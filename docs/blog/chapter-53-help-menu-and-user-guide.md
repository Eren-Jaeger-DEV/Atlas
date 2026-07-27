# Chapter 53: Help Subsystem, User Manual Guide & Diagnostics Architecture

## Overview
In Chapter 53, we finalized 100% real dynamic logic across all top window menus by wiring the **Help Subsystem**. This milestone provides developers with a full suite of interactive user guides, real-time process diagnostics, interactive playground snippets, feedback reporting, and auto-update verification.

---

## 1. Help Menu Architecture & Wiring

The `Help` top menu contains 12 dedicated actions matching Antigravity IDE and VS Code:

| Menu Action | Shortcut | Target Logic / Component |
| :--- | :--- | :--- |
| **Welcome** | - | Opens the interactive `WalkthroughModal` getting started guide. |
| **Show All Commands** | `Ctrl+Shift+P` | Opens `CommandPalette` quick picker overlay. |
| **Editor Playground** | - | Creates and opens `playground.ts` in Monaco editor with live interactive TypeScript snippets. |
| **Open Walkthrough...** | - | Displays step-by-step feature manual covering Git, DAP Debugger, AI Swarms, and Terminal. |
| **Provide Feedback** | - | Opens `FeedbackModal` for user rating, category selection, and diagnostics payload copying. |
| **Download Diagnostics** | - | Generates `atlas-diagnostics-[timestamp].json` report containing heap, CPU cores, uptime, and system RAM load. |
| **View License** | - | Opens repository `LICENSE` file directly in editor tab. |
| **Toggle Developer Tools** | - | Invokes `atlas:toggle-devtools` via IPC to toggle Electron webContents DevTools. |
| **Open Process Explorer** | - | Opens `ProcessExplorerModal` displaying live hardware metrics and component thread statuses. |
| **Check for Updates...** | - | Triggers `api().checkUpdates()` and displays `UpdateModal` release status. |
| **About** | - | Displays `AboutAtlasModal` with build hash, logo, and system environment info. |

---

## 2. Diagnostics & Hardware Process Monitoring

The new `ProcessExplorerModal` communicates directly with Electron main process APIs to retrieve runtime performance data:
- **CPU Cores**: Queries system hardware concurrency.
- **Heap Memory**: Tracks active JS heap allocations in MB.
- **Process Uptime**: Measures continuous IDE session runtime in seconds.
- **System Memory Load**: Displays dynamic memory percentage meter.

---

## 3. User Manual Guide

The interactive `WalkthroughModal` organizes user documentation into 5 key modules:
1. **Getting Started**: Workspace setup, multi-root folder loading, and keyboard shortcuts.
2. **Git & Source Control**: Staging, diff viewer, branch creation, and stash pop operations.
3. **DAP Debugger**: Breakpoint toggling (<kbd>F9</kbd>), stepping controls (<kbd>F10</kbd>/<kbd>F11</kbd>), and launch configuration setup.
4. **Autonomous AI Swarms**: Parallel agent dashboards, inline AI (<kbd>Ctrl+I</kbd>), and plan approvals.
5. **Integrated Terminal**: Multi-tab xterm management, split terminals (<kbd>Ctrl+Shift+5</kbd>), and task runners.

---

## Summary of Completed Menu Suites
With Chapter 53 complete, **100% of top menu options** (**File**, **Edit**, **Selection**, **View**, **Go**, **Run**, **Terminal**, **Help**) are completely built with real, dynamic, non-mocked logic.
