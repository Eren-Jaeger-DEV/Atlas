/**
 * @atlas/agents — OpenAI LLM Provider
 */

import OpenAI from "openai";
import type {
  ILLMProvider,
  LLMRequest,
  LLMResponse,
  LLMToolCall,
} from "@atlas/core";

export class OpenAIProvider implements ILLMProvider {
  readonly name = "openai";
  readonly models = ["gpt-4o", "gpt-4o-mini", "o3", "o3-mini"];

  private client: OpenAI;
  private defaultModel: string;

  constructor(apiKey: string, model = "gpt-4o", baseUrl?: string) {
    this.client = new OpenAI({ apiKey, baseURL: baseUrl });
    this.defaultModel = model;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model ?? this.defaultModel;

    const response = await this.client.chat.completions.create({
      model,
      messages: request.messages.map((m) => ({
        role: m.role as any,
        content: m.content,
        tool_call_id: m.toolCallId,
        tool_calls: m.toolCalls?.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        })),
      })),
      tools: request.tools?.map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      })),
      tool_choice:
        request.toolChoice === "required"
          ? "required"
          : request.toolChoice === "auto"
          ? "auto"
          : typeof request.toolChoice === "object"
          ? { type: "function", function: { name: request.toolChoice.name } }
          : undefined,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
    });

    const choice = response.choices[0];
    if (!choice) throw new Error("OpenAI returned no choices");

    const toolCalls: LLMToolCall[] =
      choice.message.tool_calls?.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments || "{}"),
      })) ?? [];

    return {
      content: choice.message.content ?? "",
      toolCalls,
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
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

    const stream = await this.client.chat.completions.create({
      model,
      messages: request.messages.map((m) => ({
        role: m.role as any,
        content: m.content,
      })),
      tools: request.tools?.map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      })),
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) {
        fullContent += delta;
        onChunk(delta);
      }
    }

    return {
      content: fullContent,
      toolCalls: [],
      usage: { inputTokens: 0, outputTokens: 0 },
      model,
    };
  }
}
