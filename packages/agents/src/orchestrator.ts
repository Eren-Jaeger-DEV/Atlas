/**
 * @atlas/agents — Orchestrator
 *
 * The state machine sequencing Planner → Coder → Tester → Reviewer.
 * Intentionally simple and legible — a 4-node state machine you can debug.
 *
 * Spec principle: "A 4-node state machine you can debug beats an 11-agent
 * mesh you can't."
 *
 * State transitions:
 *   IDLE → PLANNING (goal received)
 *   PLANNING → CODING (plan ready)
 *   CODING → TESTING (coder output ready)
 *   TESTING → CODING (tests failed, retry)
 *   TESTING → REVIEWING (tests passed)
 *   REVIEWING → AWAITING_HUMAN (reviewer flags high risk)
 *   REVIEWING → DONE (reviewer approves)
 *   AWAITING_HUMAN → DONE (human approves)
 *   * → ERROR (any unrecoverable failure)
 */

import { sha256 } from "js-sha256";
import type {
  ILLMProvider,
  Plan,
  CoderOutput,
  TestResult,
  ReviewResult,
  RunRecord,
  OrchestratorEvent,
  AgentState,
} from "@atlas/core";
import type { MemoryEngine } from "@atlas/graph";
import { runPlanner } from "./planner.js";
import { runCoder } from "./coder.js";
import { runTester } from "./tester.js";
import { runReviewer } from "./reviewer.js";
import { ContextEngine, ContextOptions } from "./context/ContextEngine.js";
import { TaskDAG } from "./dag/TaskDAG.js";
import { verifyAST, verifyTerminalSandbox, verifyVision, VerificationResult } from "./verification/index.js";
import { TaskNode } from "@atlas/core";
import { BrainManager } from "./brain.js";
import { readFileTool, listDirectoryTool, writeFileTool, multiReplaceFileContentTool, FS_TOOL_DEFINITIONS } from "./tools/fs-tools.js";
import { BASH_TOOL_DEFINITIONS, runCommandTool } from "./tools/bash-tools.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface OrchestratorConfig {
  provider: ILLMProvider;
  memory: MemoryEngine;
  repoRoot: string;
  /** Max times the Coder retries after test failure before giving up */
  maxCoderRetries?: number;
  /** Event handler for streaming progress to CLI / editor */
  onEvent: (event: OrchestratorEvent) => void;
  /** Async permission check */
  checkPermission?: (permission: string, data: any) => Promise<boolean>;
  /** Whether to run in planning mode (generate plan and halt) */
  planningMode?: boolean;
  /** Callback to wait for human approval of a plan */
  waitForPlanApproval?: (plan: any) => Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export class Orchestrator {
  private config: OrchestratorConfig;
  private maxCoderRetries: number;
  private brain: BrainManager;
  private currentRunId: string = "run-active";

  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.maxCoderRetries = config.maxCoderRetries ?? 3;
    this.brain = new BrainManager(config.repoRoot);
  }

  private emit(event: OrchestratorEvent) {
    this.brain.appendTranscript(event);
    this.config.onEvent(event);
  }

  private progress(message: string) {
    process.stdout.write(message + "\n");
    this.emit({
      type: "step_start",
      runId: this.currentRunId,
      step: {
        id: sha256(`step:${message}:${Date.now()}`).slice(0, 16),
        title: message,
        description: "",
        relevantFiles: [],
        reasoning: "",
        order: 0
      }
    });
  }

  /**
   * Executes a dynamic DAG of tasks asynchronously.
   */
  private async executeDAG(
    dag: TaskDAG,
    runId: string,
    commonOpts: any,
    outputs: { coderOutputs: CoderOutput[], testResults: TestResult[] }
  ): Promise<void> {
    while (!dag.isComplete() && !dag.hasFailedTasks()) {
      const readyTasks = dag.getReadyTasks();
      
      if (readyTasks.length === 0) {
        // If nothing is ready but not complete, we have a circular dependency or stall
        break;
      }

      // Execute ready tasks in parallel (for Phase 1, we await them sequentially or with Promise.all)
      await Promise.all(readyTasks.map(async (task) => {
        try {
          dag.updateTaskStatus(task.id, "RUNNING");
          this.emit({ type: "dag_update", nodes: dag.getAllTasks(), runId });
          
          if (task.type === "CODE") {
            this.emit({ type: "state_change", state: "CODING", runId });
            if (task.data?.step) {
              this.emit({ type: "step_start", step: { ...task.data.step, title: `[CODER] ${task.data.step.title}` }, runId });
            }
            this.config.memory.logTaskEvent(runId, task.id, "start", { type: "CODE" });
            const coderOutput = await runCoder(task.data.step, commonOpts);
            outputs.coderOutputs.push(coderOutput);

            this.emit({ type: "coder_output", output: coderOutput, runId });

            this.config.memory.recordDecision({
              id: sha256(`coder:${task.id}`).slice(0, 24),
              title: `Coder output for task: ${task.id}`,
              description: `Modified ${coderOutput.modifiedFiles.length} files.`,
              rationale: coderOutput.reasoning
            });

            dag.updateTaskStatus(task.id, "COMPLETED", coderOutput);
            this.emit({ type: "dag_update", nodes: dag.getAllTasks(), runId });
            this.config.memory.logTaskEvent(runId, task.id, "complete", { success: true });
          }
          
          else if (task.type === "TEST") {
            this.emit({ type: "state_change", state: "TESTING", runId });
            this.emit({ type: "step_start", step: { id: task.id, title: `[TESTER] Executing test suite for ${task.data?.step?.title || "workspace"}`, description: "", relevantFiles: [], reasoning: "", order: 0 }, runId });
            this.config.memory.logTaskEvent(runId, task.id, "start", { type: "TEST" });
            const testResult = await runTester(task.data.step, {
              repoRoot: this.config.repoRoot,
              onProgress: (msg: string) => this.progress(msg)
            });
            outputs.testResults.push(testResult);
            
            if (testResult.status === "passed") {
               dag.updateTaskStatus(task.id, "COMPLETED", testResult);
               this.emit({ type: "dag_update", nodes: dag.getAllTasks(), runId });
               this.config.memory.logTaskEvent(runId, task.id, "complete", { success: true });
            } else {
               // Mark failed (will halt DAG)
               dag.updateTaskStatus(task.id, "FAILED", testResult, "Tests failed");
               this.emit({ type: "dag_update", nodes: dag.getAllTasks(), runId });
               this.config.memory.logTaskEvent(runId, task.id, "failed", { reason: "Tests failed" });
            }
          }
          
          else if (task.type === "VERIFY") {
            this.emit({ type: "state_change", state: "VERIFYING", runId });
            this.emit({ type: "step_start", step: { id: task.id, title: `[REVIEWER] Auditing AST, terminal, and security surfaces`, description: "", relevantFiles: [], reasoning: "", order: 0 }, runId });
            this.config.memory.logTaskEvent(runId, task.id, "start", { type: "VERIFY" });
            
            // Run all 3 surfaces in parallel
            const [astRes, termRes, visRes] = await Promise.all([
              verifyAST(this.config.repoRoot),
              verifyTerminalSandbox(this.config.repoRoot), // Can customize test cmd if needed
              verifyVision(this.config.repoRoot)
            ]);
            
            const passed = astRes.passed && termRes.passed && visRes.passed;
            const results = { ast: astRes, terminal: termRes, vision: visRes };
            
            dag.updateTaskStatus(task.id, "COMPLETED", results);
            this.emit({ type: "dag_update", nodes: dag.getAllTasks(), runId });
            this.config.memory.logTaskEvent(runId, task.id, "complete", { success: passed, results });
          }
          
          // Additional task types (PLAN, REVIEW) can be added here
          
        } catch (err) {
          dag.updateTaskStatus(task.id, "FAILED", null, String(err));
          this.emit({ type: "dag_update", nodes: dag.getAllTasks(), runId });
        }
      }));
    }
  }

  async run(input: string | { role: string; text: string }[], context?: Omit<ContextOptions, "maxTokens">): Promise<RunRecord> {
    const isChatMode = Array.isArray(input);
    const messages = isChatMode ? input as { role: string; text: string }[] : [];
    const goal = isChatMode && messages.length > 0 ? (messages[messages.length - 1]?.text || "") : (input as string);
    const runId = sha256(`run:${goal}:${Date.now()}`).slice(0, 24);
    this.currentRunId = runId;
    const startedAt = Date.now();

    const coderOutputs: CoderOutput[] = [];
    const testResults: TestResult[] = [];
    let plan: Plan | undefined;
    let reviewResult: ReviewResult | undefined;
    let finalState: AgentState = "ERROR";

    const commonOpts = {
      provider: this.config.provider,
      memory: this.config.memory,
      repoRoot: this.config.repoRoot,
      onProgress: (msg: string) => this.progress(msg),
      onCheckPermission: this.config.checkPermission,
    };

    try {
      // ─── PLANNING ───────────────────────────────────────────────────────
      this.emit({ type: "state_change", state: "PLANNING", runId });

      const ctx = ContextEngine.assembleContext({ 
        maxTokens: 4000,
        activeFilePath: context?.activeFilePath || "<Not Provided>",
        activeContent: context?.activeContent || "<Not Provided>",
        openTabs: context?.openTabs || [],
        cursorLine: context?.cursorLine,
        cursorSymbol: context?.cursorSymbol,
        gitStatusSummary: context?.gitStatusSummary || "Unknown",
        terminalHistory: context?.terminalHistory,
        diagnostics: context?.diagnostics
      });

      const allSkills = this.brain.getSkills();
      let skillsContext = "";
      if (allSkills.length > 0) {
        try {
          const skillListStr = allSkills.map(s => `- ${s.name}: ${s.content.substring(0, 100)}...`).join("\n");
          const skillSelMsg = { role: "user" as const, content: `Given the user goal:\n"${goal}"\n\nWhich of the following skills are relevant? Return a JSON array of exact skill names. If none, return [].\n\n${skillListStr}` };
          const selRes = await this.config.provider.complete({
            messages: [skillSelMsg],
            temperature: 0.1
          });
          const match = selRes.content.match(/\[.*?\]/s);
          if (match) {
            const selectedNames = JSON.parse(match[0]);
            const selectedSkills = allSkills.filter(s => selectedNames.includes(s.name));
            if (selectedSkills.length > 0) {
              skillsContext = `\n[Specialized Skills Available]\n${selectedSkills.map(s => `Skill: ${s.name}\n${s.content}`).join("\n\n")}`;
            }
          }
        } catch (e) {
          skillsContext = `\n[Specialized Skills Available]\n${allSkills.map(s => `Skill: ${s.name}\n${s.content}`).join("\n\n")}`;
        }
      }

      const rules = this.brain.getRules();
      const rulesContext = rules.length > 0
        ? `\n[Workspace Project Rules]\n${rules.map(r => `Rule (${r.name}):\n${r.content}`).join("\n\n")}\n`
        : "";

      // Quick intent classifier for chat
      if (isChatMode) {
        const lastMsg = goal.toLowerCase().trim();
        const isGreeting = /^(hi|hey|hello|yo|howdy|greetings|good\s*(morning|afternoon|evening|day))[\s!.]*$/i.test(lastMsg);
        const isLikelyTask = !isGreeting && /\b(add|create|make|generate|build|scaffold|setup|install|update|refactor|fix|change|remove|delete|implement|write|test|debug|run|review|audit|inspect|check|analyze|overview|bot|app|script|project|file|dir|folder|code)\b/i.test(lastMsg);
        
        if (!isLikelyTask) {
          const developerProfile = this.config.memory.getDeveloperProfile?.("default");
          const profileContext = developerProfile ? `\n[Developer Profile Preferences]\n${developerProfile}\n` : "";
          
          const chatContext = `You are an autonomous AI coding agent in Atlas Studio operating directly inside the user's active workspace directory.
Context:
${ctx.promptContext}${skillsContext}${rulesContext}${profileContext}

CRITICAL DIRECTIVE FOR FILE & SYSTEM MODIFICATIONS:
When the user asks to create, make, build, install, or modify files, scripts, bots, or apps, DO NOT just return markdown code blocks for manual copy-pasting. You MUST autonomously invoke tool calls:
- Use 'write_file' or 'multi_replace_file_content' to write files directly to disk in the workspace folder.
- Use 'run_command' to run shell setup commands (e.g. npm init, npm install, etc.).
- Always check files using 'read_file' or 'list_directory' first before modifying.`;
          
          let semanticChatMsgs: any[] = [];
          if (this.config.memory.vectorSearchChat) {
             const semanticNodes = await this.config.memory.vectorSearchChat(goal, 5);
             semanticNodes.forEach((n: any) => { semanticChatMsgs.push({ role: "system", content: `[Past Chat Memory - Session ${n.sessionId}] ${n.role}: ${n.content}` }) });
          }

          const pastChatNodes = this.config.memory.getChatNodes?.(this.brain.getSessionId()) || [];
          const pastChatMsgs = pastChatNodes.slice(-10).map((n: any) => ({ role: n.role, content: n.content }));
          
          const chatMsgs = (input as { role: string; text: string }[]).map(m => ({
            role: (m.role === "agent" ? "assistant" : m.role) as "user"|"assistant"|"system",
            content: m.text
          }));
          const systemMsg = { role: "system" as const, content: chatContext };
          
          const updateDevProfileTool = {
            name: "update_developer_profile",
            description: "Updates the developer's profile preferences based on what they say they like or dislike (e.g. style, habits).",
            parameters: {
              type: "object",
              properties: {
                preferences: { type: "string", description: "The updated full text of developer preferences." }
              },
              required: ["preferences"]
            }
          };

          const chatTools = [updateDevProfileTool, ...FS_TOOL_DEFINITIONS, ...BASH_TOOL_DEFINITIONS];

          let allMessages = [systemMsg, ...semanticChatMsgs, ...pastChatMsgs, ...chatMsgs];

          // Stream the chat response so token events flow to the sidebar in real-time
          let chatRes = await this.config.provider.stream(
            { messages: allMessages, temperature: 0.7, tools: chatTools },
            (chunk: string) => { if (chunk) this.emit({ type: "token", content: chunk, runId }); }
          );

          // Handle any tool calls returned (e.g. update_developer_profile, write_file, multi_replace_file_content, run_command, read_file, list_directory)
          while (chatRes.toolCalls && chatRes.toolCalls.length > 0) {
             const tc = chatRes.toolCalls[0];
             if (!tc) break;
             allMessages.push({ role: "assistant", content: chatRes.content || "", toolCalls: [tc] });

             if (tc.name === "update_developer_profile") {
                const prefs = tc.arguments?.preferences as string || "";
                this.emit({ type: "step_start", step: { id: tc.id, title: "Updated developer profile", description: "", relevantFiles: [], reasoning: "", order: 0 }, runId });
                if (this.config.memory.upsertDeveloperProfile) {
                   this.config.memory.upsertDeveloperProfile("default", prefs);
                }
                allMessages.push({ role: "tool", content: "Profile updated successfully.", toolCallId: tc.id });
             } else if (tc.name === "write_file") {
                const filePath = String(tc.arguments?.file_path || "");
                const content = String(tc.arguments?.content || "");
                const fileName = filePath.split("/").pop() || filePath;
                this.emit({ type: "step_start", step: { id: tc.id, title: `Edited ${fileName}`, description: "", relevantFiles: [filePath], reasoning: "", order: 0 }, runId });
                const res = await writeFileTool(filePath, content, this.config.repoRoot);
                allMessages.push({ role: "tool", content: res, toolCallId: tc.id });
             } else if (tc.name === "multi_replace_file_content") {
                const filePath = String(tc.arguments?.file_path || "");
                const replacements = (tc.arguments?.replacements as any[]) || [];
                const fileName = filePath.split("/").pop() || filePath;
                this.emit({ type: "step_start", step: { id: tc.id, title: `Edited ${fileName}`, description: "", relevantFiles: [filePath], reasoning: "", order: 0 }, runId });
                const res = await multiReplaceFileContentTool(filePath, replacements, this.config.repoRoot);
                allMessages.push({ role: "tool", content: res, toolCallId: tc.id });
             } else if (tc.name === "run_command") {
                const command = String(tc.arguments?.command || "");
                this.emit({ type: "step_start", step: { id: tc.id, title: `Ran ${command}`, description: "", relevantFiles: [], reasoning: "", order: 0 }, runId });
                const res = await runCommandTool(command, ".", this.config.repoRoot, this.config.checkPermission, undefined, (chunk: string) => {
                  if (chunk) this.emit({ type: "token", content: `\nTerminalOutput: ${chunk}`, runId });
                });
                allMessages.push({ role: "tool", content: res, toolCallId: tc.id });
             } else if (tc.name === "read_file") {
                const filePath = String(tc.arguments?.file_path || "");
                const fileName = filePath.split("/").pop() || filePath;
                this.emit({ type: "step_start", step: { id: tc.id, title: `Analyzed ${fileName} #L1-100`, description: "", relevantFiles: [filePath], reasoning: "", order: 0 }, runId });
                const content = await readFileTool(filePath, this.config.repoRoot);
                allMessages.push({ role: "tool", content: content.slice(0, 12000), toolCallId: tc.id });
             } else if (tc.name === "list_directory") {
                const dirPath = String(tc.arguments?.dir_path || ".");
                this.emit({ type: "step_start", step: { id: tc.id, title: `Explored directory: ${dirPath}`, description: "", relevantFiles: [], reasoning: "", order: 0 }, runId });
                const content = await listDirectoryTool(dirPath, this.config.repoRoot);
                allMessages.push({ role: "tool", content, toolCallId: tc.id });
             } else {
                allMessages.push({ role: "tool", content: "Unknown tool", toolCallId: tc.id });
             }

             chatRes = await this.config.provider.stream(
               { messages: allMessages, temperature: 0.7, tools: chatTools },
               (chunk: string) => { if (chunk) this.emit({ type: "token", content: chunk, runId }); }
             );
          }

          // Save to memory
          if (this.config.memory.logChatNode) {
             const sessionId = this.brain.getSessionId();
             this.config.memory.logChatNode({ id: `${runId}-user`, sessionId, role: "user", content: goal, createdAt: Date.now() });
             this.config.memory.logChatNode({ id: `${runId}-agent`, sessionId, role: "assistant", content: chatRes.content, createdAt: Date.now() + 1 });
          }
          
          return {
            id: runId,
            goal: "chat",
            finalState: "DONE",
            startedAt,
            completedAt: Date.now(),
            plan: { id: "plan-" + runId, goal: "chat", createdAt: Date.now(), steps: [], planningReasoning: chatRes.content },
            coderOutputs: [],
            testResults: []
          } as RunRecord;
        }
      }

      const bugPatterns = this.config.memory.getBugPatterns?.() || [];
      const bugContext = bugPatterns.length > 0 
        ? `\n[Known Bug Patterns to Avoid]\n${bugPatterns.map(bp => `- Error: ${bp.errorSignature}\n  Solution: ${bp.solution}`).join("\n")}`
        : "";

      const developerProfile = this.config.memory.getDeveloperProfile?.("default");
      const profileContext = developerProfile ? `\n[Developer Profile Preferences]\n${developerProfile}\n` : "";

      const enrichedGoal = `[System Context]\n${ctx.promptContext}${bugContext}${skillsContext}${profileContext}\n\nUser Goal: ${goal}`;

      plan = await runPlanner(enrichedGoal, commonOpts);
      this.emit({ type: "plan_ready", plan, runId });

      this.config.memory.recordDecision({
        id: sha256(`plan:${runId}`).slice(0, 24),
        title: `Plan generated for: ${goal.substring(0, 50)}...`,
        description: `Generated ${plan.steps.length} steps.`,
        rationale: plan.planningReasoning
      });

      if (this.config.planningMode) {
        // Write implementation_plan.md artifact
        let mdPlan = `# Implementation Plan\n\n**Goal**: ${goal}\n\n## Rationale\n${plan.planningReasoning}\n\n## Proposed Changes\n`;
        plan.steps.forEach(step => {
          mdPlan += `### ${step.order + 1}. ${step.title}\n${step.description}\n\n`;
        });
        await this.brain.writeArtifact("implementation_plan.md", mdPlan);

        // Write task.md artifact
        let mdTask = `# Task Checklist\n\n**Goal**: ${goal}\n\n`;
        plan.steps.forEach(step => {
          mdTask += `- [ ] **${step.title}**: ${step.description}\n`;
        });
        await this.brain.writeArtifact("task.md", mdTask);

        this.emit({ type: "awaiting_human", reason: "Plan generated in artifacts. Waiting for approval.", runId });
        
        if (this.config.waitForPlanApproval) {
          const approved = await this.config.waitForPlanApproval(plan);
          if (!approved) {
            return {
              id: runId,
              goal,
              plan,
              coderOutputs,
              testResults,
              finalState: "CANCELLED",
              startedAt,
              completedAt: Date.now(),
            };
          }
          this.emit({ type: "state_change", state: "APPROVED", runId });
        } else {
          return {
            id: runId,
            goal,
            plan,
            coderOutputs,
            testResults,
            finalState: "AWAITING_HUMAN",
            startedAt,
            completedAt: Date.now(),
          };
        }
      }

      // ─── CODING + TESTING (per step) via Dynamic DAG ────────────────────
      const dag = new TaskDAG();
      
      // Initialize DAG with plan steps
      for (const step of plan.steps) {
        const codeTaskId = `CODE-${step.id}`;
        const verifyTaskId = `VERIFY-${step.id}`;
        const testTaskId = `TEST-${step.id}`;
        
        dag.addTask({
          id: codeTaskId,
          type: "CODE",
          status: "PENDING",
          dependencies: [], // We can chain them if needed, for now parallel/independent
          data: { step }
        });
        
        dag.addTask({
          id: testTaskId,
          type: "TEST",
          status: "PENDING",
          dependencies: [codeTaskId], // Test runs after Code
          data: { step }
        });

        dag.addTask({
          id: verifyTaskId,
          type: "VERIFY",
          status: "PENDING",
          dependencies: [testTaskId], // Verify runs after Test
          data: { step }
        });
      }
      this.emit({ type: "dag_update", nodes: dag.getAllTasks(), runId });

      // Execute DAG initial pass
      await this.executeDAG(dag, runId, commonOpts, { coderOutputs, testResults });

      let coderRetries = 0;
      const maxRetries = this.config.maxCoderRetries ?? 0;

      while (dag.hasFailedTasks() && coderRetries < maxRetries) {
        coderRetries++;
        this.progress(`[RETRY] DAG execution failed. Retrying Coder attempt ${coderRetries}/${maxRetries}...`);
        
        for (const task of dag.getAllTasks()) {
          task.status = "PENDING";
        }

        await this.executeDAG(dag, runId, commonOpts, { coderOutputs, testResults });
      }

      if (dag.hasFailedTasks()) {
         this.progress(`[FAIL] DAG execution failed tasks — proceeding to review`);
      }

      // ─── REVIEWING ──────────────────────────────────────────────────────
      this.emit({ type: "state_change", state: "REVIEWING", runId });

      const lastStep = plan.steps.at(-1);
      const lastCoderOutput = coderOutputs.at(-1);

      if (lastStep && lastCoderOutput) {
        reviewResult = await runReviewer(lastStep, lastCoderOutput, commonOpts);
        this.emit({ type: "review_result", result: reviewResult, runId });

        this.config.memory.recordDecision({
          id: sha256(`review:${runId}`).slice(0, 24),
          title: `Review for run ${runId}`,
          description: `Reviewer flagged ${reviewResult.overallRisk} risk.`,
          rationale: reviewResult.summary
        });

        if (reviewResult.requiresHumanReview) {
          this.emit({
            type: "awaiting_human",
            reason: `Reviewer flagged ${reviewResult.overallRisk} risk: ${reviewResult.summary.slice(0, 200)}`,
            runId,
          });
          this.emit({ type: "state_change", state: "AWAITING_HUMAN", runId });
          finalState = "AWAITING_HUMAN";
        } else {
          finalState = "DONE";
        }
      } else {
        finalState = "DONE";
      }

      // If no code changes were made (e.g., code review or codebase analysis task), stream a rich response synthesis
      if (plan && plan.planningReasoning && coderOutputs.length === 0 && finalState === "DONE") {
        try {
          const synthesisPrompt = `You are Atlas AI. The user asked: "${goal}".\n\nBased on your analysis of their codebase, provide a comprehensive, clear, and beautifully formatted report/response for the user:\n\nAnalysis:\n${plan.planningReasoning}\n\nKey Breakdown:\n${plan.steps.map(s => `### ${s.title}\n${s.description}`).join("\n\n")}`;
          await this.config.provider.stream(
            { messages: [{ role: "user", content: synthesisPrompt }], temperature: 0.5 },
            (chunk: string) => { if (chunk) this.emit({ type: "token", content: chunk, runId }); }
          );
        } catch (e) {
          // Fallback if synthesis streaming fails
        }
      // Write walkthrough.md artifact
      try {
        let mdWalkthrough = `# Walkthrough - ${goal}\n\n## Goal\n${goal}\n\n## Execution Summary\n- **Status**: ${finalState}\n- **Plan Steps**: ${plan?.steps.length ?? 0}\n- **Files Modified**: ${coderOutputs.reduce((acc, c) => acc + (c.modifiedFiles?.length || 0), 0)}\n\n`;

        if (coderOutputs.length > 0) {
          mdWalkthrough += `## Changes Made\n\n`;
          coderOutputs.forEach((co, idx) => {
            mdWalkthrough += `### Step ${idx + 1}\n**Rationale**: ${co.reasoning || "Executed code edits"}\n\n**Modified Files**:\n${(co.modifiedFiles || []).map(f => `- \`${f}\``).join("\n")}\n\n`;
          });
        }

        if (testResults.length > 0) {
          mdWalkthrough += `## Verification Results\n\n`;
          testResults.forEach(tr => {
            mdWalkthrough += `- **Status**: ${tr.status} (${tr.passed}/${tr.total} passed)\n`;
          });
        }

        await this.brain.writeArtifact("walkthrough.md", mdWalkthrough);
      } catch (e) {
        // Artifact creation fallback
      }
    } } catch (err) {
      finalState = "ERROR";
      this.emit({
        type: "error",
        message: err instanceof Error ? err.message : String(err),
        runId,
      });
    }

    const record: RunRecord = {
      id: runId,
      goal,
      plan: plan!,
      coderOutputs,
      testResults,
      reviewResult,
      finalState,
      startedAt,
      completedAt: Date.now(),
    };

    // Persist run to memory graph (AI Timeline)
    this.config.memory.saveRun(record as unknown as Record<string, unknown>);

    this.emit({ type: "state_change", state: finalState, runId });
    if (finalState === "DONE" || finalState === "AWAITING_HUMAN") {
      this.emit({ type: "done", record, runId });
    }

    return record;
  }
}
