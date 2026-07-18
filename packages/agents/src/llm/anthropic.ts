/**
 * @atlas/agents — Anthropic LLM Provider
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  ILLMProvider,
  LLMRequest,
  LLMResponse,
  LLMToolCall,
} from "@atlas/core";

export class AnthropicProvider implements ILLMProvider {
  readonly name = "anthropic";
  readonly models = [
    "claude-opus-4-5",
    "claude-sonnet-4-5",
    "claude-haiku-3-5",
  ];

  private client: Anthropic;
  private defaultModel: string;

  constructor(apiKey: string, model = "claude-sonnet-4-5") {
    this.client = new Anthropic({ apiKey });
    this.defaultModel = model;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model ?? this.defaultModel;

    // Anthropic separates system messages from the conversation
    const systemMessage = request.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n");

    const messages = request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const response = await this.client.messages.create({
      model,
      system: systemMessage || undefined,
      messages,
      tools: request.tools?.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters as any,
      })),
      max_tokens: request.maxTokens ?? 8096,
    });

    const toolCalls: LLMToolCall[] = response.content
      .filter((b) => b.type === "tool_use")
      .map((b: any) => ({
        id: b.id,
        name: b.name,
        arguments: b.input,
      }));

    const textContent = response.content
      .filter((b) => b.type === "text")
      .map((b: any) => b.text)
      .join("");

    return {
      content: textContent,
      toolCalls,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      model: response.model,
      raw: response,
    };
  }

  async stream(
    request: LLMRequest,
    onChunk: (chunk: string) => void
  ): Promise<LLMResponse> {
    const model = request.model ?? this.defaultModel;
    let fullContent = "";

    const systemMessage = request.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n");

    const messages = request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const stream = await this.client.messages.create({
      model,
      system: systemMessage || undefined,
      messages,
      max_tokens: request.maxTokens ?? 8096,
      stream: true,
    });

    let inputTokens = 0;
    let outputTokens = 0;

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        fullContent += event.delta.text;
        onChunk(event.delta.text);
      }
      if (event.type === "message_delta") {
        outputTokens = event.usage.output_tokens;
      }
      if (event.type === "message_start") {
        inputTokens = event.message.usage.input_tokens;
      }
    }

    return {
      content: fullContent,
      toolCalls: [],
      usage: { inputTokens, outputTokens },
      model,
    };
  }
}
