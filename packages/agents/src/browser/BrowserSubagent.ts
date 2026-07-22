/**
 * @atlas/agents — BrowserSubagent
 *
 * Autonomous subagent orchestrator executing task-driven browser iterations,
 * parsing AXTrees, evaluating tool calls, and verifying visual results.
 */

import type { ILLMProvider, LLMMessage } from "@atlas/core";
import { BrowserEngine } from "./BrowserEngine.js";
import { getBrowserToolDefinitions, executeBrowserTool } from "./BrowserTools.js";
import { VisionGrounding } from "./VisionGrounding.js";

export interface BrowserSubagentOptions {
  provider: ILLMProvider;
  maxIterations?: number;
  engine?: BrowserEngine;
}

export interface BrowserSubagentResult {
  success: boolean;
  finalUrl: string;
  history: Array<{ step: number; action: string; result: any }>;
  axTreeText: string;
}

const BROWSER_SYSTEM_PROMPT = `You are a Browser Subagent in Atlas Studio.
Your goal is to autonomously navigate and interact with a web page to accomplish the user's task.
You can use tools to navigate, click, type, and inspect the network.
Before interacting, you will receive an accessibility tree (AXTree) representing the current page state.
Use the element IDs from the AXTree to click or type into elements.

When you have accomplished the goal or if you cannot proceed, respond with a JSON object in this exact format:
{
  "success": true | false,
  "reasoning": "Explain why you are finished or why you failed"
}`;

export class BrowserSubagent {
  private engine: BrowserEngine;
  private provider: ILLMProvider;
  private maxIterations: number;

  constructor(options: BrowserSubagentOptions) {
    this.provider = options.provider;
    this.engine = options.engine ?? new BrowserEngine();
    this.maxIterations = options.maxIterations ?? 10;
  }

  public async runTask(goal: string, targetUrl?: string): Promise<BrowserSubagentResult> {
    const history: BrowserSubagentResult["history"] = [];
    let step = 1;

    if (targetUrl) {
      const navRes = await executeBrowserTool(this.engine, "browser_navigate", { url: targetUrl });
      history.push({ step: step++, action: `browser_navigate(${targetUrl})`, result: navRes });
    }

    const messages: LLMMessage[] = [
      { role: "system", content: BROWSER_SYSTEM_PROMPT },
      { role: "user", content: `Goal: ${goal}` },
    ];

    const tools = getBrowserToolDefinitions();

    while (step <= this.maxIterations) {
      const axSummary = await this.engine.getAXTree();
      
      // Provide current state to the model
      messages.push({
        role: "user",
        content: `Current URL: ${this.engine.getCurrentUrl()}
Accessibility Tree:
${axSummary.formattedTreeText}

What is your next action? (Call a tool, or output JSON to finish)`
      });

      const response = await this.provider.complete({
        messages,
        tools,
        toolChoice: "auto",
        temperature: 0.1,
      });

      if (response.toolCalls.length > 0) {
        messages.push({
          role: "assistant",
          content: response.content,
          toolCalls: response.toolCalls,
        });

        for (const tc of response.toolCalls) {
          try {
            const result = await executeBrowserTool(this.engine, tc.name, tc.arguments);
            history.push({ step: step++, action: `${tc.name}(${JSON.stringify(tc.arguments)})`, result });
            messages.push({
              role: "tool",
              content: JSON.stringify(result, null, 2),
              toolCallId: tc.id,
            });
          } catch (e: any) {
            messages.push({
              role: "tool",
              content: `Error: ${e.message}`,
              toolCallId: tc.id,
            });
          }
        }
        continue;
      }

      // If no tool calls, check for JSON completion
      try {
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            success: parsed.success,
            finalUrl: this.engine.getCurrentUrl(),
            history,
            axTreeText: (await this.engine.getAXTree()).formattedTreeText,
          };
        }
      } catch (e) {
        // Fallthrough
      }
      
      messages.push({
        role: "assistant",
        content: response.content,
      });
      break;
    }

    return {
      success: false,
      finalUrl: this.engine.getCurrentUrl(),
      history,
      axTreeText: (await this.engine.getAXTree()).formattedTreeText,
    };
  }

  public getEngine(): BrowserEngine {
    return this.engine;
  }
}
