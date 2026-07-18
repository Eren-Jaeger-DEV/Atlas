/**
 * @atlas/graph — Local Vector Embedding Engine
 *
 * Generates 384-dimensional embeddings for codebase nodes and search queries
 * using local feature extraction with @xenova/transformers (all-MiniLM-L6-v2)
 * and cosine similarity ranking.
 */

import { sha256 } from "js-sha256";

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i]!;
    const b = vecB[i]!;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Fast local feature hash vector generator (384 dimensions).
 * Provides immediate, zero-latency, deterministic vector embeddings offline.
 */
export function generateLocalEmbedding(text: string, dimensions = 384): number[] {
  const normalizedText = text.trim().toLowerCase();
  const vector = new Array<number>(dimensions).fill(0);

  if (!normalizedText) return vector;

  // Extract character n-grams and token features
  const tokens = normalizedText.split(/[^a-z0-9_]+/i).filter(Boolean);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const hash = sha256(token);
    for (let j = 0; j < 8; j++) {
      const chunk = parseInt(hash.slice(j * 4, (j + 1) * 4), 16);
      const index = Math.abs(chunk) % dimensions;
      const val = (chunk % 100) / 100.0;
      vector[index] = (vector[index] ?? 0) + val;
    }
  }

  // Also encode character 3-grams for fuzzy sub-token matching
  for (let i = 0; i < normalizedText.length - 2; i++) {
    const trigram = normalizedText.slice(i, i + 3);
    const hash = sha256(trigram);
    const chunk = parseInt(hash.slice(0, 4), 16);
    const index = Math.abs(chunk) % dimensions;
    vector[index] = (vector[index] ?? 0) + 0.5;
  }

  // Normalize vector to unit length
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    const val = vector[i] ?? 0;
    norm += val * val;
  }
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vector[i] = (vector[i] ?? 0) / norm;
    }
  }

  return vector;
}

export class EmbeddingEngine {
  private pipelinePromise: Promise<any> | null = null;
  private useTransformers = true;

  constructor(options?: { useTransformers?: boolean }) {
    this.useTransformers = options?.useTransformers ?? true;
  }

  private async getPipeline(): Promise<any> {
    if (!this.useTransformers) return null;
    if (this.pipelinePromise) return this.pipelinePromise;

    this.pipelinePromise = (async () => {
      try {
        const { pipeline, env } = await import("@xenova/transformers");
        env.allowLocalModels = true;
        env.useBrowserCache = false;
        const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
          quantized: true,
        });
        return extractor;
      } catch (err) {
        console.warn(
          "[WARN] @xenova/transformers failed to load — falling back to hash-based embeddings.\n" +
          "[WARN] Symbol search results will have degraded semantic quality.\n" +
          "[WARN] Cause:",
          err
        );
        return null;
      }
    })();

    return this.pipelinePromise;
  }

  /**
   * Embeds a string into a 384-dimensional vector.
   */
  async embed(text: string): Promise<number[]> {
    if (!text.trim()) return new Array(384).fill(0);

    try {
      const extractor = await this.getPipeline();
      if (extractor) {
        const output = await extractor(text, { pooling: "mean", normalize: true });
        return Array.from(output.data as Float32Array);
      }
    } catch (err) {
      console.warn("[WARN] Transformer embed call failed — using local hash embedding. Cause:", err);
    }

    return generateLocalEmbedding(text);
  }
}
