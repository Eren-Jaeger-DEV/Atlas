import { runReviewer } from "../reviewer.js";
import { MockLLMProvider } from "./mocks/llm-provider.mock.js";
import { createTestSandbox } from "./mocks/sandbox.js";
import type { PlanStep, CoderOutput } from "@atlas/core";

describe("Reviewer Agent", () => {
  let sandbox: any;

  beforeEach(async () => {
    sandbox = await createTestSandbox();
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  it("should parse a valid JSON review response and structure findings", async () => {
    const provider = new MockLLMProvider();

    const mockReviewJson = JSON.stringify({
      overallRisk: "medium",
      requiresHumanReview: true,
      summary: "Diff looks ok but has minor validation issues",
      findings: [
        {
          kind: "security",
          riskLevel: "medium",
          title: "Missing input sanitization",
          description: "Variable inputs are not sanitized",
        },
      ],
    });

    provider.enqueueResponse(mockReviewJson);

    const step: PlanStep = {
      id: "step_1",
      title: "Update logs",
      description: "Change original to modified",
      relevantFiles: ["src/index.ts"],
      reasoning: "No special reasoning",
      order: 0,
    };

    const coderOutput: CoderOutput = {
      planStepId: step.id,
      diff: "diff --git a/src/index.ts b/src/index.ts ...",
      modifiedFiles: ["src/index.ts"],
      reasoning: "Updated log syntax",
      createdAt: Date.now(),
    };

    const result = await runReviewer(step, coderOutput, {
      provider,
      memory: sandbox.memory,
      repoRoot: sandbox.repoRoot,
    });

    expect(result.overallRisk).toBe("medium");
    expect(result.requiresHumanReview).toBe(true);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.kind).toBe("security");
    expect(result.findings[0]!.title).toBe("Missing input sanitization");
  });

  it("should safely fall back to medium risk if model output is not JSON", async () => {
    const provider = new MockLLMProvider();
    provider.enqueueResponse("The code looks great, no findings.");

    const step: PlanStep = {
      id: "step_1",
      title: "Update logs",
      description: "Change original to modified",
      relevantFiles: ["src/index.ts"],
      reasoning: "No special reasoning",
      order: 0,
    };

    const coderOutput: CoderOutput = {
      planStepId: step.id,
      diff: "diff --git a/src/index.ts b/src/index.ts ...",
      modifiedFiles: ["src/index.ts"],
      reasoning: "Updated log syntax",
      createdAt: Date.now(),
    };

    const result = await runReviewer(step, coderOutput, {
      provider,
      memory: sandbox.memory,
      repoRoot: sandbox.repoRoot,
    });

    expect(result.overallRisk).toBe("medium");
    expect(result.requiresHumanReview).toBe(false);
    expect(result.findings).toHaveLength(0);
    expect(result.summary).toBe("The code looks great, no findings.");
  });
});
