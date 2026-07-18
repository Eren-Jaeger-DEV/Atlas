/**
 * atlas run — Execute a goal: Planner → Coder → Tester → Reviewer
 */

import path from "node:path";
import { existsSync } from "node:fs";
import chalk from "chalk";
import boxen from "boxen";
import { MemoryEngine } from "@atlas/graph";
import { Orchestrator, detectProviderFromEnv, createProvider } from "@atlas/agents";
import type { OrchestratorEvent } from "@atlas/core";

export async function runCommand(goal: string, options: { provider?: string; model?: string }): Promise<void> {
  const repoRoot = findRepoRoot(process.cwd());
  if (!repoRoot) {
    console.error(chalk.red("✗ No Atlas graph found. Run `atlas init` first."));
    process.exit(1);
  }

  // Check for API keys
  let providerConfig;
  try {
    providerConfig = detectProviderFromEnv();
  } catch {
    console.error(chalk.red("✗ No LLM API key found."));
    console.error(chalk.dim("  Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY"));
    process.exit(1);
  }

  // Override provider/model from CLI flags
  if (options.provider) {
    providerConfig = {
      ...providerConfig,
      provider: options.provider as any,
    };
  }
  if (options.model) {
    providerConfig = { ...providerConfig, model: options.model };
  }

  const provider = createProvider(providerConfig);
  const memory = await MemoryEngine.create({ repoRoot });

  // Print goal header
  console.log(
    boxen(
      chalk.bold.cyan("Atlas Run\n") +
        chalk.dim(`Provider: ${providerConfig.provider} / ${providerConfig.model ?? "default"}\n`) +
        chalk.white(`Goal: ${goal}`),
      {
        padding: 1,
        margin: { top: 1, bottom: 0, left: 2, right: 2 },
        borderStyle: "round",
        borderColor: "cyan",
      }
    )
  );

  console.log();

  const orchestrator = new Orchestrator({
    provider,
    memory,
    repoRoot,
    onEvent: (event: OrchestratorEvent) => handleEvent(event),
  });

  try {
    const record = await orchestrator.run(goal);

    if (record.finalState === "DONE") {
      console.log(chalk.green.bold("\n  ✓ Run completed successfully\n"));
    } else if (record.finalState === "AWAITING_HUMAN") {
      console.log(chalk.yellow.bold("\n  ⏸ Awaiting human review\n"));
    } else {
      console.log(chalk.red.bold("\n  ✗ Run ended with errors\n"));
    }

    // Summary
    console.log(`  ${chalk.bold("Run ID:")}      ${record.id}`);
    console.log(`  ${chalk.bold("Steps:")}       ${record.plan?.steps.length ?? 0}`);
    console.log(`  ${chalk.bold("Files changed:")} ${[...new Set(record.coderOutputs.flatMap((c) => c.modifiedFiles))].length}`);
    if (record.reviewResult) {
      const riskColors: Record<string, any> = {
        low: chalk.green,
        medium: chalk.yellow,
        high: chalk.red,
        critical: chalk.bgRed,
      };
      const riskColor = riskColors[record.reviewResult.overallRisk] ?? chalk.white;
      console.log(
        `  ${chalk.bold("Risk:")}        ${riskColor(record.reviewResult.overallRisk.toUpperCase())}`
      );
    }

    const elapsed = record.completedAt
      ? ((record.completedAt - record.startedAt) / 1000).toFixed(1)
      : "?";
    console.log(`  ${chalk.bold("Time:")}        ${elapsed}s`);
    console.log();
  } finally {
    memory.close();
  }
}

function handleEvent(event: OrchestratorEvent): void {
  switch (event.type) {
    case "state_change":
      if (event.state === "PLANNING") {
        console.log(chalk.bold.blue("\n  ── Planning ─────────────────────────────"));
      } else if (event.state === "CODING") {
        console.log(chalk.bold.magenta("\n  ── Coding ───────────────────────────────"));
      } else if (event.state === "TESTING") {
        console.log(chalk.bold.yellow("\n  ── Testing ──────────────────────────────"));
      } else if (event.state === "REVIEWING") {
        console.log(chalk.bold.cyan("\n  ── Reviewing ────────────────────────────"));
      }
      break;

    case "plan_ready":
      console.log(chalk.green(`  ✓ Plan: ${event.plan.steps.length} steps`));
      for (const step of event.plan.steps) {
        console.log(chalk.dim(`    ${step.order + 1}. ${step.title}`));
      }
      break;

    case "step_start":
      console.log(chalk.cyan(`\n  → Step ${event.step.order + 1}: ${event.step.title}`));
      break;

    case "coder_output":
      console.log(chalk.green(`  ✓ Changed: ${event.output.modifiedFiles.join(", ")}`));
      break;

    case "test_result":
      if (event.result.status === "passed") {
        console.log(
          chalk.green(
            `  ✓ Tests: ${event.result.passed}/${event.result.total} passed`
          )
        );
      } else {
        console.log(
          chalk.red(
            `  ✗ Tests: ${event.result.failed} failed / ${event.result.total} total`
          )
        );
        for (const f of event.result.failures.slice(0, 3)) {
          console.log(chalk.dim(`    • ${f.testName}`));
        }
      }
      break;

    case "review_result": {
      const riskColor =
        event.result.overallRisk === "low"
          ? chalk.green
          : event.result.overallRisk === "medium"
          ? chalk.yellow
          : chalk.red;
      console.log(
        riskColor(`  ✓ Review: ${event.result.overallRisk} risk`)
      );
      if (event.result.findings.length > 0) {
        for (const f of event.result.findings.slice(0, 3)) {
          console.log(chalk.dim(`    • [${f.kind}] ${f.title}`));
        }
      }
      break;
    }

    case "awaiting_human":
      console.log(chalk.yellow(`\n  ⏸ ${event.reason}`));
      break;

    case "error":
      console.log(chalk.red(`\n  ✗ Error: ${event.message}`));
      break;
  }
}

function findRepoRoot(cwd: string): string | undefined {
  let dir = cwd;
  while (dir !== path.dirname(dir)) {
    if (existsSync(path.join(dir, ".atlas", "graph.db"))) return dir;
    dir = path.dirname(dir);
  }
  return undefined;
}
