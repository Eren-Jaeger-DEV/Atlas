import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { indexRepository } from "../indexer.js";

describe("Parser Call-Graph Indexing", () => {
  let tempRepoRoot: string;

  beforeEach(() => {
    tempRepoRoot = mkdtempSync(join(tmpdir(), "atlas-parser-test-"));
    mkdirSync(join(tempRepoRoot, "src"), { recursive: true });
  });

  afterEach(() => {
    rmSync(tempRepoRoot, { recursive: true, force: true });
  });

  it("should parse and resolve local and imported call-graph edges", async () => {
    // 1. Create a math utility file
    const mathFile = join(tempRepoRoot, "src", "math.ts");
    writeFileSync(
      mathFile,
      `export function add(a: number, b: number): number {
        return a + b;
      }`
    );

    // 2. Create package.json to test workspace packages scanning
    writeFileSync(
      join(tempRepoRoot, "package.json"),
      JSON.stringify(
        {
          name: "test-package",
          main: "dist/index.js",
        },
        null,
        2
      )
    );

    // 3. Create the main index file containing imports, local call, and top-level call
    const indexFile = join(tempRepoRoot, "src", "index.ts");
    writeFileSync(
      indexFile,
      `import { add } from "./math.js";

      function calculate(x: number) {
        return add(x, 10); // Imported call
      }

      calculate(5); // Top-level call`
    );

    const result = await indexRepository({
      repoRoot: tempRepoRoot,
    });

    expect(result.errors).toHaveLength(0);

    // Find the caller symbol Node ID (function calculate)
    const calculateNode = result.nodes.find(
      (n) => n.kind === "function" && n.label === "calculate"
    );
    expect(calculateNode).toBeDefined();

    // Find the callee symbol Node ID (function add)
    const addNode = result.nodes.find(
      (n) => n.kind === "function" && n.label === "add"
    );
    expect(addNode).toBeDefined();

    // Verify calls edge from calculate -> add
    const callsAddEdge = result.edges.find(
      (e) => e.kind === "calls" && e.fromId === calculateNode!.id && e.toId === addNode!.id
    );
    expect(callsAddEdge).toBeDefined();

    // Verify calls edge from index.ts (top-level file node) -> calculate
    const fileNode = result.nodes.find(
      (n) => n.kind === "file" && n.label === "src/index.ts"
    );
    expect(fileNode).toBeDefined();

    const callsCalculateEdge = result.edges.find(
      (e) => e.kind === "calls" && e.fromId === fileNode!.id && e.toId === calculateNode!.id
    );
    expect(callsCalculateEdge).toBeDefined();
  });
});
