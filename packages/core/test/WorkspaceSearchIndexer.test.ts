import { describe, it, expect } from "vitest";
import { WorkspaceSearchIndexer } from "../src/search/WorkspaceSearchIndexer.js";

describe("WorkspaceSearchIndexer", () => {
  const sampleFiles = [
    { path: "src/main.ts", content: "const app = 'Atlas IDE';\nconsole.log(app);" },
    { path: "src/utils.ts", content: "export function log(msg) {\n  console.log(msg);\n}" },
    { path: "docs/readme.md", content: "# Atlas Studio IDE Architecture" },
  ];

  it("should find exact query matches with correct line numbers", () => {
    const indexer = new WorkspaceSearchIndexer();
    const matches = indexer.searchInFiles(sampleFiles, { query: "console.log" });

    expect(matches).toHaveLength(2);
    expect(matches[0]?.filePath).toBe("src/main.ts");
    expect(matches[0]?.lineNumber).toBe(2);
    expect(matches[1]?.filePath).toBe("src/utils.ts");
    expect(matches[1]?.lineNumber).toBe(2);
  });

  it("should respect exclude pattern filter", () => {
    const indexer = new WorkspaceSearchIndexer();
    const matches = indexer.searchInFiles(sampleFiles, {
      query: "Atlas",
      excludePattern: "docs",
    });

    expect(matches).toHaveLength(1);
    expect(matches[0]?.filePath).toBe("src/main.ts");
  });
});
