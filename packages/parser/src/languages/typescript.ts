/**
 * @atlas/parser — TypeScript Language Queries
 *
 * Tree-sitter S-expression queries for extracting graph nodes and edges
 * from TypeScript source files.
 *
 * Query API: `new TreeSitter.Query(language, queryString)` — NOT language.query().
 */

import TreeSitter from "tree-sitter";
import type Parser from "tree-sitter";

// ---------------------------------------------------------------------------
// Query strings
// ---------------------------------------------------------------------------

/**
 * Captures function declarations, arrow functions assigned to variables,
 * method definitions, and exported functions.
 */
export const FUNCTION_QUERY = `
(function_declaration
  name: (identifier) @fn.name) @fn.node

(lexical_declaration
  (variable_declarator
    name: (identifier) @fn.name
    value: (arrow_function))) @fn.node

(method_definition
  name: (property_identifier) @fn.name) @fn.node

(export_statement
  declaration: (function_declaration
    name: (identifier) @fn.name)) @fn.node
`;

/**
 * Captures class declarations.
 */
export const CLASS_QUERY = `
(class_declaration
  name: (type_identifier) @class.name) @class.node

(export_statement
  declaration: (class_declaration
    name: (type_identifier) @class.name)) @class.node
`;

/**
 * Captures import statements (both named and default imports).
 */
export const IMPORT_QUERY = `
(import_statement
  source: (string) @import.source) @import.node
`;

/**
 * Captures call expressions to identify which functions call which.
 */
export const CALL_QUERY = `
(call_expression
  function: (identifier) @call.name) @call.node

(call_expression
  function: (member_expression
    property: (property_identifier) @call.name)) @call.node
`;

/**
 * Captures TODO / FIXME comments.
 */
export const TODO_QUERY = `
(comment) @comment
`;

// ---------------------------------------------------------------------------
// Helper: run a query using the correct TreeSitter.Query constructor API
// ---------------------------------------------------------------------------

export function runTSQuery(
  language: any,
  queryString: string,
  tree: TreeSitter.Tree
): any[] {
  try {
    const query = new TreeSitter.Query(language, queryString);
    return query.matches(tree.rootNode);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Parser factories
// ---------------------------------------------------------------------------

let _tsParser: Parser | undefined;
let _tsLanguage: any;

export async function getTypeScriptParser(): Promise<{ parser: Parser; language: any }> {
  if (_tsParser && _tsLanguage) return { parser: _tsParser, language: _tsLanguage };

  const Parser = (await import("tree-sitter")).default;
  const TypeScript = (await import("tree-sitter-typescript")).default.typescript;

  const parser = new Parser();
  parser.setLanguage(TypeScript);
  _tsParser = parser;
  _tsLanguage = TypeScript;
  return { parser, language: TypeScript };
}

let _tsxParser: Parser | undefined;
let _tsxLanguage: any;

export async function getTSXParser(): Promise<{ parser: Parser; language: any }> {
  if (_tsxParser && _tsxLanguage) return { parser: _tsxParser, language: _tsxLanguage };

  const Parser = (await import("tree-sitter")).default;
  const TSX = (await import("tree-sitter-typescript")).default.tsx;

  const parser = new Parser();
  parser.setLanguage(TSX);
  _tsxParser = parser;
  _tsxLanguage = TSX;
  return { parser, language: TSX };
}
