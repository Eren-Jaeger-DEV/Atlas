/**
 * AtlasParallel — WorkflowSkillCreator
 *
 * Converts completed multi-agent task execution plans into reusable custom Agent Skills.
 * Packages execution steps into `.agents/skills/<skill_name>/SKILL.md` with standard YAML
 * frontmatter so any Atlas agent can reuse the workflow.
 */

import fs from "node:fs";
import path from "node:path";
import type { ParallelPlan, WorkerState } from "./types.js";

export class WorkflowSkillCreator {
  private repoRoot: string;

  constructor(repoRoot: string) {
    this.repoRoot = repoRoot;
  }

  /**
   * Package a completed parallel plan into a reusable Agent Skill directory.
   */
  async packageWorkflowAsSkill(
    plan: ParallelPlan,
    workers: WorkerState[],
    skillName: string
  ): Promise<string> {
    const sanitizedName = skillName.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
    const skillDir = path.join(this.repoRoot, ".agents", "skills", sanitizedName);
    fs.mkdirSync(skillDir, { recursive: true });

    const skillPath = path.join(skillDir, "SKILL.md");

    const stepsMarkdown = plan.tasks.map((task, idx) => {
      const w = workers.find(work => work.task.id === task.id);
      return [
        `### Step ${idx + 1}: ${task.title}`,
        `- **Goal**: ${task.goal}`,
        `- **Target Files**: ${task.estimatedFiles.join(", ") || "Auto-detected"}`,
        `- **Dependencies**: ${task.deps.join(", ") || "None"}`,
        w?.output ? `- **Execution Note**: Task completed successfully.` : ""
      ].filter(Boolean).join("\n");
    }).join("\n\n");

    const content = [
      `---`,
      `name: ${sanitizedName}`,
      `description: ${plan.overallGoal.replace(/\n/g, " ")}`,
      `---`,
      ``,
      `# ${plan.overallGoal}`,
      ``,
      `## Overview`,
      `This skill was auto-distilled from a successful Atlas Parallel multi-agent execution run on ${new Date().toISOString().split("T")[0]}.`,
      ``,
      `## Workflow Steps`,
      stepsMarkdown,
      ``,
      `## Instructions for Agent`,
      `When executing this skill, follow the step structure defined above. Delegate sub-tasks in parallel where dependencies allow.`,
      ``
    ].join("\n");

    fs.writeFileSync(skillPath, content, "utf-8");
    return skillPath;
  }
}
