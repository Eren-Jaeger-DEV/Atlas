import { describe, it, expect } from "vitest";
import { SmartModelClassifier } from "../src/llm/SmartModelClassifier.js";

describe("SmartModelClassifier", () => {
  it("should route simple edit prompts to FAST_COMPLETE", () => {
    const classifier = new SmartModelClassifier();
    const model = classifier.selectOptimalModel("Fix typo in variable name");

    expect(model).toBe("FAST_COMPLETE");
  });

  it("should route complex architectural prompts to DEEP_REASONING", () => {
    const classifier = new SmartModelClassifier();
    const model = classifier.selectOptimalModel(
      "Refactor the monorepo architecture and design a distributed call graph visualizer with memory locks"
    );

    expect(model).toBe("DEEP_REASONING");
  });
});
