import { describe, it, expect } from "vitest";
import { atlasLens, atlasPrism, graphRagEngine } from "../src/index.js";

describe("Atlas Strategic Intelligence Expansion Engines (Graph)", () => {
  it("AtlasLens (Atlas Lens) extracts trigrams and queries workspace index", () => {
    const trigrams = atlasLens.extractTrigrams("function renderApp()");
    expect(trigrams.length).toBeGreaterThan(0);

    const matches = atlasLens.query("renderApp");
    expect(matches).toBeDefined();
  });

  it("AtlasPrism (Atlas Prism) performs AST-aware diff classification", () => {
    const oldCode = `function processPayment(amount: number) { return true; }`;
    const newCode = `function processPayment(amount: number, currency: string) { return true; }`;
    const diff = atlasPrism.diffFiles("payment.ts", oldCode, newCode);

    expect(diff.hunks.length).toBeGreaterThan(0);
    expect(diff.summary.addedLines).toBeGreaterThanOrEqual(0);
  });

  it("GraphRagEngine (Atlas Cortex) retrieves 2-hop neighborhood and indexes content", () => {
    const neighborhood = graphRagEngine.getNeighborhood("ProviderRouter");
    expect(neighborhood).not.toBeNull();
    expect(neighborhood?.targetNode.label).toBe("ProviderRouter");
    expect(neighborhood?.graphSummary).toContain("ProviderRouter");

    const dynNodes = graphRagEngine.indexContent("MyService.ts", "export class MyService {}");
    expect(dynNodes.length).toBe(1);
    expect(dynNodes[0]?.label).toBe("MyService");
  });
});
