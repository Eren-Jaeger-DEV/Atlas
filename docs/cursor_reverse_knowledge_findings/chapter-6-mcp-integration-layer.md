# Chapter 6: Cursor MCP Integration Layer

## Overview
As we continue to dissect the Cursor IDE bundle (`cursor_unpacked`), we uncovered the specific extension responsible for handling Model Context Protocol (MCP) integrations: `cursor-mcp`.

## The `cursor-mcp` Extension
This internal extension acts as the bridge between Cursor's proprietary agent architecture and the standardized Model Context Protocol.

Key findings from `cursor-mcp/package.json`:
1. **Direct SDK Override**: Cursor explicitly pins and overrides `@modelcontextprotocol/sdk` to version `1.25.1` within the extension's dependencies. This guarantees that Cursor agents run on a highly specific, tested version of the protocol, ensuring stability for tool execution.
2. **Native API Proposals**: The extension requests `control`, `cursor`, and `cursorTracing` API proposals. 
   - `cursorTracing` is particularly notable. It suggests that every tool execution invoked via MCP is heavily traced and logged natively by the editor, likely for debugging agent loops, providing telemetry back to Anysphere, or fueling the `cursor-always-local` Auto-review system.
3. **Activation**: It activates immediately on `onStartupFinished` and `onUri`, meaning the MCP hub is always running in the background listening for deep links or agent invocations, unlike standard extensions that lazy-load.

## Conclusion
The `cursor-mcp` extension demonstrates that Cursor does not rely on open-source, generic MCP clients. Instead, it maintains a highly specialized, deeply integrated, and aggressively traced MCP hub that hooks directly into its proprietary `cursor` API, granting the agent unmitigated, highly observable access to tools.
