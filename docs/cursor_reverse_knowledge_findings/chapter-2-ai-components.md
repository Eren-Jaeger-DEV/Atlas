# Chapter 2: AI Components and Frontend Tech

## Overview
Unlike Antigravity IDE which injected a Preact-based application, Cursor employs a different modern web framework for its AI UI components.

## Key Findings

### 1. SolidJS UI Stack
By analyzing the Content Security Policy (CSP) and Trusted Types in `workbench.html`, we discovered that Cursor explicitly registers `solidjs` as a trusted type. It also registers specific AI UI elements like `aibubble`, `aibubble2`, and `aibubbleSearch`. 
This proves that Cursor's AI chat UI (like the Composer or Cmd+K interfaces) is built using **SolidJS** rather than React/Preact.

### 2. Deep UI Integration
The AI automation logic and UI injection appears to be bundled into massive JavaScript files alongside the core VS Code source:
- `workbench.desktop.main.js` (~47 MB)
- `workbench.anysphere-ui-automations.js` (~8.9 MB)

This approach contrasts slightly with Antigravity, which loaded the AI logic dynamically through a completely separate bootstrapper (`jetskiAgent/main.js`). Cursor seemingly weaves its automations directly into the core workbench scripts.

## Takeaways for Atlas Studio
When building the UI for Atlas Studio, we already have our `Parallel Agents` built on standard React. However, seeing that competitors use SolidJS (which is known for high performance and fine-grained reactivity), we should ensure our React components are highly optimized to avoid rendering lag during fast AI text streaming.
