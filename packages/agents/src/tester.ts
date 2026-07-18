/**
 * @atlas/agents — Tester Agent
 *
 * Runs the repository's test suite after a Coder output has been applied.
 * Returns a TestResult — pass/fail + specific failures to feed back to Coder.
 *
 * The Tester is intentionally simple: it runs the tests, parses the output,
 * and returns structured results. It does NOT use an LLM.
 */

import type { TestResult, PlanStep } from "@atlas/core";
import { runTestsTool } from "./tools/shell-tools.js";

// ---------------------------------------------------------------------------
// Simple test output parsers
// ---------------------------------------------------------------------------

function parseJestOutput(output: string, exitCode: number): Omit<TestResult, "planStepId" | "durationMs"> {
  const totalMatch = output.match(/Tests?:\s+(\d+)\s+(?:total|passed|failed)/g);
  const passedMatch = output.match(/(\d+)\s+passed/);
  const failedMatch = output.match(/(\d+)\s+failed/);

  const passed = passedMatch ? parseInt(passedMatch[1]!, 10) : 0;
  const failed = failedMatch ? parseInt(failedMatch[1]!, 10) : 0;
  const total = passed + failed;

  // Extract individual test failures
  const failures: TestResult["failures"] = [];
  const failureBlocks = output.matchAll(
    /● (.+?)\n\n([\s\S]+?)(?=\n  ● |\n─+|\n Tests:|$)/g
  );
  for (const match of failureBlocks) {
    failures.push({
      testName: match[1]?.trim() ?? "Unknown test",
      message: (match[2] ?? "").trim().slice(0, 2000),
    });
  }

  return {
    status: exitCode === 0 ? "passed" : "failed",
    total,
    passed,
    failed,
    output: output.slice(0, 10_000),
    failures,
  };
}

function parsePytestOutput(output: string, exitCode: number): Omit<TestResult, "planStepId" | "durationMs"> {
  const summaryMatch = output.match(/(\d+) passed(?:, (\d+) failed)?/);
  const passed = summaryMatch ? parseInt(summaryMatch[1]!, 10) : 0;
  const failed = summaryMatch?.[2] ? parseInt(summaryMatch[2], 10) : 0;

  const failures: TestResult["failures"] = [];
  const failureBlocks = output.matchAll(/FAILED (.+?) - (.+)/g);
  for (const match of failureBlocks) {
    failures.push({
      testName: match[1]?.trim() ?? "Unknown test",
      message: match[2]?.trim() ?? "",
    });
  }

  return {
    status: exitCode === 0 ? "passed" : "failed",
    total: passed + failed,
    passed,
    failed,
    output: output.slice(0, 10_000),
    failures,
  };
}

function parseGenericOutput(output: string, exitCode: number): Omit<TestResult, "planStepId" | "durationMs"> {
  return {
    status: exitCode === 0 ? "passed" : "failed",
    total: 0,
    passed: exitCode === 0 ? 1 : 0,
    failed: exitCode !== 0 ? 1 : 0,
    output: output.slice(0, 10_000),
    failures:
      exitCode !== 0
        ? [{ testName: "Test run", message: output.slice(0, 2000) }]
        : [],
  };
}

// ---------------------------------------------------------------------------
// Tester
// ---------------------------------------------------------------------------

export interface TesterOptions {
  repoRoot: string;
  onProgress?: (message: string) => void;
}

export async function runTester(
  step: PlanStep,
  options: TesterOptions
): Promise<TestResult> {
  const { repoRoot, onProgress } = options;

  onProgress?.("🧪 Tester: running test suite...");

  const start = Date.now();
  const result = await runTestsTool(repoRoot);
  const durationMs = Date.now() - start;

  // Detect test framework from output
  const output = `${result.stdout}\n${result.stderr}`;
  let parsed: Omit<TestResult, "planStepId" | "durationMs">;

  if (output.includes("jest") || output.includes("PASS ") || output.includes("FAIL ")) {
    parsed = parseJestOutput(output, result.exitCode);
  } else if (output.includes("pytest") || output.includes("::") || output.includes("passed")) {
    parsed = parsePytestOutput(output, result.exitCode);
  } else {
    parsed = parseGenericOutput(output, result.exitCode);
  }

  const testResult: TestResult = {
    planStepId: step.id,
    ...parsed,
    durationMs,
  };

  const statusEmoji = testResult.status === "passed" ? "✅" : "❌";
  onProgress?.(
    `${statusEmoji} Tester: ${testResult.passed}/${testResult.total} passed (${durationMs}ms)`
  );

  return testResult;
}
