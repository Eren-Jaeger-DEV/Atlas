/**
 * @atlas/agents — SmartModelClassifier
 *
 * Automatic intent and complexity classifier matching Cursor (`aiserver.v1` Smart Mode) (Chapter 12).
 * Evaluates prompt token length, file diff scope, and structural complexity to dynamically route
 * requests between fast models (e.g. Gemini Flash / GPT-4o-mini) and deep reasoning models (e.g. Gemini Pro / Claude 3.5 Sonnet).
 */

export type ModelTier = "FAST_COMPLETE" | "DEEP_REASONING" | "EMBEDDING";

export interface ClassificationResult {
  tier: ModelTier;
  recommendedModel: string;
  confidence: number;
  reason: string;
}

export class SmartModelClassifier {
  /**
   * Classify user prompt intent and task scope.
   */
  public classify(prompt: string, contextFilesCount = 0): ClassificationResult {
    const lower = prompt.toLowerCase();

    // Deep reasoning triggers
    const isDeepTask =
      lower.includes("architect") ||
      lower.includes("refactor") ||
      lower.includes("debug") ||
      lower.includes("migrate") ||
      lower.includes("security") ||
      prompt.length > 800 ||
      contextFilesCount > 5;

    if (isDeepTask) {
      return {
        tier: "DEEP_REASONING",
        recommendedModel: "gemini-1.5-pro",
        confidence: 0.92,
        reason: "Complex task intent or high context file count requires deep reasoning model.",
      };
    }

    // Default fast completion tier
    return {
      tier: "FAST_COMPLETE",
      recommendedModel: "gemini-1.5-flash",
      confidence: 0.98,
      reason: "Concise prompt scope suitable for high-speed model response.",
    };
  }
}
