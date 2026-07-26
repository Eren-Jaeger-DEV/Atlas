# Chapter 5: Cursor Agent Sandboxing and Environment Control

## Overview
Our continuous analysis of the `cursor_unpacked` bundle has revealed exactly how Cursor safely confines its AI agent (the `cursor-agent-worker` and `cursor-agent-exec`) while granting it deep terminal and file system access. This is primarily handled by the `cursor-always-local` extension.

## Environment Definitions (`.cursor/environment.json`)
Cursor introduces a proprietary dev-environment configuration system that runs parallel to standard `.devcontainer` setups.
According to the `environment.schema.json` we reverse-engineered, the environment configuration supports:
- **`mcpServerAllowlist`**: Dictates exactly which Model Context Protocol (MCP) servers the agent is allowed to connect to, restricting malicious or unauthorized tools via `serverUrl` or `command` patterns.
- **`ports`**: Automatic port forwarding specifically orchestrated for the AI to interact with live servers.
- **`snapshot` & `agentCanUpdateSnapshot`**: Suggests that Cursor agents can take filesystem snapshots and dynamically update them to test risky code before committing it back.

## Permission Overrides (`.cursor/permissions.json`)
The `permissions.schema.json` reveals a robust, granular permission model applied dynamically to the agent:
1. **`mcpAllowlist`**: Allows auto-running MCP tools without user prompts.
2. **`terminalAllowlist`**: Specifies safe terminal command patterns (e.g., `npm run test`) that the agent can execute silently in the background.
3. **`approvalMode`**: Operates in three states: `allowlist`, `unrestricted`, and `manual` (maps to "Ask Every Time").
4. **Auto-Review Prompt Injection**:
   The schema contains `autoRun.allow_instructions` and `autoRun.block_instructions`. This is incredibly significant: Cursor allows users to inject prompt engineering directly into the IDE's automated review system (Auto-review). This means the IDE runs an invisible subagent *just to review the primary agent's tool calls* based on these block/allow instructions before passing them to the OS.

## Shadow Workspace Integration
The `cursor-shadow-workspace` extension works in tandem with these schemas. The 800KB+ minified `extension.js` bundle hooks deeply into VS Code's filesystem providers. By combining the `snapshot` capabilities from `environment.json` with the Shadow Workspace, Cursor creates an invisible replica of the repository where the agent can run its `terminalAllowlist` commands to compile and test code. If the code breaks, the agent rolls back the snapshot without the user ever seeing a broken state in their active editor.

## Conclusion
Cursor solves the problem of "dangerous AI agents" by implementing a strict, JSON-schema-enforced permission model and an Auto-review subagent. This proves that safe autonomous agents require not just powerful tools, but dedicated interception layers (`cursor-always-local`) and shadow execution environments to prevent catastrophic developer disruption.
