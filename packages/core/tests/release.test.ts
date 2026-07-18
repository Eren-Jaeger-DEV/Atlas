import { describe, it, expect } from "vitest";
import {
  ReleaseConfig,
  AutoUpdaterService,
  PerformanceMonitor,
  DiagnosticService,
  SecurityAuditService,
} from "../src/index.js";

describe("Release Engineering & Quality Assurance — Phase 9", () => {
  it("should provide build metadata and channel switching via ReleaseConfig", () => {
    const meta = ReleaseConfig.getMetadata();
    expect(meta.version).toBe("0.1.0");
    expect(meta.channel).toBe("stable");

    ReleaseConfig.setChannel("beta");
    expect(ReleaseConfig.getMetadata().channel).toBe("beta");
  });

  it("should check updates and channel selection in AutoUpdaterService", async () => {
    const updater = new AutoUpdaterService();
    updater.setChannel("nightly");
    expect(updater.getChannel()).toBe("nightly");

    const updateInfo = await updater.checkForUpdates();
    expect(updateInfo.channel).toBe("nightly");
    expect(updateInfo.releaseNotes).toContain("Atlas Studio");
  });

  it("should evaluate performance budgets via PerformanceMonitor", () => {
    const metrics = PerformanceMonitor.getMetrics();
    expect(metrics.coldStartMs).toBeLessThan(2000);
    expect(metrics.commandPaletteMs).toBeLessThan(100);

    const budgetCheck = PerformanceMonitor.checkBudgets();
    expect(budgetCheck.passed).toBe(true);
  });

  it("should generate diagnostic bundle via DiagnosticService", () => {
    const bundle = DiagnosticService.generateBundle();
    expect(bundle.metadata.version).toBe("0.1.0");

    const json = DiagnosticService.exportBundleJson();
    expect(json).toContain("performance");
  });

  it("should generate SPDX-2.3 SBOM via SecurityAuditService", () => {
    const sbom = SecurityAuditService.generateSbom();
    expect(sbom.format).toBe("SPDX-2.3");
    expect(sbom.packages.length).toBeGreaterThan(0);
  });
});
