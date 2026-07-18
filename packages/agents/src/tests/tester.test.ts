import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runTester } from "../tester.js";
import { createTestSandbox } from "./mocks/sandbox.js";
import type { PlanStep } from "@atlas/core";

describe("Tester Agent", () => {
  let sandbox: any;

  beforeEach(async () => {
    sandbox = await createTestSandbox();
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  it("should successfully parse a passing test suite run", async () => {
    const step: PlanStep = {
      id: "step_1",
      title: "Update logs",
      description: "Change original to modified",
      relevantFiles: ["src/index.ts"],
      reasoning: "No special reasoning",
      order: 0,
    };

    const result = await runTester(step, {
      repoRoot: sandbox.repoRoot,
    });

    expect(result.status).toBe("passed");
    expect(result.failed).toBe(0);
    expect(result.passed).toBeGreaterThanOrEqual(1);
    expect(result.failures).toHaveLength(0);
  });

  it("should parse a failing test suite run with error details", async () => {
    // Modify test script in sandbox to fail and print mock jest errors
    writeFileSync(
      join(sandbox.repoRoot, "test.js"),
      `console.log("FAIL  src/index.test.ts\\n● Update logs > failed expectation\\n\\nExpected true to be false\\n\\n Tests: 1 failed, 1 total"); process.exit(1);`
    );

    const step: PlanStep = {
      id: "step_1",
      title: "Update logs",
      description: "Change original to modified",
      relevantFiles: ["src/index.ts"],
      reasoning: "No special reasoning",
      order: 0,
    };

    const result = await runTester(step, {
      repoRoot: sandbox.repoRoot,
    });

    expect(result.status).toBe("failed");
    expect(result.failed).toBe(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]!.testName).toBe("Update logs > failed expectation");
    expect(result.failures[0]!.message).toContain("Expected true to be false");
  });
});
