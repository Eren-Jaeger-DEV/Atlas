import { join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { runCoder } from "../coder.js";
import { MockLLMProvider } from "./mocks/llm-provider.mock.js";
import { createTestSandbox } from "./mocks/sandbox.js";
import type { PlanStep } from "@atlas/core";

describe("Coder Agent", () => {
  let sandbox: any;

  beforeEach(async () => {
    sandbox = await createTestSandbox();
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  it("should execute tool calls and generate unified diffs", async () => {
    const provider = new MockLLMProvider();

    // Setup dummy file in sandbox
    const testFile = "src/index.ts";
    writeFileSync(join(sandbox.repoRoot, testFile), "console.log('original');");

    // First response: call write_file tool to modify src/index.ts
    provider.enqueueResponse("", [
      {
        id: "call_1",
        name: "write_file",
        arguments: {
          file_path: testFile,
          content: "console.log('modified');",
        },
      },
    ]);

    // Second response: final json result
    provider.enqueueResponse(
      JSON.stringify({
        reasoning: "I modified console.log statement",
        alternativesConsidered: ["None"],
        modifiedFiles: [testFile],
      })
    );

    const step: PlanStep = {
      id: "step_1",
      title: "Update logs",
      description: "Change original to modified",
      relevantFiles: [testFile],
      reasoning: "No special reasoning",
      order: 0,
    };

    const output = await runCoder(step, {
      provider,
      memory: sandbox.memory,
      repoRoot: sandbox.repoRoot,
    });

    expect(output.reasoning).toBe("I modified console.log statement");
    expect(output.modifiedFiles).toContain(testFile);
    expect(output.diff).toContain("-console.log('original');");
    expect(output.diff).toContain("+console.log('modified');");

    // Verify file actually written to sandbox filesystem
    const diskContent = readFileSync(join(sandbox.repoRoot, testFile), "utf-8");
    expect(diskContent).toBe("console.log('modified');");
  });
});
