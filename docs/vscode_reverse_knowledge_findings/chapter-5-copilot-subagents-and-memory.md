# Chapter 5: Copilot Subagents and Memory Tiering

## Overview
By scraping the inner workings of the official Microsoft `copilot` extension within the `code_unpacked` binary, we've uncovered the advanced Multi-Agent and Memory Tiering architecture that powers Copilot Chat.

## Subagent Routing Architecture
Unlike older versions of Copilot that acted as a single conversational entity, the modern binary utilizes a specialized, routed subagent model.
We identified several core subagents mapped directly into the IDE:
- **`execution_subagent`**: Optimized strictly for generating and running terminal commands or applying file edits.
- **`search_subagent`**: Tied to fast vector search, handling requests like "find where X is defined".
- **`explore_subagent`**: Built for navigating the codebase and following definition/reference graphs.
- **`switchAgent`**: A meta-agent tool. If the user asks an architectural question while talking to the `execution_subagent`, the system invokes `switchAgent` to seamlessly transfer the context window to a specialized "Plan" agent without losing state.

## Tiered Memory System
The most startling discovery is Copilot's persistent memory architecture, structured into three distinct tiers:
1. **`/memories/` (Global)**: High-level user preferences and global rules that persist across *all* projects.
2. **`/memories/session/` (Ephemeral)**: Context specific only to the current active chat session. When the window reloads or the chat is cleared, this tier is flushed.
3. **`/memories/repo/` (Persistent Workspace)**: A knowledge base built specifically for the current repository. As the agent learns about the codebase's quirks, it writes facts to this tier.

This tiering system allows Microsoft's agent to emulate human memory—remembering how you like your variables named globally, while keeping track of specific API endpoints exclusively within the repo where they exist.

## Conclusion
The official VS Code binary has secretly deployed an enterprise-grade multi-agent orchestrator. The combination of subagent routing and tiered persistent memory (`/memories/repo/`) bridges the gap between conversational AI and true autonomous codebase mastery.
