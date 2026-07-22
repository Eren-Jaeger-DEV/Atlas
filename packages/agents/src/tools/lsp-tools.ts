/**
 * @atlas/agents — LSP Tools
 *
 * Tools for autonomous agents to query live compiler diagnostics and LSP symbol definitions.
 */

import { LSPBridge } from "@atlas/core";

export function createLSPDiagnosticTool(lspBridge: LSPBridge) {
  return {
    name: "get_lsp_diagnostics",
    description: "Get real-time compiler diagnostics (errors, warnings) for a file or the entire workspace.",
    parameters: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Optional relative or absolute file path to filter diagnostics.",
        },
      },
    },
    execute: async (args: { filePath?: string }) => {
      const diagnostics = lspBridge.getDiagnostics(args.filePath);
      return {
        count: diagnostics.length,
        diagnostics: diagnostics.map((d) => ({
          file: d.file,
          location: `L${d.line}:${d.character}`,
          severity: d.severity,
          message: d.message,
          code: d.code,
        })),
      };
    },
  };
}

export function createLSPDefinitionTool(lspBridge: LSPBridge) {
  return {
    name: "get_lsp_definition",
    description: "Find the symbol definition location using the Language Server Protocol.",
    parameters: {
      type: "object",
      properties: {
        filePath: { type: "string", description: "Target file path." },
        line: { type: "number", description: "1-indexed line number." },
        character: { type: "number", description: "1-indexed character offset." },
      },
      required: ["filePath", "line", "character"],
    },
    execute: async (args: { filePath: string; line: number; character: number }) => {
      const sym = await lspBridge.findDefinition(args.filePath, args.line, args.character);
      return { symbol: sym };
    },
  };
}
