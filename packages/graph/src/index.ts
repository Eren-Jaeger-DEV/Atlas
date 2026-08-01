/**
 * @atlas/graph — Public API
 */

export { GraphDB } from "./db/graph-db.js";
export { GraphWorkerClient } from "./worker/GraphWorkerClient.js";
export type { DecisionRecord } from "./db/graph-db.js";
export { MemoryEngine } from "./memory.js";
export type { MemoryEngineConfig } from "./memory.js";
export { computeImpact } from "./impact.js";
export { EmbeddingEngine, cosineSimilarity, generateLocalEmbedding } from "./embeddings.js";

// Atlas Structural AST Pattern Search Engine
export { StructuralAstSearch, structuralAstSearch, AST_PATTERN_PRESETS, type AstMatch, type AstPatternPreset } from "./StructuralAstSearch.js";

// Atlas Prism — Structural AST Semantic Git Diff Engine
export { AtlasPrism, atlasPrism, type PrismDiffResult, type PrismDiffHunk, type PrismChangeCategory } from "./AtlasPrism.js";

// Atlas Lens — Persistent Trigram Workspace Search Index Engine
export { AtlasLens, atlasLens, type LensMatch, type LensStats } from "./AtlasLens.js";

// Atlas Cortex — GraphRAG Knowledge Graph & Semantic Code Relationship Engine
export { GraphRagEngine, graphRagEngine, type KnowledgeNode, type KnowledgeEdge, type EdgeType, type GraphRagNeighborhood } from "./GraphRagEngine.js";




