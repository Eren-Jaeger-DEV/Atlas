/**
 * atlas ask — Query the memory graph directly, no agent loop
 */

import path from "node:path";
import { existsSync } from "node:fs";
import chalk from "chalk";
import { MemoryEngine } from "@atlas/graph";

export async function askCommand(question: string): Promise<void> {
  const repoRoot = findRepoRoot(process.cwd());
  if (!repoRoot) {
    console.error(chalk.red("✗ No Atlas graph found. Run `atlas init` first."));
    process.exit(1);
  }

  const engine = await MemoryEngine.create({ repoRoot });
  const results = engine.search(question, 10);

  console.log(chalk.bold.cyan(`\n  Atlas Ask: "${question}"\n`));

  if (results.length === 0) {
    console.log(chalk.dim("  No results found in the memory graph.\n"));
    engine.close();
    return;
  }

  for (const node of results) {
    const kindColor: Record<string, any> = {
      file: chalk.blue,
      function: chalk.green,
      class: chalk.magenta,
      decision: chalk.yellow,
      bug: chalk.red,
      todo: chalk.dim,
      symbol: chalk.cyan,
    };
    const color = kindColor[node.kind] ?? chalk.white;
    console.log(
      `  ${color(`[${node.kind}]`)} ${chalk.bold(node.label)}`
    );
    console.log(chalk.dim(`          ${node.filePath}:${node.startLine ?? "?"}`));
    if (node.summary) {
      console.log(chalk.dim(`          ${node.summary.slice(0, 120)}`));
    }
    console.log();
  }

  engine.close();
}

function findRepoRoot(cwd: string): string | undefined {
  let dir = cwd;
  while (dir !== path.dirname(dir)) {
    if (existsSync(path.join(dir, ".atlas", "graph.db"))) return dir;
    dir = path.dirname(dir);
  }
  return undefined;
}
