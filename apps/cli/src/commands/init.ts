/**
 * atlas init — Build the memory graph for a repository
 */

import path from "node:path";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import chalk from "chalk";
import ora from "ora";
import { indexRepository } from "@atlas/parser";
import { MemoryEngine } from "@atlas/graph";

export async function initCommand(targetPath: string): Promise<void> {
  const repoRoot = path.resolve(targetPath);

  if (!existsSync(repoRoot)) {
    console.error(chalk.red(`✗ Path does not exist: ${repoRoot}`));
    process.exit(1);
  }

  console.log(chalk.bold.cyan("\n  Atlas Studio\n"));
  console.log(chalk.dim(`  Indexing: ${repoRoot}\n`));

  // Create .atlas directory
  await mkdir(path.join(repoRoot, ".atlas"), { recursive: true });

  const engine = await MemoryEngine.create({ repoRoot });

  // Progress tracking
  let lastPercent = -1;
  const spinner = ora({
    text: "Scanning files...",
    color: "cyan",
  }).start();

  const startTime = Date.now();

  const result = await indexRepository({
    repoRoot,
    onProgress: (current, total, filePath) => {
      const percent = Math.floor((current / total) * 100);
      const relPath = path.relative(repoRoot, filePath);

      if (percent !== lastPercent) {
        lastPercent = percent;
        const bar = buildProgressBar(percent);
        spinner.text = `${bar} ${percent}% — ${relPath.slice(0, 50)}`;
      }
    },
  });

  spinner.stop();

  // Bulk write to database
  const writeSpinner = ora("Writing graph to database...").start();
  await engine.bulkIndex(result.nodes, result.edges);
  writeSpinner.succeed("Graph written to database");

  const stats = engine.getStats();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Summary
  console.log(chalk.green("\n  ✓ Atlas graph ready\n"));
  console.log(`  ${chalk.bold("Files indexed:")}  ${result.totalFiles}`);
  console.log(`  ${chalk.bold("Nodes:")}          ${stats.nodeCount.toLocaleString()}`);
  console.log(`  ${chalk.bold("Edges:")}          ${stats.edgeCount.toLocaleString()}`);
  console.log(`  ${chalk.bold("Time:")}           ${elapsed}s`);

  if (result.errors.length > 0) {
    console.log(
      chalk.yellow(`\n  ⚠ ${result.errors.length} file(s) failed to parse`)
    );
    for (const err of result.errors) {
      console.log(chalk.dim(`    ${err.filePath}: ${err.error}`));
    }
  }

  console.log(chalk.dim(`\n  Graph stored at: ${repoRoot}/.atlas/graph.db\n`));
  engine.close();
}

function buildProgressBar(percent: number): string {
  const width = 20;
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return chalk.cyan("█".repeat(filled)) + chalk.dim("░".repeat(empty));
}
