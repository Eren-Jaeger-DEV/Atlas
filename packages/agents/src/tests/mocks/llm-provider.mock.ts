import type { ILLMProvider, LLMRequest, LLMResponse, LLMToolCall } from "@atlas/core";

export class MockLLMProvider implements ILLMProvider {
  readonly name = "mock-provider";
  readonly models = ["mock-model"];

  private responses: LLMResponse[] = [];
  private onCompleteCallback?: (req: LLMRequest) => void;

  enqueueResponse(content: string, toolCalls: LLMToolCall[] = []): void {
    this.responses.push({
      content,
      toolCalls,
      usage: { inputTokens: 10, outputTokens: 10 },
      model: "mock-model",
    });
  }

  onComplete(cb: (req: LLMRequest) => void): void {
    this.onCompleteCallback = cb;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    if (this.onCompleteCallback) {
      this.onCompleteCallback(request);
    }
    const response = this.responses.shift();
    if (!response) {
      return {
        content: "Default mock response",
        toolCalls: [],
        usage: { inputTokens: 0, outputTokens: 0 },
        model: "mock-model",
      };
    }
    return response;
  }

  async stream(
    request: LLMRequest,
    onChunk: (chunk: string) => void
  ): Promise<LLMResponse> {
    const response = await this.complete(request);
    onChunk(response.content);
    return response;
  }
}
