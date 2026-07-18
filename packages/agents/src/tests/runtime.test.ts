import { describe, it, expect } from "@jest/globals";
import { ProviderRouter, ContextEngine } from "../index.js";

describe("AI Runtime & Agent Architecture — Phase 7", () => {
  it("should initialize ProviderRouter and manage active provider configuration", () => {
    const router = new ProviderRouter({
      provider: "gemini",
      apiKey: "test-key",
      model: "gemini-2.0-flash",
    });

    expect(router.getActiveConfig().provider).toBe("gemini");

    router.setProvider({
      provider: "openai",
      apiKey: "test-key",
      model: "gpt-4o",
    });

    expect(router.getActiveConfig().provider).toBe("openai");
  });

  it("should assemble token-bounded workspace context using ContextEngine", () => {
    const assembled = ContextEngine.assembleContext({
      activeFilePath: "src/index.ts",
      activeContent: "export function run() { return true; }",
      openTabs: [{ filePath: "src/utils.ts", content: "export const K = 42;" }],
      gitStatusSummary: "Modified: src/index.ts",
      maxTokens: 500,
    });

    expect(assembled.promptContext).toContain("Active File: src/index.ts");
    expect(assembled.promptContext).toContain("Open Workspace Tabs");
    expect(assembled.estimatedTokens).toBeGreaterThan(0);
  });
});
