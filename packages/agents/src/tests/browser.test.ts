import { describe, it, expect } from "@jest/globals";
import { AXTreeExtractor } from "../browser/AXTreeExtractor.js";
import { VisionGrounding } from "../browser/VisionGrounding.js";
import { BrowserEngine } from "../browser/BrowserEngine.js";
import { getBrowserToolDefinitions, executeBrowserTool } from "../browser/BrowserTools.js";
import { BrowserSubagent } from "../browser/BrowserSubagent.js";

describe("Autonomous Browser & Dynamic DOM Tool Subsystem (@atlas/agents/browser)", () => {
  it("should extract accessibility nodes and format tree text with unique IDs", () => {
    const extractor = new AXTreeExtractor();
    const rawNodes = [
      {
        role: "main",
        name: "App Body",
        children: [
          { role: "button", name: "Submit Form", isClickable: true, bounds: { x: 10, y: 20, width: 100, height: 40 } },
          { role: "input", name: "Email", value: "user@example.com" },
        ],
      },
    ];

    const summary = extractor.extractFromRawNodes(rawNodes);

    expect(summary.nodes).toHaveLength(1);
    expect(summary.interactiveElements).toHaveLength(2);
    expect(summary.formattedTreeText).toContain("[2] button \"Submit Form\"");
    expect(summary.formattedTreeText).toContain("[3] input \"Email\"");
  });

  it("should format spatial vision grounding prompts and bounding box SVG overlays", () => {
    const markPrompt = VisionGrounding.formatSetOfMarksPrompt([
      { id: 1, label: "Search", box: { x: 100, y: 150, width: 200, height: 32 } },
    ]);

    expect(markPrompt).toContain("[Mark #1] \"Search\" at (100, 150)");

    const svg = VisionGrounding.generateOverlaySvg([
      { id: 1, label: "Search", box: { x: 100, y: 150, width: 200, height: 32 } },
    ]);

    expect(svg).toContain("<svg");
    expect(svg).toContain('x="100"');
  });

  it("should navigate, capture screenshots, and inspect network logs in BrowserEngine", async () => {
    const engine = new BrowserEngine();
    const navResult = await engine.navigate("http://localhost:5173");

    expect(navResult.url).toBe("http://localhost:5173");
    expect(engine.getCurrentUrl()).toBe("http://localhost:5173");

    const clickRes = await engine.clickElement(2); // Button
    expect(clickRes.success).toBe(true);

    const logs = engine.getNetworkLogs();
    expect(logs.length).toBeGreaterThanOrEqual(2);

    const screenshot = await engine.captureScreenshot();
    expect(screenshot.base64Image).toContain("data:image/svg+xml");
  });

  it("should execute dynamic browser tools via JSON schema registry", async () => {
    const engine = new BrowserEngine();
    const tools = getBrowserToolDefinitions();

    expect(tools.map((t) => t.name)).toContain("browser_navigate");
    expect(tools.map((t) => t.name)).toContain("browser_click");

    const navRes = await executeBrowserTool(engine, "browser_navigate", { url: "http://localhost:3000" });
    expect(navRes.url).toBe("http://localhost:3000");

    const clickRes = await executeBrowserTool(engine, "browser_click", { elementId: 2 });
    expect(clickRes.success).toBe(true);
  });

  it("should run autonomous browser subagent task-driven execution loop", async () => {
    const subagent = new BrowserSubagent({ maxIterations: 5 });
    const result = await subagent.runTask("Navigate to app and search for products", "http://localhost:5173");

    expect(result.success).toBe(true);
    expect(result.history.length).toBeGreaterThanOrEqual(2);
    expect(result.axTreeText).toContain("Search Query");
  });
});
