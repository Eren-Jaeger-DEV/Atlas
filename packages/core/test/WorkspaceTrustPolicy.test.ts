import { describe, it, expect } from "vitest";
import { WorkspaceTrustPolicy } from "../src/security/WorkspaceTrustPolicy.js";

describe("WorkspaceTrustPolicy", () => {
  it("should initialize as TRUSTED by default", () => {
    const policy = new WorkspaceTrustPolicy();
    expect(policy.getTrustStatus()).toBe("TRUSTED");
    expect(policy.canExecuteCommands()).toBe(true);
  });

  it("should restrict commands when set to UNTRUSTED", () => {
    const policy = new WorkspaceTrustPolicy();
    policy.setTrustStatus("UNTRUSTED");

    expect(policy.getTrustStatus()).toBe("UNTRUSTED");
    expect(policy.canExecuteCommands()).toBe(false);
  });

  it("should detect sensitive credential files", () => {
    const policy = new WorkspaceTrustPolicy();
    expect(policy.isSensitiveFile(".env")).toBe(true);
    expect(policy.isSensitiveFile("id_rsa")).toBe(true);
    expect(policy.isSensitiveFile("src/index.ts")).toBe(false);
  });
});
