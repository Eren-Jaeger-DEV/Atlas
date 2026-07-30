/**
 * @atlas/core — ForgeRegistryManager
 *
 * Atlas Forge marketplace registry manager querying forge-index.json
 * and providing open-source extension replacement mappings.
 */

export interface ForgePluginItem {
  id: string;
  name: string;
  publisher: string;
  version: string;
  description: string;
  downloadUrl?: string;
  verified?: boolean;
  downloadCount?: number;
}

export class ForgeRegistryManager {
  private replacementMap: Map<string, string> = new Map([
    ["ms-vscode.cpptools", "llvm-vs-code-extensions.vscode-clangd"],
    ["ms-python.python", "atlas-lang-python"],
    ["github.copilot", "atlas.ai-cascade"],
  ]);

  /**
   * Search Atlas Forge plugin registry via live index URL or fallback index.
   */
  public async searchRegistryAsync(query: string, registryUrl?: string): Promise<ForgePluginItem[]> {
    try {
      const url = registryUrl || "https://raw.githubusercontent.com/Eren-Jaeger-DEV/Atlas/main/forge-index.json";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Atlas Forge HTTP ${res.status}`);
      const data: any = await res.json();
      
      if (Array.isArray(data.plugins)) {
        const filtered = data.plugins.filter(
          (item: any) =>
            !query ||
            item.name.toLowerCase().includes(query.toLowerCase()) ||
            item.id.toLowerCase().includes(query.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(query.toLowerCase()))
        );
        return filtered.map((item: any) => ({
          id: item.id,
          name: item.name,
          publisher: item.publisher || "atlas-community",
          version: item.latestVersion || item.version || "1.0.0",
          description: item.description || "",
          downloadUrl: item.downloadUrl,
          verified: item.verified ?? true,
          downloadCount: item.downloadCount || 100,
        }));
      }
    } catch {
      // Graceful offline fallback
    }

    return this.searchLocalCache(query);
  }

  /**
   * Search local registry cache.
   */
  public searchLocalCache(query: string): ForgePluginItem[] {
    const registry: ForgePluginItem[] = [
      {
        id: "atlas-lang-typescript",
        name: "TypeScript & JavaScript Support",
        publisher: "atlas-core",
        version: "1.0.0",
        description: "Built-in TypeScript and JavaScript IntelliSense and debugging engine.",
        verified: true,
        downloadCount: 15000,
      },
      {
        id: "atlas-lang-python",
        name: "Python Language Support",
        publisher: "atlas-core",
        version: "1.0.0",
        description: "Adds Python IntelliSense and debugging via Pyright and Debugpy.",
        verified: true,
        downloadCount: 12000,
      },
      {
        id: "atlas-viewer-markdown",
        name: "Markdown Preview Viewer",
        publisher: "atlas-core",
        version: "1.0.0",
        description: "Live Markdown rendering preview for .md and .markdown files.",
        verified: true,
        downloadCount: 9500,
      },
    ];

    return registry.filter(
      (plugin) =>
        plugin.name.toLowerCase().includes(query.toLowerCase()) ||
        plugin.id.toLowerCase().includes(query.toLowerCase()) ||
        plugin.description.toLowerCase().includes(query.toLowerCase())
    );
  }

  /**
   * Resolve competitor plugin ID to open-source equivalent.
   */
  public resolveReplacement(competitorPluginId: string): string {
    return this.replacementMap.get(competitorPluginId) || competitorPluginId;
  }
}
