/**
 * @atlas/core — LLM Provider Interface
 *
 * The agent runtime uses this interface exclusively. Adding a new provider
 * means implementing ILLMProvider — nothing else changes.
 */

// ---------------------------------------------------------------------------
// Message types
// ---------------------------------------------------------------------------

export type LLMRole = "system" | "user" | "assistant" | "tool";

export interface LLMMessage {
  role: LLMRole;
  content: string;
  /** Present when role === "tool" */
  toolCallId?: string;
  /** Present when role === "assistant" and the model made a tool call */
  toolCalls?: LLMToolCall[];
}

// ---------------------------------------------------------------------------
// Tool / function calling
// ---------------------------------------------------------------------------

export interface LLMToolDefinition {
  name: string;
  description: string;
  /** JSON Schema for the tool's input parameters */
  parameters: Record<string, unknown>;
}

export interface LLMToolCall {
  id: string;
  name: string;
  /** Parsed arguments (JSON-decoded) */
  arguments: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Request / Response
// ---------------------------------------------------------------------------

export interface LLMRequest {
  model?: string;
  messages: LLMMessage[];
  tools?: LLMToolDefinition[];
  /** If set, the model MUST call one of the specified tools */
  toolChoice?: "auto" | "required" | { name: string };
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  content: string;
  toolCalls: LLMToolCall[];
  /** Tokens used — for cost tracking */
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  /** Which model was actually used (provider may route to different version) */
  model: string;
  /** Raw provider response for debugging */
  raw?: unknown;
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export interface ILLMProvider {
  readonly name: string;
  /** List of model IDs this provider supports */
  readonly models: string[];
  /** Send a chat completion request */
  complete(request: LLMRequest): Promise<LLMResponse>;
  /** Streaming variant — yields chunks as they arrive */
  stream(
    request: LLMRequest,
    onChunk: (chunk: string) => void
  ): Promise<LLMResponse>;
}

// ---------------------------------------------------------------------------
// Provider config
// ---------------------------------------------------------------------------

export type LLMProviderName = "openai" | "anthropic" | "gemini" | "openai-compatible";

export interface LLMProviderConfig {
  provider: LLMProviderName;
  apiKey: string;
  /** Override the default model for this provider */
  model?: string;
  /** Base URL override (for Azure OpenAI, local proxies, etc.) */
  baseUrl?: string;
}
