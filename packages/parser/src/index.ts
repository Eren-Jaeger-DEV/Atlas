/**
 * @atlas/parser — Public API
 */

export { indexRepository } from "./indexer.js";
export type { IndexerResult, IndexerOptions } from "./indexer.js";
export { getTypeScriptParser, getTSXParser } from "./languages/typescript.js";
export { getPythonParser } from "./languages/python.js";
