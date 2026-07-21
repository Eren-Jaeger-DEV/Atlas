# Chapter 18: Outline View and Symbol Breadcrumbs

In this milestone (Tier 2.5), we enriched the editor with context-aware navigation powered by the Language Server Protocol (LSP).

## 1. Exposing LSP Document Symbols
We extended the existing `LSPClient.ts` to expose the active `MonacoLanguageClient`. This allowed us to build `fetchDocumentSymbols`, which calls the standard LSP `textDocument/documentSymbol` method, returning a hierarchical tree of symbols (classes, methods, functions, variables, etc.) for the current file.

## 2. Dynamic Outline Sidebar Panel
We introduced a new `OutlinePanel.tsx` component that takes the document symbols array and recursively renders them into a visual tree. Each symbol type (e.g., class, function, property) is matched to a specific icon color and letter indicator for quick scanning. The panel also tracks the editor's cursor line, highlighting the active symbol in the sidebar. Clicking on any symbol in the outline tree instantly scrolls the editor to the symbol's exact location.

## 3. Contextual Breadcrumbs
The editor's `Breadcrumb.tsx` component was upgraded to receive the `cursorSymbol` from the `EditorPane`. As the user clicks around or types in the document, the EditorPane queries the symbol tree to find the narrowest enclosing symbol (using `findEnclosingSymbol` on the 0-indexed LSP line ranges). This symbol is appended to the file path breadcrumb (e.g., `src > components > EditorPane.tsx > onDidChangeCursorPosition`), giving developers immediate spatial context within large files.

## Summary
The combination of the Outline View and Breadcrumbs bridges the gap between text editing and code structure understanding. Developers can now quickly see the skeleton of their files and jump directly to definitions. Next on the roadmap is Tier 2.6: Inline Git Blame & Diff Gutters.
