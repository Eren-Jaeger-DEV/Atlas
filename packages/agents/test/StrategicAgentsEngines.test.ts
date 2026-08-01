import { describe, it, expect } from "vitest";
import { ghostTextEngine, liveSecurityScanner, mutationTestEngine, atlasNexus } from "../src/index.js";

describe("Atlas Strategic Intelligence Expansion Engines (Agents)", () => {
  it("GhostTextEngine (Atlas Whisper) generates inline FIM autocomplete prompt", () => {
    const prompt = ghostTextEngine.buildFimPrompt("function calculateTotal(a, b) {", "return a + b; }");
    expect(prompt).toContain("function calculateTotal");
    expect(prompt).toContain("<FILL_HERE>");
  });

  it("LiveSecurityScanner (Atlas Sentinel) flags hardcoded secrets and security risks", () => {
    const codeWithSecret = `const API_KEY = "sk-1234567890abcdef1234567890abcdef";`;
    const report = liveSecurityScanner.scanContent("config.ts", codeWithSecret);
    expect(report.findings.length).toBeGreaterThan(0);
    expect(report.findings[0]?.ruleId).toBe("SEC-001");
  });

  it("MutationTestEngine (Atlas Crucible) generates AST code mutants", () => {
    const code = `if (a === b) { return true; }`;
    const report = mutationTestEngine.generateMutants("utils.ts", code);
    expect(report.mutants.length).toBeGreaterThan(0);
    expect(report.mutationScore).toBeGreaterThanOrEqual(0);
  });

  it("AtlasNexus (Atlas Nexus) manages P2P host and join sessions", () => {
    const hostSession = atlasNexus.startSession("Test Host");
    expect(hostSession.roomId).toHaveLength(6);
    expect(hostSession.isHost).toBe(true);

    atlasNexus.updateCursor(15, 4, "App.tsx");
    expect(atlasNexus.getSession()?.connectedPeers[0]?.cursorLine).toBe(15);

    atlasNexus.leaveSession();
    expect(atlasNexus.getSession()).toBeNull();
  });
});
