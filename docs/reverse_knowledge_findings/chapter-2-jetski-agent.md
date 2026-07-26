# Chapter 2: The Custom AI Injection (Jetski Agent)

## Overview
Instead of building their AI interface purely as a standard VS Code extension using the Webview API (which can be slow and sandboxed), the Antigravity IDE injects a massive, 12MB bundled application (`jetskiAgent/main.js`) directly into the main Electron Renderer window.

## Technology Stack
By analyzing the bundle and the `package.json` manifest, we identified the following tech stack powering the AI agent UI:

1. **Preact / React Compat**
   - The UI is built using React components, but is actually running on Preact under the hood for performance and smaller footprint.
2. **`@exa/agent-ui-toolkit`**
   - This appears to be a proprietary, internal UI toolkit used specifically for rendering AI chat interfaces, agent logs, and multi-agent visualizations.
3. **`@lexical/react` (Composer)**
   - They use Lexical (open-sourced by Meta) to power the rich text composer inputs. Lexical is highly robust, which explains how they implement complex features like `@mentions` (e.g., `@codebase`, `@workspace`, `@terminal`) seamlessly within the chat box.
4. **`@connectrpc/connect`**
   - For communication, the IDE uses ConnectRPC to stream responses from their backend. This allows them to use strongly typed protobufs (`@exa/proto-ts`) over standard HTTP/WebSockets for real-time agent execution logs.

## Takeaways for Atlas Studio
To achieve parity, Atlas Studio should consider migrating our chat composer from standard textareas to a robust framework like **Lexical**. Additionally, adopting a streaming RPC layer like **ConnectRPC** can improve the reliability of streaming agent logs to our Parallel Agents Dashboard.
