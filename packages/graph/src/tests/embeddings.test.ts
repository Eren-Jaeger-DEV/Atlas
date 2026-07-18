import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { MemoryEngine } from "../memory.js";
import { generateLocalEmbedding, cosineSimilarity, EmbeddingEngine } from "../embeddings.js";

describe("Vector Embeddings & Hybrid Search", () => {
  let tempRepoRoot: string;
  let engine: MemoryEngine;

  beforeEach(async () => {
    tempRepoRoot = mkdtempSync(join(tmpdir(), "atlas-embeddings-test-"));
    engine = await MemoryEngine.create({ repoRoot: tempRepoRoot });
  });

  afterEach(() => {
    engine.close();
    rmSync(tempRepoRoot, { recursive: true, force: true });
  });

  it("should calculate cosine similarity correctly", () => {
    const vecA = [1, 0, 0];
    const vecB = [1, 0, 0];
    const vecC = [0, 1, 0];

    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0);
    expect(cosineSimilarity(vecA, vecC)).toBeCloseTo(0.0);
  });

  it("should generate 384-dimensional local vector embeddings", () => {
    const vec = generateLocalEmbedding("function resolveImportPath");
    expect(vec).toHaveLength(384);

    // Magnitude of normalized vector should be approx 1.0
    const magnitude = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    expect(magnitude).toBeCloseTo(1.0);
  });

  it("should index node embeddings and perform hybrid search", async () => {
    const nodes = [
      {
        id: "file:indexer.ts",
        kind: "file" as const,
        label: "indexer.ts",
        filePath: "src/indexer.ts",
        summary: "Scans monorepo packages dynamically and builds graph nodes",
        indexedAt: Date.now(),
      },
      {
        id: "function:computeImpact",
        kind: "function" as const,
        label: "computeImpact",
        filePath: "src/impact.ts",
        summary: "Performs BFS dependency blast radius calculation in under 15ms",
        indexedAt: Date.now(),
      },
    ];

    await engine.bulkIndex(nodes, []);

    // Create embedder using local feature generator for test speed
    const embedder = new EmbeddingEngine({ useTransformers: false });

    const indexedCount = await engine.indexEmbeddings(embedder);
    expect(indexedCount).toBe(2);

    // Vector search for dynamic monorepo scanner
    const semanticResults = await engine.vectorSearch("monorepo package scanner", 5, embedder);
    expect(semanticResults.length).toBeGreaterThan(0);
    expect(semanticResults[0]?.id).toBe("file:indexer.ts");

    // Hybrid search
    const hybridResults = await engine.hybridSearch("blast radius BFS", 5, embedder);
    expect(hybridResults.length).toBeGreaterThan(0);
    expect(hybridResults[0]?.id).toBe("function:computeImpact");
  });
});
