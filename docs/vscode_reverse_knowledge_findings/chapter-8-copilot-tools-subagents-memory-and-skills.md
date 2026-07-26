# Chapter 8 — VS Code & Copilot: Subagent Catalog, Three-Tier Memory & Skill System

## 1. Subagent Catalog (`execution_subagent` & `search_subagent`)
- **Key Discovery**: Copilot Chat defines dedicated background subagents directly inside its tool registry:
  - `execution_subagent`: Iterative agent that executes terminal commands, filters output logs, and handles long-running build tasks.
  - `search_subagent`: Fast agent specialized in searching workspace patterns and answering codebase questions.

## 2. Three-Tier Memory Architecture (`copilot_memory`)
- **Memory Scopes**:
  - `/memories/`: User memory (persists across all workspaces & sessions).
  - `/memories/session/`: Session memory (conversation-scoped, cleared on end).
  - `/memories/repo/`: Repository memory (stored locally in workspace for conventions & structure facts).
- **FileSystem Operations**: Exposes `view`, `create`, `str_replace`, `insert`, `delete`, and `rename` tools operating over the virtual `/memories/` file system.

## 3. Skill System Integration (`skill` Tool & `SKILL.md`)
- **Discovery**: Automatically discovers `SKILL.md` instruction files in customization roots.
- **Enforcement**: When a user request matches a skill (or slash command), the `skill` tool is invoked before any text generation occurs.
