/**
 * @atlas/agents — BrowserTools
 *
 * Exposes JSON-schema tool definitions and handlers for AI agent dynamic tool selection.
 */

import { BrowserEngine } from "./BrowserEngine.js";

export interface AgentToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export function getBrowserToolDefinitions(): AgentToolDefinition[] {
  return [
    {
      name: "browser_navigate",
      description: "Navigates the browser to a specified URL and loads its DOM.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Target URL (e.g. http://localhost:5173)" },
        },
        required: ["url"],
      },
    },
    {
      name: "browser_click",
      description: "Clicks an interactive element on the active page by its integer elementId.",
      parameters: {
        type: "object",
        properties: {
          elementId: { type: "integer", description: "The accessibility node element ID from the AX tree summary" },
        },
        required: ["elementId"],
      },
    },
    {
      name: "browser_type",
      description: "Types input text into a targeted form or text field element.",
      parameters: {
        type: "object",
        properties: {
          elementId: { type: "integer", description: "The accessibility node element ID" },
          text: { type: "string", description: "Text content to type" },
        },
        required: ["elementId", "text"],
      },
    },
    {
      name: "browser_screenshot",
      description: "Captures a full viewport visual screenshot of the current browser page.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "browser_inspect_network",
      description: "Retrieves recent network requests and API responses executed by the browser.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  ];
}

export async function executeBrowserTool(
  engine: BrowserEngine,
  toolName: string,
  args: any
): Promise<any> {
  switch (toolName) {
    case "browser_navigate":
      return await engine.navigate(args.url);
    case "browser_click":
      return await engine.clickElement(args.elementId);
    case "browser_type":
      return await engine.typeText(args.elementId, args.text);
    case "browser_screenshot":
      return await engine.captureScreenshot();
    case "browser_inspect_network":
      return engine.getNetworkLogs();
    default:
      throw new Error(`Unknown browser tool: ${toolName}`);
  }
}
