# Chapter 7: Product Configuration & Copilot Extension API Surface

## Overview

The VS Code `product.json` is its open-source variant, which is intentionally more minimal than the Cursor or Antigravity versions. However, it reveals the full **Copilot API proposal surface** and the design of the official extension ecosystem.

---

## 1. Marketplace Strategy (Open Source vs. Microsoft Binary)

The OSS `product.json` intentionally does **NOT** include `extensionsGallery` configuration. This is the primary legal/technical barrier between OSS VS Code and Microsoft's official binary:
- The official binary (code.visualstudio.com) adds a private `extensionsGallery` pointing to `marketplace.visualstudio.com`
- The OSS build has no marketplace config, forcing forks to use Open VSX or build their own

This is the same legal constraint that forces Antigravity to use Open VSX, confirming the pattern.

---

## 2. Copilot API Proposal Surface

The official `product.json` grants `GitHub.copilot-chat` a massive, privileged API surface that **no third-party extension can access**:

```
interactive                        — interactive editor sessions
terminalDataWriteEvent             — read terminal data streams
terminalExecuteCommandEvent        — execute terminal commands
terminalSelection                  — access terminal selections
terminalQuickFixProvider           — provide terminal quick fixes
chatParticipantAdditions           — add chat participants
defaultChatParticipant             — be the DEFAULT chat participant
embeddings                         — access vector embedding APIs
chatVariableResolver               — resolve @-mentions in chat
chatProvider                       — be a registered chat AI provider
mappedEditsProvider                — provide mapped code edits
aiRelatedInformation               — surface AI context info
codeActionAI                       — provide AI-powered code actions
findTextInFiles                    — search files (AI context building)
textSearchProvider                 — search text (AI context building)
newSymbolNamesProvider             — suggest new symbol names
findFiles2                         — advanced file finding
extensionsAny                      — access any other extension
authLearnMore                      — show auth learning UI
testObserver                       — observe test execution
aiTextSearchProvider               — AI-powered text search
documentFiltersExclusive           — exclusive document targeting
chatParticipantPrivate             — private chat participant APIs
lmTools                            — Language Model Tools
contribDebugCreateConfiguration    — create debug configurations
```

**Insight**: `defaultChatParticipant` is the most powerful proposal — it allows Copilot to be the fallback AI that handles all unresolved chat queries. This is why no third-party chat participant (from the marketplace) can become the default assistant in VS Code. It is **exclusively reserved** for GitHub Copilot.

---

## 3. The Mermaid Chat Features Extension

A very interesting discovery is the `mermaid-chat-features` extension bundled in Antigravity (but originating from VS Code's codebase):
- It uses API proposal: `chatOutputRenderer`
- It contributes a `renderMermaidDiagram` language model tool
- **AI Key**: `0c6ae279ed8443289764825290e4f9e2-1a736e7c-1324-4338-be46-fc2a58ae4d14-7255` (ARIA telemetry key)
- It's **disabled by default** (`"default": false`), gated behind `config.mermaid-chat.enabled`

This means VS Code/Antigravity has the hidden ability for the AI to **render Mermaid diagrams inline in the chat**. It's a dormant feature that requires manual activation via settings.

---

## 4. Trusted Extension Architecture

VS Code's `trustedExtensionAuthAccess` configuration grants specific extensions privileged access to OAuth providers:

| OAuth Provider | Trusted Extensions |
|---|---|
| `github` | vscode.github, github.remotehub, ms-vscode.remote-server, github.vscode-pull-request-github, github.codespaces, ms-vsliveshare.vsliveshare |
| `microsoft` | ms-vscode.azure-repos, ms-vscode.remote-server, ms-vsliveshare.vsliveshare + Azure tools |

**Key Difference from Cursor**: VS Code's trust model is **publisher-based** (trusting Microsoft/GitHub publishers), while Cursor's trust model is **extension-ID-based** (explicitly whitelisting `anysphere.*` extensions). Antigravity inherits VS Code's publisher-based model.

---

## 5. API Proposal Comparison Table

| Feature | VS Code OSS | Cursor | Antigravity |
|---|---|---|---|
| Chat Participants | `chatParticipantAdditions` | `composerMode.*` | `contribSourceControlInputBoxMenu` |
| AI Inline Completions | `inlineCompletionsAdditions` | `cursor` (proprietary) | `inlineCompletionsAdditions` |
| Remote Development | Official `ms-vscode-remote.*` | Forked `anysphere.*` | Forked internal forks |
| Terminal AI Access | `terminalDataWriteEvent` | `cursorPseudoterminal` | Native |
| Agent Tracing | None | `cursorTracing` | `antigravityUnifiedStateSync` |
| Default AI Provider | Copilot via `defaultChatParticipant` | Cursor via `cursorAgentHost` | Jetski via `antigravity` extension |

---

## 6. VS Code Source Build System

Unlike the binary IDEs, we have the full VS Code source at `/home/victor/Downloads/vscode`. Key build infrastructure:

- **Build System**: Gulp (`gulpfile.mjs`) 
- **CLI Entry**: `./cli` directory (Rust-based CLI for the server)
- **Remote Server**: `./remote` directory (remote extension host)
- **Test Infrastructure**: `./test` with full integration tests
- **GitHub Workflows**: `.github/` with CI/CD pipelines

The presence of the full source lets us compare the OSS baseline against what Cursor and Antigravity have modified — confirming all the proprietary additions described in these chapters.
