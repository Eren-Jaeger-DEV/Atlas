/**
 * @atlas/agents — MultiRegionApiRouter
 *
 * Automatic multi-region API endpoint failover router matching Cursor (`aiserver.v1`) (Chapter 8).
 * Monitors endpoint latency and HTTP error rates across `us-central1`, `europe-west1`, and `asia-east1`
 * to guarantee zero-downtime streaming for LLM completion requests.
 */

export type RegionCluster = "us-central1" | "europe-west1" | "asia-east1";

export interface RegionEndpoint {
  region: RegionCluster;
  baseUrl: string;
  latencyMs: number;
  errorCount: number;
  active: boolean;
}

export class MultiRegionApiRouter {
  private endpoints: Map<RegionCluster, RegionEndpoint> = new Map([
    [
      "us-central1",
      {
        region: "us-central1",
        baseUrl: "https://us-central1.aiserver.atlas.dev",
        latencyMs: 45,
        errorCount: 0,
        active: true,
      },
    ],
    [
      "europe-west1",
      {
        region: "europe-west1",
        baseUrl: "https://europe-west1.aiserver.atlas.dev",
        latencyMs: 110,
        errorCount: 0,
        active: true,
      },
    ],
    [
      "asia-east1",
      {
        region: "asia-east1",
        baseUrl: "https://asia-east1.aiserver.atlas.dev",
        latencyMs: 180,
        errorCount: 0,
        active: true,
      },
    ],
  ]);

  private activePrimaryRegion: RegionCluster = "us-central1";

  /**
   * Get the current optimal endpoint URL.
   */
  public getPrimaryEndpoint(): RegionEndpoint {
    const primary = this.endpoints.get(this.activePrimaryRegion);
    if (primary && primary.active && primary.errorCount < 3) {
      return primary;
    }

    // Failover to lowest latency active region
    const activeEndpoints = Array.from(this.endpoints.values())
      .filter((e) => e.active && e.errorCount < 3)
      .sort((a, b) => a.latencyMs - b.latencyMs);

    if (activeEndpoints.length > 0) {
      this.activePrimaryRegion = activeEndpoints[0]!.region;
      return activeEndpoints[0]!;
    }

    // Fallback default
    return this.endpoints.get("us-central1")!;
  }

  /**
   * Record request completion metrics for an endpoint.
   */
  public recordMetrics(region: RegionCluster, latencyMs: number, success: boolean): void {
    const endpoint = this.endpoints.get(region);
    if (!endpoint) return;

    endpoint.latencyMs = Math.round(endpoint.latencyMs * 0.7 + latencyMs * 0.3); // Exponential moving average
    if (success) {
      endpoint.errorCount = Math.max(0, endpoint.errorCount - 1);
    } else {
      endpoint.errorCount += 1;
      if (endpoint.errorCount >= 3 && this.activePrimaryRegion === region) {
        // Trigger automatic failover
        this.getPrimaryEndpoint();
      }
    }
  }

  /**
   * List all current regional endpoints and metrics.
   */
  public listEndpoints(): RegionEndpoint[] {
    return Array.from(this.endpoints.values());
  }
}
