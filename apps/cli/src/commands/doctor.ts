/**
 * atlas doctor — Sanity check the Atlas setup
 */

import path from "node:path";
import { existsSync } from "node:fs";
import chalk from "chalk";
import { getAvailableProviders } from "@atlas/agents";

interface Check {
  name: string;
  passed: boolean;
  detail: string;
}

export async function doctorCommand(): Promise<void> {
  console.log(chalk.bold.cyan("\n  Atlas Doctor\n"));

  const checks: Check[] = [];

  // Node.js version
  const nodeVersion = process.versions.node;
  const [major] = nodeVersion.split(".").map(Number);
  checks.push({
    name: "Node.js version",
    passed: (major ?? 0) >= 20,
    detail: `v${nodeVersion} (requires ≥ 20)`,
  });

  // Atlas graph exists
  const repoRoot = findRepoRoot(process.cwd());
  checks.push({
    name: "Atlas graph initialised",
    passed: repoRoot !== undefined,
    detail: repoRoot
      ? `Found at ${path.join(repoRoot, ".atlas", "graph.db")}`
      : "Run `atlas init` to build the graph",
  });

  // LLM API keys
  const providers = getAvailableProviders();
  checks.push({
    name: "LLM provider configured",
    passed: providers.length > 0,
    detail:
      providers.length > 0
        ? `Available: ${providers.join(", ")}`
        : "Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY",
  });

  // ATLAS_MODEL env var (optional)
  if (process.env["ATLAS_MODEL"]) {
    checks.push({
      name: "Model override",
      passed: true,
      detail: `ATLAS_MODEL=${process.env["ATLAS_MODEL"]}`,
    });
  }

  // Print results
  let allPassed = true;
  for (const check of checks) {
    const icon = check.passed ? chalk.green("✓") : chalk.red("✗");
    const name = chalk.bold(check.name.padEnd(32));
    const detail = check.passed
      ? chalk.dim(check.detail)
      : chalk.yellow(check.detail);
    console.log(`  ${icon}  ${name} ${detail}`);
    if (!check.passed) allPassed = false;
  }

  console.log();

  if (allPassed) {
    console.log(chalk.green("  Everything looks good! Atlas is ready.\n"));
  } else {
    console.log(
      chalk.yellow(
        "  Some checks failed. Address the issues above before running `atlas run`.\n"
      )
    );
    process.exit(1);
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
