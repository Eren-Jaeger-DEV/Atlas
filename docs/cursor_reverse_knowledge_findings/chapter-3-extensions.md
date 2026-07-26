# Chapter 3: Extensions and Integrations

## Overview
Cursor ships with a massive suite of proprietary extensions—far more than Antigravity IDE. These extensions (`cursor-*`) provide the backbone for its agentic capabilities.

## Key Proprietary Extensions

### 1. `cursor-agent-exec`
This extension's `package.json` states: 
> "Provides agent execution capabilities for Cursor, enabling agents to run commands, interact with files, and use tools with user permissions and approvals"

This is exactly analogous to Antigravity's `antigravity-code-executor`. It serves as the sandboxed environment where the LLM can run bash scripts and terminal commands safely.

### 2. `cursor-mcp`
Like Antigravity, Cursor officially supports the Model Context Protocol (MCP). The `cursor-mcp` extension handles parsing MCP server configurations and providing external tools to the LLM.

### 3. Specialized AI Micro-Extensions
Cursor breaks down its AI features into incredibly modular extensions:
- `cursor-retrieval`: Handles RAG and codebase indexing.
- `cursor-browser-automation`: Allows the agent to open and interact with headless browsers.
- `cursor-shadow-workspace`: Likely used for running isolated background tasks or test suites without interfering with the user's main editor state.
- `cursor-commits`: AI-generated git commits.
- `cursor-deeplink`: Specialized URI handling.

## Takeaways for Atlas Studio
Cursor's approach is highly modular. Instead of a monolithic AI plugin, they have separate extensions for terminal execution (`cursor-agent-exec`), codebase search (`cursor-retrieval`), and browser automation (`cursor-browser-automation`). 
For Atlas Studio, we should similarly architect our tools as independent modules that the main AI Orchestrator can call upon.
