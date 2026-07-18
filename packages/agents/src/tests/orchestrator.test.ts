import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { Orchestrator } from "../orchestrator.js";
import { MockLLMProvider } from "./mocks/llm-provider.mock.js";
import { createTestSandbox } from "./mocks/sandbox.js";
import type { OrchestratorEvent } from "@atlas/core";

describe("Orchestrator State Machine", () => {
  let sandbox: any;

  beforeEach(async () => {
    sandbox = await createTestSandbox();
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  it("should transition PLANNING -> CODING -> TESTING -> REVIEWING -> DONE on success", async () => {
    const provider = new MockLLMProvider();

    // 1. Planner response
    provider.enqueueResponse(
      JSON.stringify({
        planningReasoning: "Simple plan",
        steps: [
          {
            title: "Mock task",
            description: "Change index.ts",
            reasoning: "Task description",
            relevantFiles: ["src/index.ts"],
          },
        ],
      })
    );

    // 2. Coder response
    provider.enqueueResponse(
      JSON.stringify({
        reasoning: "Finished writing",
        modifiedFiles: ["src/index.ts"],
      })
    );

    // 3. Reviewer response (low risk)
    provider.enqueueResponse(
      JSON.stringify({
        overallRisk: "low",
        requiresHumanReview: false,
        summary: "LGTM",
        findings: [],
      })
    );

    const events: OrchestratorEvent[] = [];
    const orchestrator = new Orchestrator({
      provider,
      memory: sandbox.memory,
      repoRoot: sandbox.repoRoot,
      onEvent: (ev) => events.push(ev),
    });

    const record = await orchestrator.run("change index.ts");

    expect(record.finalState).toBe("DONE");

    // Verify state transition order
    const states = events
      .filter((e) => e.type === "state_change")
      .map((e: any) => e.state);

    expect(states).toEqual([
      "PLANNING",
      "CODING",
      "TESTING",
      "REVIEWING",
      "DONE",
    ]);
  });

  it("should support CODING -> TESTING -> CODING -> TESTING retry loop on test failures", async () => {
    const provider = new MockLLMProvider();

    // 1. Planner response
    provider.enqueueResponse(
      JSON.stringify({
        planningReasoning: "Retry plan",
        steps: [
          {
            title: "Task with retry",
            description: "Write failing then passing test",
            relevantFiles: ["src/index.ts"],
          },
        ],
      })
    );

    // 2. First Coder response - Call 1: tool call to write failing test
    provider.enqueueResponse("", [
      {
        id: "call_1",
        name: "write_file",
        arguments: {
          file_path: "test.js",
          content: "console.log('FAIL'); process.exit(1);", // Mock test failure
        },
      },
    ]);

    // 3. First Coder response - Call 2: JSON conclusion
    provider.enqueueResponse(
      JSON.stringify({
        reasoning: "Wrote failing test",
        modifiedFiles: ["test.js"],
      })
    );

    // 4. Second Coder response - Call 1: tool call to write passing test
    provider.enqueueResponse("", [
      {
        id: "call_2",
        name: "write_file",
        arguments: {
          file_path: "test.js",
          content: "console.log('PASS'); process.exit(0);", // Fixes tests
        },
      },
    ]);

    // 5. Second Coder response - Call 2: JSON conclusion
    provider.enqueueResponse(
      JSON.stringify({
        reasoning: "Wrote passing test",
        modifiedFiles: ["test.js"],
      })
    );

    // 6. Reviewer response
    provider.enqueueResponse(
      JSON.stringify({
        overallRisk: "low",
        requiresHumanReview: false,
        summary: "Fixed logs",
        findings: [],
      })
    );

    const events: OrchestratorEvent[] = [];
    const orchestrator = new Orchestrator({
      provider,
      memory: sandbox.memory,
      repoRoot: sandbox.repoRoot,
      maxCoderRetries: 2,
      onEvent: (ev) => events.push(ev),
    });

    const record = await orchestrator.run("make test retry pass");

    expect(record.finalState).toBe("DONE");
    expect(record.testResults).toHaveLength(2);
    expect(record.testResults[0]!.status).toBe("failed");
    expect(record.testResults[1]!.status).toBe("passed");

    // Verify state transition order with retry
    const states = events
      .filter((e) => e.type === "state_change")
      .map((e: any) => e.state);

    expect(states).toEqual([
      "PLANNING",
      "CODING",
      "TESTING",
      "CODING",
      "TESTING",
      "REVIEWING",
      "DONE",
    ]);
  });
});
