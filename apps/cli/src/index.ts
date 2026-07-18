#!/usr/bin/env node
/**
 * Atlas CLI — Entry point
 *
 * This binary is the primary Phase 1 interface. The editor is a client of this.
 */

import { program } from "commander";
import { initCommand } from "./commands/init.js";
import { impactCommand } from "./commands/impact.js";
import { runCommand } from "./commands/run.js";
import { askCommand } from "./commands/ask.js";
import { doctorCommand } from "./commands/doctor.js";

const VERSION = "0.1.0";

program
  .name("atlas")
  .description("Atlas Studio CLI — AI-native code intelligence")
  .version(VERSION);

// ---------------------------------------------------------------------------
// atlas init [path]
// ---------------------------------------------------------------------------
program
  .command("init [path]")
  .description("Build the memory graph for a repository")
  .action(async (targetPath = ".") => {
    await initCommand(targetPath);
  });

// ---------------------------------------------------------------------------
// atlas impact <target>
// Atlas impact src/auth/signup.ts:validateInput
// ---------------------------------------------------------------------------
program
  .command("impact <target>")
  .description("Show live dependency impact for a file or file:symbol")
  .action(async (target: string) => {
    await impactCommand(target);
  });

// ---------------------------------------------------------------------------
// atlas run "<goal>"
// ---------------------------------------------------------------------------
program
  .command("run <goal>")
  .description("Run a goal through the full Planner → Coder → Tester → Reviewer loop")
  .option("--provider <provider>", "LLM provider (openai|anthropic|gemini)")
  .option("--model <model>", "Model override")
  .action(async (goal: string, options: { provider?: string; model?: string }) => {
    await runCommand(goal, options);
  });

// ---------------------------------------------------------------------------
// atlas ask "<question>"
// ---------------------------------------------------------------------------
program
  .command("ask <question>")
  .description("Query the memory graph directly — no agent loop")
  .action(async (question: string) => {
    await askCommand(question);
  });

// ---------------------------------------------------------------------------
// atlas doctor
// ---------------------------------------------------------------------------
program
  .command("doctor")
  .description("Sanity-check the Atlas setup")
  .action(async () => {
    await doctorCommand();
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
