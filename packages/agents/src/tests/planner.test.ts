import { runPlanner } from "../planner.js";
import { MockLLMProvider } from "./mocks/llm-provider.mock.js";
import { createTestSandbox } from "./mocks/sandbox.js";

describe("Planner Agent", () => {
  let sandbox: any;

  beforeEach(async () => {
    sandbox = await createTestSandbox();
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  it("should successfully generate a multi-step plan from valid JSON response", async () => {
    const provider = new MockLLMProvider();

    const mockPlanJson = JSON.stringify({
      planningReasoning: "We need to fix bugs",
      steps: [
        {
          title: "Fix validation",
          description: "Add email validation regex",
          reasoning: "To prevent bad emails",
          relevantFiles: ["src/validation.ts"],
        },
      ],
    });

    provider.enqueueResponse(mockPlanJson);

    const plan = await runPlanner("add validation", {
      provider,
      memory: sandbox.memory,
      repoRoot: sandbox.repoRoot,
    });

    expect(plan.planningReasoning).toBe("We need to fix bugs");
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]!.title).toBe("Fix validation");
    expect(plan.steps[0]!.relevantFiles).toContain("src/validation.ts");
  });

  it("should throw an error if the model returns invalid JSON", async () => {
    const provider = new MockLLMProvider();
    provider.enqueueResponse("This is not a JSON object");

    await expect(
      runPlanner("add validation", {
        provider,
        memory: sandbox.memory,
        repoRoot: sandbox.repoRoot,
      })
    ).rejects.toThrow("Planner produced invalid JSON");
  });
});
