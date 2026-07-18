import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { MemoryEngine } from "@atlas/graph";

export interface TestSandbox {
  repoRoot: string;
  dbPath: string;
  memory: MemoryEngine;
  cleanup: () => void;
}

export async function createTestSandbox(): Promise<TestSandbox> {
  const repoRoot = mkdtempSync(join(tmpdir(), "atlas-test-repo-"));
  const dbPath = join(repoRoot, ".atlas", "graph.db");

  // Create standard folder structure
  mkdirSync(join(repoRoot, ".atlas"), { recursive: true });
  mkdirSync(join(repoRoot, "src"), { recursive: true });

  // Initialize a mock package.json
  writeFileSync(
    join(repoRoot, "package.json"),
    JSON.stringify(
      {
        name: "test-project",
        scripts: {
          test: "node test.js",
        },
      },
      null,
      2
    )
  );

  // Initialize a basic test script that passes by default
  writeFileSync(
    join(repoRoot, "test.js"),
    "console.log('PASS'); process.exit(0);"
  );

  const memory = await MemoryEngine.create({ repoRoot, dbPath });

  const cleanup = () => {
    try {
      memory.close();
    } catch {
      // Ignore double close
    }
    try {
      rmSync(repoRoot, { recursive: true, force: true });
    } catch {
      // Ignore file locks during concurrent runs
    }
  };

  return {
    repoRoot,
    dbPath,
    memory,
    cleanup,
  };
}
