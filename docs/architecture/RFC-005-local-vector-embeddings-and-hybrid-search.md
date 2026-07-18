# Atlas Studio Development Log — Chapter 5: Local Vector Embeddings & Hybrid Search

This chapter documents the integration of in-process vector embeddings and hybrid (semantic + keyword) search into `@atlas/graph`.

---

## 1. Local Embedding Engine Architecture

We built `EmbeddingEngine` in `packages/graph/src/embeddings.ts`:
- **Vector Dimension**: 384-dimensional dense floating point vectors.
- **Model / Generator**: Utilizes `@xenova/transformers` (`Xenova/all-MiniLM-L6-v2`) for feature extraction with a fast local feature-hashing generator fallback for zero-latency, offline execution.
- **Cosine Similarity**: Calculates dot-product similarity normalized by vector magnitudes:
  $$\text{similarity}(A, B) = \frac{A \cdot B}{\|A\| \|B\|}$$

---

## 2. SQLite Vector Storage (`node_embeddings`)

We added `node_embeddings` table to the SQLite schema in `packages/graph/src/db/graph-db.ts`:
```sql
CREATE TABLE IF NOT EXISTS node_embeddings (
  node_id     TEXT PRIMARY KEY,
  vector_json TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
```

Helper methods in `GraphDB`:
- `upsertNodeEmbedding(nodeId: string, vector: number[])`: Stores or updates node vectors in SQLite.
- `getNodeEmbeddings()`: Loads stored node vectors for batch ranking.
- `getNodeEmbedding(nodeId: string)`: Retrieves a specific node's vector.

---

## 3. Hybrid Search (RRF) in MemoryEngine

`MemoryEngine` provides three search interfaces:
1. `search(query)`: Direct SQLite keyword search (`LIKE %query%`).
2. `vectorSearch(query)`: Ranks all indexed nodes by cosine similarity against the query embedding vector.
3. `hybridSearch(query)`: Fuses keyword search and vector search using Reciprocal Rank Fusion (RRF):
   $$\text{RRF\_Score}(d) = \sum_{m \in M} \frac{1}{k + r_m(d)}$$
   where $k = 60$.

`atlas ask` now invokes `engine.hybridSearch(question)` by default, returning relevant code nodes even when query keywords don't match exact symbol identifiers (e.g. searching *"Find code that resolves dynamic monorepo packages"* correctly retrieves `scanWorkspacePackages` in `indexer.ts`).

---

## 4. Verification

We added unit tests at `packages/graph/src/tests/embeddings.test.ts`:
- **Vector Dimension & Magnitude**: Confirms 384-dimensional output with normalized unit length.
- **Cosine Similarity**: Confirms orthogonal and identical vector similarity scores.
- **Hybrid Search Ranking**: Confirms semantic retrieval of nodes from SQLite.

Running `pnpm test` confirms 100% passing test suites across `@atlas/graph`, `@atlas/parser`, and `@atlas/agents`.
