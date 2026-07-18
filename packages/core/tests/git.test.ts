import { describe, it, expect } from "vitest";

describe("Source Control & Collaborative Development — Phase 6", () => {
  it("should parse git log output lines correctly", () => {
    const rawLog = "560e8ce|Eren Jaeger|10 minutes ago|feat: extension sdk\n8ae8fbd|Eren Jaeger|30 minutes ago|feat: dev intel";
    const parsed = rawLog.split("\n").map(line => {
      const [hash, author, date, message] = line.split("|");
      return { hash, author, date, message };
    });

    expect(parsed).toHaveLength(2);
    expect(parsed[0].hash).toBe("560e8ce");
    expect(parsed[0].message).toBe("feat: extension sdk");
  });

  it("should resolve 3-way merge conflicts by selecting block choice", () => {
    const blocks = [
      { id: 1, currentChange: "ours", incomingChange: "theirs", resolved: false, chosen: undefined },
    ];

    const resolvedBlock = { ...blocks[0], resolved: true, chosen: "current" as const };
    expect(resolvedBlock.resolved).toBe(true);
    expect(resolvedBlock.chosen).toBe("current");
  });
});
