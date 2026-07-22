import { describe, it, expect } from "@jest/globals";
import { TrajectoryReplay } from "../dag/TrajectoryReplay.js";
import { VisualVerifier } from "../verification/VisualVerifier.js";

describe("10/10 Flagship Architecture Extensions", () => {
  it("should record, rewind, and export agent execution trajectory snapshots", () => {
    const replay = new TrajectoryReplay("run-101", "Refactor User Auth");

    replay.recordStep(0, { id: "s1", order: 0, title: "Step 1", description: "Parse AST" });
    replay.recordStep(1, { id: "s2", order: 1, title: "Step 2", description: "Inject Types" });

    expect(replay.getSnapshots()).toHaveLength(2);

    const exported = replay.exportPlayback();
    expect(exported).toContain("run-101");

    const restored = TrajectoryReplay.importPlayback(exported);
    expect(restored.getSnapshots()).toHaveLength(2);

    const rewound = replay.rewindTo(0);
    expect(rewound?.step.id).toBe("s1");
    expect(replay.getSnapshots()).toHaveLength(1);
  });

  it("should perform automated visual layout DOM verification", () => {
    const verifier = new VisualVerifier();

    verifier.captureSnapshot("App.tsx", 120, { width: 1440, height: 900 }, "hash123");

    const resultPass = verifier.verifyChange("App.tsx", 124, "hash123");
    expect(resultPass.passed).toBe(true);
    expect(resultPass.layoutShiftDetected).toBe(false);

    const resultFail = verifier.verifyChange("App.tsx", 250, "hash999");
    expect(resultFail.passed).toBe(false);
    expect(resultFail.layoutShiftDetected).toBe(true);
  });
});
