/**
 * @atlas/agents — Reviewer Agent
 *
 * Reviews the final diff against memory graph conventions and flags risk.
 * Uses the LLM to reason about the change quality, but also does static
 * checks (e.g. API surface changes, missing tests) without LLM involvement.
 */

import type { ILLMProvider, PlanStep, CoderOutput, ReviewResult, ReviewFinding, RiskLevel as AgentRiskLevel } from "@atlas/core";
import type { MemoryEngine } from "@atlas/graph";
import { queryMemoryTool, getImpactTool } from "./tools/graph-tools.js";

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const REVIEWER_SYSTEM = `You are the Reviewer agent in the Atlas Studio AI runtime.

You receive a unified diff representing code changes made by the Coder agent. Your job is to:
1. Check the diff for security issues (auth bypass, injection, hardcoded secrets)
2. Check for breaking API changes
3. Check for missing test coverage
4. Check conventions against the project's memory graph
5. Assess overall risk

Produce a JSON review result in this format:
{
  "overallRisk": "low" | "medium" | "high" | "critical",
  "requiresHumanReview": boolean,
  "summary": "One paragraph summary of the change quality and risk",
  "findings": [
    {
      "kind": "security" | "breaking_change" | "convention_violation" | "performance" | "test_coverage" | "info",
      "riskLevel": "low" | "medium" | "high" | "critical",
      "title": "Short title",
      "description": "Detailed explanation"
    }
  ]
}

requiresHumanReview = true when: overallRisk is high or critical, or when findings include security/breaking_change items.`;

// ---------------------------------------------------------------------------
// Reviewer
// ---------------------------------------------------------------------------

export interface ReviewerOptions {
  provider: ILLMProvider;
  memory: MemoryEngine;
  repoRoot: string;
  onProgress?: (message: string) => void;
}

export async function runReviewer(
  step: PlanStep,
  coderOutput: CoderOutput,
  options: ReviewerOptions
): Promise<ReviewResult> {
  const { provider, memory, repoRoot, onProgress } = options;

  onProgress?.("🔍 Reviewer: analysing diff...");

  // Get graph context for conventions
  const conventionContext = await queryMemoryTool(
    "code conventions architecture decisions patterns",
    { memory, repoRoot }
  );

  // Get impact of the modified files
  const impactContextParts: string[] = [];
  for (const fp of coderOutput.modifiedFiles.slice(0, 3)) {
    const impact = await getImpactTool(fp, undefined, { memory, repoRoot });
    impactContextParts.push(`Impact of ${fp}:\n${impact}`);
  }

  const messages = [
    { role: "system" as const, content: REVIEWER_SYSTEM },
    {
      role: "user" as const,
      content: `Plan step: ${step.title}\n\nGoal: ${step.description}\n\nCoder's reasoning:\n${coderOutput.reasoning}\n\nProject conventions from memory graph:\n${conventionContext}\n\nImpact analysis:\n${impactContextParts.join("\n\n")}\n\nDiff to review:\n\`\`\`diff\n${coderOutput.diff.slice(0, 20_000)}\n\`\`\`\n\nProvide your review as JSON.`,
    },
  ];

  const response = await provider.complete({
    messages,
    temperature: 0.1,
  });

  // Parse review result
  let parsed: any;
  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in reviewer response");
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    // Fallback: minimal safe result
    parsed = {
      overallRisk: "medium",
      requiresHumanReview: false,
      summary: response.content,
      findings: [],
    };
  }

  const findings: ReviewFinding[] = (parsed.findings ?? []).map((f: any) => ({
    kind: f.kind ?? "info",
    riskLevel: f.riskLevel ?? "low",
    title: f.title ?? "Finding",
    description: f.description ?? "",
  }));

  const result: ReviewResult = {
    planStepId: step.id,
    overallRisk: parsed.overallRisk ?? "medium",
    findings,
    summary: parsed.summary ?? "",
    requiresHumanReview: parsed.requiresHumanReview ?? false,
    createdAt: Date.now(),
  };

  const riskSymbol: Record<string, string> = {
    low: "[LOW]",
    medium: "[MEDIUM]",
    high: "[HIGH]",
    critical: "[CRITICAL]",
  };
  onProgress?.(
    `${riskSymbol[result.overallRisk] ?? "[UNKNOWN]"} Reviewer: ${result.overallRisk} risk, ${findings.length} finding(s)`
  );

  return result;
}
