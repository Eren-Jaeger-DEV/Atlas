/**
 * @atlas/parser — Python Language Queries
 *
 * Uses the correct new TreeSitter.Query(language, queryString) API.
 */

import TreeSitter from "tree-sitter";
import type Parser from "tree-sitter";

// ---------------------------------------------------------------------------
// Query strings
// ---------------------------------------------------------------------------

export const FUNCTION_QUERY = `
(function_definition
  name: (identifier) @fn.name) @fn.node

(decorated_definition
  definition: (function_definition
    name: (identifier) @fn.name)) @fn.node
`;

export const CLASS_QUERY = `
(class_definition
  name: (identifier) @class.name) @class.node
`;

export const IMPORT_QUERY = `
(import_statement
  name: (dotted_name) @import.source) @import.node

(import_from_statement
  module_name: (dotted_name) @import.source) @import.node
`;

export const CALL_QUERY = `
(call
  function: (identifier) @call.name) @call.node

(call
  function: (attribute
    attribute: (identifier) @call.name)) @call.node
`;

export const TODO_QUERY = `
(comment) @comment
`;

// ---------------------------------------------------------------------------
// Helper: run a query using the correct TreeSitter.Query constructor API
// ---------------------------------------------------------------------------

export function runPyQuery(
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
// Parser factory
// ---------------------------------------------------------------------------

let _pyParser: Parser | undefined;
let _pyLanguage: any;

export async function getPythonParser(): Promise<{ parser: Parser; language: any }> {
  if (_pyParser && _pyLanguage) return { parser: _pyParser, language: _pyLanguage };

  const Parser = (await import("tree-sitter")).default;
  const Python = (await import("tree-sitter-python")).default;

  const parser = new Parser();
  parser.setLanguage(Python);
  _pyParser = parser;
  _pyLanguage = Python;
  return { parser, language: Python };
}
