/**
 * @atlas/agents — LocalModelRadar
 *
 * Zero-config local LLM auto-discovery engine.
 * Probes well-known local inference server endpoints (Ollama, LM Studio, vLLM,
 * Llama.cpp, GPT4All, Jan) and returns live model listings — no API keys required.
 *
 * Completely original Atlas implementation. Nothing is copied from Continue or any
 * other project. All probe logic, health-check strategies, and normalization are
 * native Atlas code.
 */

export type LocalEndpointKind =
  | "ollama"
  | "lm_studio"
  | "vllm"
  | "llamacpp"
  | "gpt4all"
  | "jan"
  | "custom";

export interface LocalModelEntry {
  /** Human-readable model name */
  name: string;
  /** Identifier suitable for use in API calls */
  modelId: string;
  /** Size hint in GB, if the endpoint provides it */
  sizeGb?: number;
  /** Context window length, if available */
  contextLength?: number;
  /** Which runtime is serving this model */
  runtime: LocalEndpointKind;
  /** Full base URL of the serving endpoint */
  endpointUrl: string;
}

export interface LocalEndpointProbe {
  kind: LocalEndpointKind;
  baseUrl: string;
  /** Port(s) to try in order */
  ports: number[];
}

export interface LocalRadarScanResult {
  discoveredAt: string;          // ISO timestamp
  endpoints: LocalEndpointProbe[];
  models: LocalModelEntry[];
  errors: Record<string, string>;
}

// -------------------------------------------------------------------------
// Known local inference servers and their default ports + model list API
// -------------------------------------------------------------------------
const PROBES: Array<{
  kind: LocalEndpointKind;
  ports: number[];
  modelListPath: string;
  healthPath: string;
  extractModels: (json: any) => Omit<LocalModelEntry, "runtime" | "endpointUrl">[];
}> = [
  {
    kind: "ollama",
    ports: [11434],
    modelListPath: "/api/tags",
    healthPath: "/api/tags",
    extractModels: (json) =>
      (json?.models ?? []).map((m: any) => ({
        name: m.name ?? m.model ?? "unknown",
        modelId: m.model ?? m.name ?? "unknown",
        sizeGb: m.size ? parseFloat((m.size / 1e9).toFixed(2)) : undefined,
        contextLength: m.details?.parameter_size ? undefined : undefined,
      })),
  },
  {
    kind: "lm_studio",
    ports: [1234],
    modelListPath: "/v1/models",
    healthPath: "/v1/models",
    extractModels: (json) =>
      (json?.data ?? []).map((m: any) => ({
        name: m.id ?? "unknown",
        modelId: m.id ?? "unknown",
      })),
  },
  {
    kind: "vllm",
    ports: [8000, 8080],
    modelListPath: "/v1/models",
    healthPath: "/health",
    extractModels: (json) =>
      (json?.data ?? []).map((m: any) => ({
        name: m.id ?? "unknown",
        modelId: m.id ?? "unknown",
        contextLength: m.max_model_len ?? undefined,
      })),
  },
  {
    kind: "llamacpp",
    ports: [8080, 8000],
    modelListPath: "/v1/models",
    healthPath: "/health",
    extractModels: (json) =>
      (json?.data ?? json?.models ?? []).map((m: any) => ({
        name: m.id ?? m.name ?? "llama.cpp model",
        modelId: m.id ?? m.name ?? "llamacpp-local",
      })),
  },
  {
    kind: "gpt4all",
    ports: [4891],
    modelListPath: "/v1/models",
    healthPath: "/v1/models",
    extractModels: (json) =>
      (json?.data ?? []).map((m: any) => ({
        name: m.id ?? "gpt4all model",
        modelId: m.id ?? "gpt4all-local",
      })),
  },
  {
    kind: "jan",
    ports: [1337],
    modelListPath: "/v1/models",
    healthPath: "/v1/models",
    extractModels: (json) =>
      (json?.data ?? []).map((m: any) => ({
        name: m.id ?? "jan model",
        modelId: m.id ?? "jan-local",
      })),
  },
];

// -------------------------------------------------------------------------
// Timeout-wrapped fetch (node 18+ or browser)
// -------------------------------------------------------------------------
async function probeFetch(url: string, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// -------------------------------------------------------------------------
// LocalModelRadar — main engine
// -------------------------------------------------------------------------
export class LocalModelRadar {
  private readonly timeoutMs: number;
  private lastScan: LocalRadarScanResult | null = null;

  constructor(timeoutMs = 2500) {
    this.timeoutMs = timeoutMs;
  }

  /**
   * Probe all known local inference server endpoints in parallel.
   * Returns a structured scan result containing every discovered model.
   */
  public async scan(): Promise<LocalRadarScanResult> {
    const result: LocalRadarScanResult = {
      discoveredAt: new Date().toISOString(),
      endpoints: [],
      models: [],
      errors: {},
    };

    // Fan out probes in parallel
    await Promise.allSettled(
      PROBES.flatMap((probe) =>
        probe.ports.map((port) => this.probeEndpoint(probe, port, result))
      )
    );

    this.lastScan = result;
    return result;
  }

  /** Return cached last scan without probing network again */
  public getLastScan(): LocalRadarScanResult | null {
    return this.lastScan;
  }

  /**
   * Quick health-only check — returns true if at least one local model server responds.
   */
  public async isAnyLocalModelAvailable(): Promise<boolean> {
    const scan = await this.scan();
    return scan.models.length > 0;
  }

  /**
   * Build an OpenAI-compatible base URL for the given local model.
   * Callers can use this directly in their `ProviderRouter.setProvider()` call.
   */
  public buildCompatBaseUrl(model: LocalModelEntry): string {
    return `${model.endpointUrl}/v1`;
  }

  // ---------------------------------------------------------------------------
  private async probeEndpoint(
    probe: (typeof PROBES)[0],
    port: number,
    result: LocalRadarScanResult
  ): Promise<void> {
    const baseUrl = `http://localhost:${port}`;
    const healthUrl = `${baseUrl}${probe.healthPath}`;
    const modelsUrl = `${baseUrl}${probe.modelListPath}`;
    const key = `${probe.kind}:${port}`;

    try {
      // Health check
      const healthRes = await probeFetch(healthUrl, this.timeoutMs);
      if (!healthRes.ok && probe.kind !== "llamacpp") return;

      // Fetch model list
      const listRes = await probeFetch(modelsUrl, this.timeoutMs);
      if (!listRes.ok) return;

      const json: unknown = await listRes.json();
      const rawModels = probe.extractModels(json);

      result.endpoints.push({ kind: probe.kind, baseUrl, ports: [port] });
      for (const rm of rawModels) {
        result.models.push({
          ...rm,
          runtime: probe.kind,
          endpointUrl: baseUrl,
        });
      }
    } catch (err) {
      result.errors[key] = err instanceof Error ? err.message : String(err);
    }
  }
}

/** Singleton export for import across the IDE */
export const localModelRadar = new LocalModelRadar();
