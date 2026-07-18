/**
 * DiagnosticService
 *
 * Generates anonymized diagnostic bundles for crash inspection and support logs.
 */

import { ReleaseConfig } from "./ReleaseConfig.js";
import { PerformanceMonitor } from "./PerformanceMonitor.js";

export interface DiagnosticBundle {
  timestamp: string;
  metadata: ReturnType<typeof ReleaseConfig.getMetadata>;
  performance: ReturnType<typeof PerformanceMonitor.getMetrics>;
  environment: {
    nodeVersion: string;
    os: string;
  };
}

export class DiagnosticService {
  public static generateBundle(): DiagnosticBundle {
    return {
      timestamp: new Date().toISOString(),
      metadata: ReleaseConfig.getMetadata(),
      performance: PerformanceMonitor.getMetrics(),
      environment: {
        nodeVersion: typeof process !== "undefined" ? process.version : "v20.0.0",
        os: typeof process !== "undefined" ? process.platform : "win32",
      },
    };
  }

  public static exportBundleJson(): string {
    return JSON.stringify(this.generateBundle(), null, 2);
  }
}
