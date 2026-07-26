/**
 * @atlas/core — FeatureFlagManager
 *
 * Statsig-compatible feature flag gating and telemetry logging engine matching Cursor (Chapter 8)
 * and VS Code (Chapter 6).
 */

export interface FeatureFlagRule {
  key: string;
  defaultValue: boolean;
  overrideValue?: boolean;
  description: string;
}

export interface TelemetryEvent {
  eventName: string;
  timestamp: number;
  properties: Record<string, any>;
}

export class FeatureFlagManager {
  private flags: Map<string, FeatureFlagRule> = new Map([
    [
      "config.atlas.experimental.inlineAi",
      {
        key: "config.atlas.experimental.inlineAi",
        defaultValue: true,
        description: "Enable floating Ctrl+K inline AI prompt bar",
      },
    ],
    [
      "config.atlas.experimental.shadowWorkspace",
      {
        key: "config.atlas.experimental.shadowWorkspace",
        defaultValue: true,
        description: "Enable background unrendered AST index workspace",
      },
    ],
    [
      "config.atlas.experimental.multiRegionRouter",
      {
        key: "config.atlas.experimental.multiRegionRouter",
        defaultValue: true,
        description: "Enable multi-region LLM endpoint failover router",
      },
    ],
  ]);

  private telemetryBuffer: TelemetryEvent[] = [];

  /**
   * Evaluate a feature flag by key name.
   */
  public isEnabled(key: string): boolean {
    const flag = this.flags.get(key);
    if (!flag) return false;
    return flag.overrideValue !== undefined ? flag.overrideValue : flag.defaultValue;
  }

  /**
   * Override a feature flag value.
   */
  public setOverride(key: string, value: boolean): void {
    const flag = this.flags.get(key);
    if (flag) {
      flag.overrideValue = value;
    }
  }

  /**
   * Log a telemetry event.
   */
  public logTelemetry(eventName: string, properties: Record<string, any> = {}): TelemetryEvent {
    const event: TelemetryEvent = {
      eventName,
      timestamp: Date.now(),
      properties,
    };
    this.telemetryBuffer.push(event);
    if (this.telemetryBuffer.length > 500) {
      this.telemetryBuffer.shift(); // Bound memory buffer
    }
    return event;
  }

  /**
   * List all telemetry logs.
   */
  public getTelemetryLogs(): TelemetryEvent[] {
    return [...this.telemetryBuffer];
  }
}
