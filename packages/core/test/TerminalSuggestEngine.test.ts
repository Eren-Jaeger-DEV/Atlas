import { describe, it, expect } from "vitest";
import { TerminalSuggestEngine } from "../src/terminal/TerminalSuggestEngine.js";

describe("TerminalSuggestEngine", () => {
  it("should generate install fix for missing command exit code 127", () => {
    const engine = new TerminalSuggestEngine();
    const fixes = engine.analyzeFailedCommand("ripgrep", 127, "bash: ripgrep: command not found");

    expect(fixes.length).toBeGreaterThan(0);
    expect(fixes[0]?.suggestedCommand).toContain("npm install -g ripgrep");
    expect(fixes[0]?.confidence).toBeGreaterThan(0.9);
  });

  it("should generate npm install fix for missing module errors", () => {
    const engine = new TerminalSuggestEngine();
    const fixes = engine.analyzeFailedCommand("node app.js", 1, "Error: Cannot find module 'express'");

    expect(fixes.length).toBeGreaterThan(0);
    expect(fixes[0]?.suggestedCommand).toBe("npm install");
    expect(fixes[0]?.confidence).toBe(0.98);
  });
});
