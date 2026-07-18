import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { MemoryEngine } from "../memory.js";

describe("Developer Intelligence — Graph Queries & Health", () => {
  let tempRepoRoot: string;
  let memory: MemoryEngine;

  beforeEach(async () => {
    tempRepoRoot = mkdtempSync(join(tmpdir(), "atlas-intel-test-"));
    memory = await MemoryEngine.create({ repoRoot: tempRepoRoot });
    await memory.bulkIndex(
      [
        { id: "node-1", kind: "file", label: "index.ts", filePath: join(tempRepoRoot, "src", "index.ts"), indexedAt: Date.now() },
        { id: "node-2", kind: "file", label: "utils.ts", filePath: join(tempRepoRoot, "src", "utils.ts"), indexedAt: Date.now() },
        { id: "node-3", kind: "function", label: "parseData", filePath: join(tempRepoRoot, "src", "utils.ts"), indexedAt: Date.now() },
      ],
      [
        { id: "edge-1", kind: "imports", fromId: "node-1", toId: "node-2", createdAt: Date.now() },
        { id: "edge-2", kind: "calls", fromId: "node-1", toId: "node-3", createdAt: Date.now() },
      ]
    );
  });

  afterEach(() => {
    memory.close();
    rmSync(tempRepoRoot, { recursive: true, force: true });
  });

  it("should find symbol definition by label", () => {
    const def = memory.findSymbolDefinition("parseData");
    expect(def).toBeDefined();
    expect(def?.label).toBe("parseData");
    expect(def?.filePath).toBe(join(tempRepoRoot, "src", "utils.ts"));
  });

  it("should find incoming symbol references", () => {
    const refs = memory.findSymbolReferences("parseData");
    expect(refs.length).toBeGreaterThan(0);
    expect(refs[0]?.label).toBe("index.ts");
  });

  it("should generate project health report", () => {
    const report = memory.getProjectHealthMetrics();
    expect(report.score).toBeGreaterThanOrEqual(50);
    expect(report.totalFiles).toBe(2);
    expect(report.totalSymbols).toBe(1);
    expect(report.circularDependenciesCount).toBe(0);
  });
});
