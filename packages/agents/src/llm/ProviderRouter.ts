/**
 * @atlas/agents — ProviderRouter
 *
 * Configuration-driven LLM model router supporting Gemini, OpenAI, Anthropic, Ollama, and Custom endpoints.
 */

import type { ILLMProvider, LLMProviderConfig, LLMRequest, LLMResponse } from "@atlas/core";
import { createProvider, detectProviderFromEnv } from "./provider.js";

export class ProviderRouter implements ILLMProvider {
  readonly name: string = "router";
  readonly models: string[] = ["gemini-2.0-flash", "gpt-4o", "claude-3-5-sonnet", "ollama/llama3"];
  private activeProvider: ILLMProvider;
  private config: LLMProviderConfig;

  constructor(config?: LLMProviderConfig) {
    this.config = config ?? detectProviderFromEnv();
    this.activeProvider = createProvider(this.config);
  }

  public setProvider(config: LLMProviderConfig): void {
    this.config = config;
    this.activeProvider = createProvider(config);
  }

  public getActiveConfig(): LLMProviderConfig {
    return this.config;
  }

  public async complete(request: LLMRequest): Promise<LLMResponse> {
    return this.activeProvider.complete(request);
  }

  public async stream(
    request: LLMRequest,
    onChunk: (chunk: string) => void
  ): Promise<LLMResponse> {
    if (this.activeProvider.stream) {
      return this.activeProvider.stream(request, onChunk);
    }
    const res = await this.activeProvider.complete(request);
    onChunk(res.content);
    return res;
  }
}
