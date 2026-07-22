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

export function createProvider(config: LLMProviderConfig): ILLMProvider {
  switch (config.provider) {
    case "openai":
    case "openai-compatible":
      return new OpenAIProvider(config.apiKey, config.model, config.baseUrl);
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
    let model = process.env["ATLAS_MODEL"] ?? "claude-sonnet-4-6";
    if (model === "anthropic/claude-3.5-sonnet") {
      model = "claude-sonnet-4-6";
    }
    return {
      provider: "openai", // routing.run supports the OpenAI SDK
      apiKey: process.env["ROUTING_API_KEY"],
      model: model,
      baseUrl: "https://api.routing.run/v1",
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
    "No LLM provider API key found. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY."
  );
}

export function getAvailableProviders(): LLMProviderName[] {
  const available: LLMProviderName[] = [];
  if (process.env["ROUTING_API_KEY"] || process.env["OPENAI_API_KEY"]) available.push("openai");
  if (process.env["ANTHROPIC_API_KEY"]) available.push("anthropic");
  if (process.env["GEMINI_API_KEY"]) available.push("gemini");
  return available;
}
