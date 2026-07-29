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
    const cleanKey = String(apiKey || "").replace(/^["']|["']$/g, "").trim();
    this.client = new OpenAI({ apiKey: cleanKey, baseURL: baseUrl });
    this.defaultModel = model;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model ?? this.defaultModel;

    const response = await this.client.chat.completions.create({
      model,
      messages: request.messages.map((m) => ({
        role: ((m.role as string) === "agent" ? "assistant" : m.role) as any,
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
    const accumToolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map();

    const fallbackModels = ["deepseek-v4-pro", "kimi-k2.7-code", "gpt-5.6-luna"];
    const tryModels = [model, ...fallbackModels.filter((m) => m !== model)];

    let stream: any = null;

    for (const m of tryModels) {
      try {
        stream = await this.client.chat.completions.create({
          model: m,
          messages: request.messages.map((m) => ({
            role: ((m.role as string) === "agent" ? "assistant" : m.role) as any,
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
        if (m !== model) {
          onChunk(`[Failover] Switched to ${m} (primary model ${model} route offline)\n\n`);
        }
        break;
      } catch (err: any) {
        console.warn(`[OpenAIProvider] Model ${m} stream failed: ${err?.message || err}. Trying fallback...`);
      }
    }

    if (!stream) {
      throw new Error(`All model routes failed. Please check network connection.`);
    }

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      const reasoningDelta = (delta as any).reasoning_content || (delta as any).thinking || (delta as any).reasoning;
      if (reasoningDelta) {
        onChunk(reasoningDelta);
      }

      if (delta.content) {
        fullContent += delta.content;
        onChunk(delta.content);
      }

      if (delta.tool_calls) {
        for (const tcDelta of delta.tool_calls) {
          const index = tcDelta.index;
          if (!accumToolCalls.has(index)) {
            accumToolCalls.set(index, {
              id: tcDelta.id || `call_${Date.now()}_${index}`,
              name: tcDelta.function?.name || "",
              arguments: tcDelta.function?.arguments || "",
            });
          } else {
            const existing = accumToolCalls.get(index)!;
            if (tcDelta.id) existing.id = tcDelta.id;
            if (tcDelta.function?.name) existing.name = tcDelta.function.name;
            if (tcDelta.function?.arguments) existing.arguments += tcDelta.function.arguments;
          }
        }
      }
    }

    const toolCalls: LLMToolCall[] = Array.from(accumToolCalls.values()).map((tc) => {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(tc.arguments || "{}");
      } catch (e) {}
      return {
        id: tc.id,
        name: tc.name,
        arguments: parsedArgs,
      };
    });

    return {
      content: fullContent,
      toolCalls,
      usage: { inputTokens: 0, outputTokens: 0 },
      model,
    };
  }
}
