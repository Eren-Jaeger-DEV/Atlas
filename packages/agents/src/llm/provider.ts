/**
 * @atlas/agents — LLM Provider factory
 *
 * Central place to create providers from environment config.
 * Reads API keys from environment variables.
 */

import type { ILLMProvider, LLMProviderConfig, LLMProviderName } from "@atlas/core";
import { OpenAIProvider } from "./openai.js";
import { AnthropicProvider } from "./anthropic.js";
import { GeminiProvider } from "./gemini.js";

// routing.run catalog (all 16 models available via the OpenAI-compatible API)
export const ROUTING_RUN_MODELS = [
  "claude-opus-4-8",
  "claude-sonnet-4-6",
  "deepseek-v4-flash",
  "deepseek-v4-pro",
  "glm-5.2",
  "glm-5.2-nitro",
  "gpt-5.6-luna",
  "gpt-5.6-sol",
  "gpt-5.6-terra",
  "kimi-k2.6",
  "kimi-k2.6-nitro",
  "kimi-k2.7-code",
  "kimi-k2.7-code-nitro",
  "nemotron-3-ultra",
  "qwen3.5-9b",
] as const;

export const ROUTING_RUN_BASE_URL = "https://api.routing.run/v1";
export const ROUTING_RUN_DEFAULT_MODEL: string = "claude-sonnet-4-6";

export function createProvider(config: LLMProviderConfig): ILLMProvider {
  switch (config.provider) {
    case "openai":
    case "openai-compatible":
      return new OpenAIProvider(config.apiKey, config.model, config.baseUrl);
    case "routing.run":
      // routing.run is fully OpenAI-compatible; always route to their base URL
      return new OpenAIProvider(
        config.apiKey,
        config.model ?? ROUTING_RUN_DEFAULT_MODEL,
        ROUTING_RUN_BASE_URL
      );
    case "anthropic":
      return new AnthropicProvider(config.apiKey, config.model);
    case "gemini":
      return new GeminiProvider(config.apiKey, config.model);
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`);
  }
}

/**
 * Detect which providers are configured from environment variables.
 * Returns the first available provider config.
 */
export function detectProviderFromEnv(): LLMProviderConfig {
  if (process.env["ROUTING_API_KEY"]) {
    return {
      provider: "routing.run" as any,
      apiKey: process.env["ROUTING_API_KEY"],
      model: process.env["ATLAS_MODEL"] ?? ROUTING_RUN_DEFAULT_MODEL,
    };
  }
  if (process.env["OPENAI_API_KEY"]) {
    return {
      provider: "openai",
      apiKey: process.env["OPENAI_API_KEY"],
      model: process.env["ATLAS_MODEL"] ?? "gpt-4o",
    };
  }
  if (process.env["ANTHROPIC_API_KEY"]) {
    return {
      provider: "anthropic",
      apiKey: process.env["ANTHROPIC_API_KEY"],
      model: process.env["ATLAS_MODEL"] ?? "claude-sonnet-4-5",
    };
  }
  if (process.env["GEMINI_API_KEY"]) {
    return {
      provider: "gemini",
      apiKey: process.env["GEMINI_API_KEY"],
      model: process.env["ATLAS_MODEL"] ?? "gemini-2.0-flash",
    };
  }
  throw new Error(
    "No LLM provider API key found. Set ROUTING_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY."
  );
}

export function getAvailableProviders(): LLMProviderName[] {
  const available: LLMProviderName[] = [];
  if (process.env["ROUTING_API_KEY"]) available.push("routing.run");
  if (process.env["OPENAI_API_KEY"]) available.push("openai");
  if (process.env["ANTHROPIC_API_KEY"]) available.push("anthropic");
  if (process.env["GEMINI_API_KEY"]) available.push("gemini");
  return [...new Set(available)];
}
