/**
 * atlas impact — Live dependency impact for a file or function
 *
 * Usage:
 *   atlas impact src/auth/signup.ts
 *   atlas impact src/auth/signup.ts:validateInput
 */

import path from "node:path";
import { existsSync } from "node:fs";
import chalk from "chalk";
import Table from "cli-table3";
import { MemoryEngine } from "@atlas/graph";
import type { ImpactResult, AffectedFile } from "@atlas/core";

export async function impactCommand(target: string): Promise<void> {
  // Parse "file:symbol" syntax
  const colonIdx = target.lastIndexOf(":");
  let filePath: string;
  let symbolName: string | undefined;

  if (colonIdx > 1 && !target.slice(colonIdx - 1, colonIdx + 1).includes(":\\")) {
    filePath = target.slice(0, colonIdx);
    symbolName = target.slice(colonIdx + 1) || undefined;
  } else {
    filePath = target;
  }

  const repoRoot = findRepoRoot(process.cwd());
  if (!repoRoot) {
    console.error(
      chalk.red("✗ No Atlas graph found. Run `atlas init` first.")
    );
    process.exit(1);
  }

  const absPath = path.resolve(repoRoot, filePath);
  if (!existsSync(absPath)) {
    console.error(chalk.red(`✗ File not found: ${filePath}`));
    process.exit(1);
  }

  const engine = await MemoryEngine.create({ repoRoot });

  const start = performance.now();
  const result = await engine.impact(absPath, symbolName);
  const elapsed = (performance.now() - start).toFixed(0);

  printImpactResult(result, filePath, symbolName, elapsed);
  engine.close();
}

function printImpactResult(
  result: ImpactResult,
  filePath: string,
  symbolName: string | undefined,
  elapsed: string
): void {
  const riskColors: Record<string, any> = {
    low: chalk.green,
    medium: chalk.yellow,
    high: chalk.red,
    critical: chalk.bgRed.white,
  };
  const riskIcons: Record<string, string> = {
    low: "●",
    medium: "◆",
    high: "▲",
    critical: "✖",
  };

  const riskColor = riskColors[result.riskLevel] ?? chalk.white;
  const riskIcon = riskIcons[result.riskLevel] ?? "?";

  console.log(chalk.bold.cyan("\n  Atlas Impact Analysis\n"));

  // Target
  const targetStr = symbolName ? `${filePath}:${chalk.bold(symbolName)}` : filePath;
  console.log(`  Target: ${chalk.dim(targetStr)}`);
  console.log(`  Computed in: ${chalk.dim(elapsed + "ms")}\n`);

  // Risk banner
  const riskBanner = riskColor(`  ${riskIcon} ${result.riskLevel.toUpperCase()} RISK`);
  console.log(riskBanner);
  console.log(chalk.dim(`  ${result.riskRationale}\n`));

  // Summary metrics table
  const metricsTable = new Table({
    head: [
      chalk.bold("Affected Files"),
      chalk.bold("Tests Affected"),
      chalk.bold("API Endpoints"),
    ],
    style: { head: [], border: [] },
    chars: {
      top: "─", "top-mid": "┬", "top-left": "╭", "top-right": "╮",
      bottom: "─", "bottom-mid": "┴", "bottom-left": "╰", "bottom-right": "╯",
      left: "│", "left-mid": "├", mid: "─", "mid-mid": "┼",
      right: "│", "right-mid": "┤", middle: "│",
    },
  });

  metricsTable.push([
    chalk.bold(String(result.affectedFiles.length)),
    chalk.bold(String(result.affectedTestFiles.length)),
    chalk.bold(String(result.affectedApiEndpoints.length)),
  ]);
  console.log(metricsTable.toString());

  // Affected files detail (top 15)
  if (result.affectedFiles.length > 0) {
    console.log(chalk.bold("\n  Affected Files:\n"));
    const shown = result.affectedFiles.slice(0, 15);

    for (const file of shown) {
      const badge = getBadge(file, result);
      const dist = chalk.dim(`${file.distance}hop`);
      console.log(`  ${dist}  ${badge}${chalk.dim(file.filePath)}`);
    }

    if (result.affectedFiles.length > 15) {
      console.log(
        chalk.dim(`\n  ... and ${result.affectedFiles.length - 15} more`)
      );
    }
  } else {
    console.log(
      chalk.dim("\n  No downstream dependencies found for this target.\n")
    );
  }

  console.log();
}

function getBadge(file: AffectedFile, result: ImpactResult): string {
  const isTest = result.affectedTestFiles.some((f) => f.filePath === file.filePath);
  const isApi = result.affectedApiEndpoints.some((f) => f.filePath === file.filePath);
  if (isTest) return chalk.blue("[test] ");
  if (isApi) return chalk.magenta("[api]  ");
  return "       ";
}

function findRepoRoot(cwd: string): string | undefined {
  let dir = cwd;
  while (dir !== path.dirname(dir)) {
    if (existsSync(path.join(dir, ".atlas", "graph.db"))) return dir;
    dir = path.dirname(dir);
  }
  return undefined;
}
