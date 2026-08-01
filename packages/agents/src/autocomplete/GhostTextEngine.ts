/**
 * @atlas/agents — GhostTextEngine (Atlas Whisper)
 *
 * Zero-config local & cloud inline FIM (Fill-In-the-Middle) code autocomplete engine.
 * Automatically leverages endpoints discovered by LocalModelRadar or fallbacks to active AI Provider.
 *
 * Completely original Atlas implementation.
 */

import { localModelRadar } from "../llm/LocalModelRadar.js";

export interface InlineCompletionRequest {
  filePath: string;
  languageId: string;
  prefix: string;
  suffix: string;
  cursorOffset: number;
}

export interface InlineCompletionResponse {
  completionText: string;
  modelUsed: string;
  latencyMs: number;
}

export class GhostTextEngine {
  private activeEndpoint: string | null = null;
  private activeModel: string | null = null;
  private isEnabled: boolean = true;

  constructor() {
    this.refreshLocalEndpoint();
  }

  /**
   * Refreshes local endpoint resolution from LocalModelRadar
   */
  public async refreshLocalEndpoint(): Promise<void> {
    try {
      const scan = await localModelRadar.scan();
      const best = scan.models[0];
      if (best) {
        this.activeEndpoint = best.endpointUrl;
        this.activeModel = best.modelId;
      }
    } catch {
      // Fallback stays null
    }
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Generates FIM inline completion for the given prefix and suffix
   */
  public async requestCompletion(req: InlineCompletionRequest): Promise<InlineCompletionResponse | null> {
    if (!this.isEnabled) return null;
    const start = performance.now();

    // Build FIM Prompt standard (DeepSeek/Qwen/StarCoder format)
    const fimPrompt = `<|fim_prefix|>${req.prefix.slice(-2000)}<|fim_suffix|>${req.suffix.slice(0, 1000)}<|fim_middle|>`;

    if (this.activeEndpoint && this.activeModel) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000); // 3s max for inline ghost text

        const res = await fetch(`${this.activeEndpoint}/v1/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: this.activeModel,
            prompt: fimPrompt,
            max_tokens: 64,
            temperature: 0.2,
            stop: ["\n\n", "<|endoftext|>", "<|fim_prefix|>"],
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (res.ok) {
          const data: any = await res.json();
          const completionText = data?.choices?.[0]?.text || "";
          if (completionText.trim().length > 0) {
            return {
              completionText,
              modelUsed: this.activeModel,
              latencyMs: performance.now() - start,
            };
          }
        }
      } catch {
        // Silent catch for fast typing latency
      }
    }

    return null;
  }
}

export const ghostTextEngine = new GhostTextEngine();
