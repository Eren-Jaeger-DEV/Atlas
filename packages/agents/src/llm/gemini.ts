/**
 * @atlas/agents — Google Gemini LLM Provider
 */

import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import type {
  ILLMProvider,
  LLMRequest,
  LLMResponse,
  LLMToolCall,
} from "@atlas/core";

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export class GeminiProvider implements ILLMProvider {
  readonly name = "gemini";
  readonly models = [
    "gemini-2.0-flash",
    "gemini-2.0-pro",
    "gemini-1.5-pro",
  ];

  private client: GoogleGenerativeAI;
  private defaultModel: string;

  constructor(apiKey: string, model = "gemini-2.0-flash") {
    this.client = new GoogleGenerativeAI(apiKey);
    this.defaultModel = model;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const modelName = request.model ?? this.defaultModel;

    const systemInstruction = request.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n");

    const model = this.client.getGenerativeModel({
      model: modelName,
      systemInstruction: systemInstruction || undefined,
      safetySettings: SAFETY_SETTINGS,
      tools: request.tools
        ? [
            {
              functionDeclarations: request.tools.map((t) => ({
                name: t.name,
                description: t.description,
                parameters: t.parameters as any,
              })),
            },
          ]
        : undefined,
    });

    const history = request.messages
      .filter((m) => m.role !== "system")
      .slice(0, -1)
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const lastMessage = request.messages.filter((m) => m.role !== "system").at(-1);
    if (!lastMessage) throw new Error("No user message provided");

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;

    const toolCalls: LLMToolCall[] = [];
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.functionCall) {
        toolCalls.push({
          id: `gemini-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: part.functionCall.name,
          arguments: part.functionCall.args as Record<string, unknown>,
        });
      }
    }

    return {
      content: response.text(),
      toolCalls,
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      },
      model: modelName,
      raw: response,
    };
  }

  async stream(
    request: LLMRequest,
    onChunk: (chunk: string) => void
  ): Promise<LLMResponse> {
    const modelName = request.model ?? this.defaultModel;

    const systemInstruction = request.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n");

    const model = this.client.getGenerativeModel({
      model: modelName,
      systemInstruction: systemInstruction || undefined,
      safetySettings: SAFETY_SETTINGS,
    });

    const lastMessage = request.messages.filter((m) => m.role !== "system").at(-1);
    if (!lastMessage) throw new Error("No user message");

    const result = await model.generateContentStream(lastMessage.content);
    let fullContent = "";

    for await (const chunk of result.stream) {
      const text = chunk.text();
      fullContent += text;
      onChunk(text);
    }

    return {
      content: fullContent,
      toolCalls: [],
      usage: { inputTokens: 0, outputTokens: 0 },
      model: modelName,
    };
  }
}
