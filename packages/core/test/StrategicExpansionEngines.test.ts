import { describe, it, expect } from "vitest";
import { flamegraphProfiler, commitNarrator, reactiveNotebookEngine } from "../src/index.js";

describe("Atlas Strategic Intelligence Expansion Engines (Core)", () => {
  it("FlamegraphProfiler (Atlas Torch) generates live CPU and Heap reports", () => {
    const cpuProfile = flamegraphProfiler.generateProfile("cpu");
    expect(cpuProfile.mode).toBe("cpu");
    expect(cpuProfile.rootFrame).toBeDefined();
    expect(cpuProfile.hotspots.length).toBeGreaterThan(0);

    const heapProfile = flamegraphProfiler.generateProfile("heap");
    expect(heapProfile.mode).toBe("heap");
    expect(heapProfile.rootFrame).toBeDefined();
  });

  it("CommitNarrator (Atlas Chronicle) parses diffs and drafts Conventional Commits", () => {
    const mockDiff = `
+ export class ProviderRouter {
+   public routeRequest() {}
+ }
- function oldRoute() {}
`;
    const annotation = commitNarrator.narrateDiff("packages/core/src/router/ProviderRouter.ts", mockDiff);
    expect(annotation.type).toBeDefined();
    expect(annotation.impactedSymbols).toContain("ProviderRouter");
    expect(annotation.suggestedCommitMessage).toContain("ProviderRouter");
  });

  it("ReactiveNotebookEngine (Atlas Canvas) manages cells and executes reactive updates", () => {
    const notebook = reactiveNotebookEngine.createNotebook("Test Scratchpad");
    expect(notebook.cells.length).toBe(2);

    const executed = reactiveNotebookEngine.executeCell(notebook, "cell-1");
    expect(executed.cells[0]?.executionCount).toBe(2);
    expect(executed.cells[0]?.status).toBe("success");
  });
});
