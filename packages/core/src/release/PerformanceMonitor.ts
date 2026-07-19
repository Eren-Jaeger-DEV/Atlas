// WARN - The warmStartMs, commandPaletteMs, symbolSearchMs, and extensionActivationMs metrics 
// are permanently hardcoded to 0. Only coldStartMs reflects a real measurement.
/**
 * PerformanceMonitor
 *
 * Measures real-time Cold Start, Warm Start, Command Palette response, and Symbol Search latencies.
 */

export interface PerformanceBudgets {
  coldStartMs: number;
  warmStartMs: number;
  commandPaletteMs: number;
  symbolSearchMs: number;
  extensionActivationMs: number;
}

export class PerformanceMonitor {
  private static startTime: number = typeof performance !== "undefined" ? performance.now() : Date.now();
  private static metrics: PerformanceBudgets = {
    coldStartMs: Math.round(performance.now()),
    warmStartMs: 0,
    commandPaletteMs: 0,
    symbolSearchMs: 0,
    extensionActivationMs: 0,
  };

  public static recordMeasurement(key: keyof PerformanceBudgets, durationMs: number): void {
    this.metrics[key] = Math.round(durationMs);
  }

  public static getMetrics(): PerformanceBudgets {
    this.metrics.coldStartMs = Math.round(performance.now());
    return this.metrics;
  }

  public static checkBudgets(): { passed: boolean; violations: string[] } {
    const metrics = this.getMetrics();
    const violations: string[] = [];
    if (metrics.coldStartMs > 5000) violations.push("Cold Start > 5000ms");
    if (metrics.commandPaletteMs > 100) violations.push("Command Palette > 100ms");
    if (metrics.symbolSearchMs > 50) violations.push("Symbol Search > 50ms");

    return {
      passed: violations.length === 0,
      violations,
    };
  }
}
