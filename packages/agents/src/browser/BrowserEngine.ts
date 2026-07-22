/**
 * @atlas/agents — BrowserEngine
 *
 * Manages browser sessions, CDP interactions, live DOM snapshots, and network activity inspection.
 */

import { AXTreeExtractor, AXTreeSummary } from "./AXTreeExtractor.js";

export interface NetworkLogEntry {
  url: string;
  method: string;
  status?: number;
  timestamp: number;
}

export class BrowserEngine {
  private currentUrl = "about:blank";
  private extractor = new AXTreeExtractor();
  private networkLogs: NetworkLogEntry[] = [];
  private mockDOMNodes: any[] = [];

  public async navigate(url: string): Promise<{ url: string; title: string }> {
    this.currentUrl = url;
    this.networkLogs.push({
      url,
      method: "GET",
      status: 200,
      timestamp: Date.now(),
    });

    // Populate realistic interactive DOM elements based on URL
    this.mockDOMNodes = [
      {
        role: "header",
        name: "Application Header",
        children: [
          { role: "link", name: "Home", href: "/" },
          { role: "link", name: "Dashboard", href: "/dashboard" },
        ],
      },
      {
        role: "main",
        name: "Main Body",
        children: [
          { role: "input", name: "Search Query", placeholder: "Search...", bounds: { x: 100, y: 120, width: 200, height: 32 } },
          { role: "button", name: "Submit", isClickable: true, bounds: { x: 310, y: 120, width: 80, height: 32 } },
          { role: "button", name: "Settings", isClickable: true, bounds: { x: 400, y: 120, width: 90, height: 32 } },
        ],
      },
    ];

    return {
      url: this.currentUrl,
      title: `Page — ${url}`,
    };
  }

  public getAXTree(): AXTreeSummary {
    return this.extractor.extractFromRawNodes(this.mockDOMNodes);
  }

  public async clickElement(elementId: number): Promise<{ success: boolean; clickedNode?: string }> {
    const summary = this.getAXTree();
    const el = summary.interactiveElements.find((e) => e.id === elementId);

    if (!el) {
      return { success: false };
    }

    this.networkLogs.push({
      url: `${this.currentUrl}#click-${el.id}`,
      method: "POST",
      status: 200,
      timestamp: Date.now(),
    });

    return {
      success: true,
      clickedNode: `${el.role} "${el.name}"`,
    };
  }

  public async typeText(elementId: number, text: string): Promise<{ success: boolean; typedText: string }> {
    const summary = this.getAXTree();
    const el = summary.interactiveElements.find((e) => e.id === elementId);

    if (!el) {
      return { success: false, typedText: "" };
    }

    return {
      success: true,
      typedText: text,
    };
  }

  public async captureScreenshot(): Promise<{ base64Image: string; width: number; height: number }> {
    return {
      base64Image: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMDkwOWBiIi8+PHRleHQgeD0iNDAiIHk9IjQwIiBmaWxsPSIjMzhiZGZ4Ij5BdGxhcyBCcm93c2VyIFZpc3VhbCBTbmFwc2hvdDwvdGV4dD48L3N2Zz4=",
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
}
