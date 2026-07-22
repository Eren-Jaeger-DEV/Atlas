/**
 * @atlas/agents — BrowserEngine
 *
 * Manages browser sessions, CDP interactions, live DOM snapshots, and network activity inspection using Playwright.
 */

import { chromium, Browser, Page } from "playwright";
import { AXTreeSummary } from "./AXTreeExtractor.js";

export interface NetworkLogEntry {
  url: string;
  method: string;
  status?: number;
  timestamp: number;
}

export class BrowserEngine {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private currentUrl = "about:blank";
  private networkLogs: NetworkLogEntry[] = [];

  private async ensureBrowser() {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
      this.page = await this.browser.newPage();
      
      this.page.on('response', response => {
        this.networkLogs.push({
          url: response.url(),
          method: response.request().method(),
          status: response.status(),
          timestamp: Date.now(),
        });
      });
    }
  }

  public async navigate(url: string): Promise<{ url: string; title: string }> {
    await this.ensureBrowser();
    this.currentUrl = url;
    
    await this.page!.goto(url, { waitUntil: 'networkidle' });
    const title = await this.page!.title();

    return {
      url: this.currentUrl,
      title: `Page — ${title}`,
    };
  }

  public async getAXTree(): Promise<AXTreeSummary> {
    if (!this.page) return { formattedTreeText: "No page loaded.", interactiveElements: [], nodes: [] };
    
    let snapshot: any = null;
    try {
      const client = await this.page.context().newCDPSession(this.page);
      const { nodes } = await client.send('Accessibility.getFullAXTree');
      // For simplicity, just use the raw nodes as the snapshot for our traverse function
      // In a real implementation we would parse the CDP nodes properly
      snapshot = nodes.length > 0 ? nodes[0] : null;
    } catch (e) {
      console.error("CDP Error", e);
    }
    
    if (!snapshot) return { formattedTreeText: "No accessibility tree available.", interactiveElements: [], nodes: [] };

    // Flatten the accessibility tree into our expected format
    const interactiveElements: any[] = [];
    let idCounter = 1;

    const traverse = (node: any, depth = 0): string => {
      let indent = "  ".repeat(depth);
      let text = `${indent}[${node.role}] ${node.name || ""}`;
      
      const isInteractive = ["link", "button", "textbox", "searchbox", "combobox"].includes(node.role);
      if (isInteractive) {
        const elId = idCounter++;
        text += ` (ID: ${elId})`;
        interactiveElements.push({
          id: elId,
          role: node.role,
          name: node.name || "",
        });
      }

      text += "\n";
      
      if (node.children) {
        for (const child of node.children) {
          text += traverse(child, depth + 1);
        }
      }
      
      return text;
    };

    const formattedTreeText = traverse(snapshot);

    return {
      formattedTreeText,
      interactiveElements,
      nodes: [] // Adding missing nodes property
    };
  }

  public async clickElement(elementId: number): Promise<{ success: boolean; clickedNode?: string }> {
    if (!this.page) return { success: false };
    
    const summary = await this.getAXTree();
    const el = summary.interactiveElements.find((e) => e.id === elementId);

    if (!el) {
      return { success: false };
    }

    // Playwright doesn't easily let us click by our custom ID, so we use role and name
    try {
      await this.page.getByRole(el.role as Parameters<Page["getByRole"]>[0], { name: el.name, exact: true }).first().click();
      return {
        success: true,
        clickedNode: `${el.role} "${el.name}"`,
      };
    } catch (e) {
      return { success: false };
    }
  }

  public async typeText(elementId: number, text: string): Promise<{ success: boolean; typedText: string }> {
    if (!this.page) return { success: false, typedText: "" };

    const summary = await this.getAXTree();
    const el = summary.interactiveElements.find((e) => e.id === elementId);

    if (!el) {
      return { success: false, typedText: "" };
    }

    try {
      await this.page.getByRole(el.role as Parameters<Page["getByRole"]>[0], { name: el.name, exact: true }).first().fill(text);
      return {
        success: true,
        typedText: text,
      };
    } catch (e) {
      return { success: false, typedText: "" };
    }
  }

  public async captureScreenshot(): Promise<{ base64Image: string; width: number; height: number }> {
    if (!this.page) {
      return {
        base64Image: "",
        width: 1280,
        height: 800,
      };
    }
    
    const buffer = await this.page.screenshot({ type: "jpeg", quality: 50 });
    return {
      base64Image: `data:image/jpeg;base64,${buffer.toString("base64")}`,
      width: 1280,
      height: 800,
    };
  }

  public getNetworkLogs(): NetworkLogEntry[] {
    return [...this.networkLogs];
  }

  public getCurrentUrl(): string {
    return this.currentUrl;
  }
  
  public async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}
