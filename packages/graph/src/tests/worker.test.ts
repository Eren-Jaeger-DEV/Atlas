import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { GraphWorkerClient } from "../worker/GraphWorkerClient.js";

describe("GraphWorkerClient (10/10 Architecture)", () => {
  let client: GraphWorkerClient;

  beforeEach(async () => {
    client = new GraphWorkerClient(":memory:");
    await client.init();
  });

  afterEach(async () => {
    await client.close();
  });

  it("should asynchronously add and retrieve graph nodes via client proxy", async () => {
    await client.addNode({
      id: "func_main",
      kind: "function",
      label: "main",
      filePath: "src/main.ts",
      startLine: 1,
      endLine: 10,
      indexedAt: Date.now(),
    });

    const nodes = await client.getAllNodes();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe("func_main");
  });

  it("should calculate similarity scoring asynchronously", async () => {
    await client.upsertChatNodeEmbedding("chat1", [1, 0, 0, 0]);
    await client.upsertChatNodeEmbedding("chat2", [0, 1, 0, 0]);

    const results = await client.searchSimilarChatNodes([1, 0, 0, 0], 2);
    expect(results).toHaveLength(2);
    expect(results[0].chatId).toBe("chat1");
    expect(results[0].score).toBeCloseTo(1.0);
  });
});
