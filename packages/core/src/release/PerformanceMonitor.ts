/**
 * PerformanceMonitor
 *
 * Measures real-time Cold Start, Warm Start, Command Palette response, Symbol Search,
 * LLM latency, Browser latency, Verification time, and Orchestration performance.
 */

export interface PerformanceBudgets {
  coldStartMs: number;
  warmStartMs: number;
  commandPaletteMs: number;
  symbolSearchMs: number;
  extensionActivationMs: number;
  llmLatencyMs: number;
  browserLatencyMs: number;
  verificationMs: number;
  orchestrationMs: number;
}

export class PerformanceMonitor {
  private static bootTimestamp: number = typeof performance !== "undefined" ? performance.now() : Date.now();
  private static coldStartMeasured: boolean = false;
  private static metrics: PerformanceBudgets = {
    coldStartMs: 0,
    warmStartMs: 0,
    commandPaletteMs: 0,
    symbolSearchMs: 0,
    extensionActivationMs: 0,
    llmLatencyMs: 0,
    browserLatencyMs: 0,
    verificationMs: 0,
    orchestrationMs: 0,
  };

  public static markBootComplete(): void {
    if (!this.coldStartMeasured) {
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      this.metrics.coldStartMs = Math.round(now - this.bootTimestamp);
      this.coldStartMeasured = true;
    }
  }

  public static recordMeasurement(key: keyof PerformanceBudgets, durationMs: number): void {
    this.metrics[key] = Math.max(0, Math.round(durationMs));
  }

  public static startTimer(): () => number {
    const start = typeof performance !== "undefined" ? performance.now() : Date.now();
    return () => {
      const end = typeof performance !== "undefined" ? performance.now() : Date.now();
      return Math.max(0, Math.round(end - start));
    };
  }

  public static getMetrics(): PerformanceBudgets {
    if (!this.coldStartMeasured) {
      this.markBootComplete();
    }
    return { ...this.metrics };
  }

  public static checkBudgets(): { passed: boolean; violations: string[] } {
    const metrics = this.getMetrics();
    const violations: string[] = [];
    if (metrics.coldStartMs > 5000) violations.push("Cold Start > 5000ms");
    if (metrics.commandPaletteMs > 100 && metrics.commandPaletteMs > 0) violations.push("Command Palette > 100ms");
    if (metrics.symbolSearchMs > 50 && metrics.symbolSearchMs > 0) violations.push("Symbol Search > 50ms");
    if (metrics.llmLatencyMs > 30000 && metrics.llmLatencyMs > 0) violations.push("LLM Latency > 30000ms");

    return {
      passed: violations.length === 0,
      violations,
    };
  }
}
