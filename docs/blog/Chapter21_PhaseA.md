# Chapter 21: Tier 1 Finalization & Python Support

In this chapter, we tackled Phase A of the roadmap completion, which brings our foundational features out of a "toy" state and into production readiness, fully addressing Tier 1 and crossing into Tier 2.

## What Was Added

1. **LSP Enhancements (Code Actions & Quick Fixes)**
   - Enabled Monaco's native lightbulb and code action integration.
   - Refined the `monaco-languageclient` instantiation to properly handle multiple languages, including seamless F2 (Rename) and Shift+F12 (Find References) support.

2. **Python Support (LSP & DAP)**
   - Moved beyond hardcoded Node.js debuggers and TypeScript language servers.
   - The IPC `atlas:lsp-start` and `atlas:dap-start` handlers now dynamically inspect the requested language.
   - Automatically provisions `pyright-langserver` via `npx` for Python files.
   - Spawns `python -m debugpy` internally to provide robust breakpoints and step-debugging capabilities.

3. **Extension System Stabilization**
   - The extension runtime (via `vm.createContext`) now seamlessly handles Node's standard `module.exports`, `exports`, and `require` syntax.
   - Extensions no longer have to pollute the global namespace to register commands, bringing Atlas Studio into parity with VS Code's standard extensibility patterns.
