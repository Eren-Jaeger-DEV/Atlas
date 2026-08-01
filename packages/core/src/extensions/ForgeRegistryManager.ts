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
  extensions?: string[];
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
          extensions: item.extensions || [],
        }));
      }
    } catch {
      // Graceful offline fallback
    }

    return this.searchLocalCache(query);
  }

  /**
   * Finds a matching plugin for an unsupported file extension
   */
  public async findPluginForExtension(fileExt: string): Promise<ForgePluginItem | null> {
    const cleanExt = fileExt.startsWith(".") ? fileExt.toLowerCase() : "." + fileExt.toLowerCase();
    const plugins = await this.searchRegistryAsync("");
    const match = plugins.find((p) => p.extensions?.includes(cleanExt));
    return match || null;
  }

  private searchLocalCache(query: string): ForgePluginItem[] {
    const localPlugins: ForgePluginItem[] = [
      {
        id: "atlas-lang-python",
        name: "Atlas Python Support",
        publisher: "Atlas Team",
        version: "1.0.0",
        description: "Official Python language support for Atlas Studio.",
        downloadUrl: "https://raw.githubusercontent.com/Eren-Jaeger-DEV/Atlas/main/packages/plugins/atlas-lang-python/plugin.json",
        extensions: [".py", ".pyw"],
      },
      {
        id: "atlas-lang-typescript",
        name: "Atlas TypeScript/JavaScript Support",
        publisher: "Atlas Team",
        version: "1.0.0",
        description: "Official TypeScript & JavaScript support.",
        downloadUrl: "https://raw.githubusercontent.com/Eren-Jaeger-DEV/Atlas/main/packages/plugins/atlas-lang-typescript/plugin.json",
        extensions: [".ts", ".tsx", ".js", ".jsx"],
      },
      {
        id: "atlas-lang-go",
        name: "Atlas Go Language Support",
        publisher: "Atlas Team",
        version: "1.0.0",
        description: "Official Go language support powered by gopls.",
        downloadUrl: "https://raw.githubusercontent.com/Eren-Jaeger-DEV/Atlas/main/packages/plugins/atlas-lang-go/plugin.json",
        extensions: [".go"],
      },
    ];

    return localPlugins.filter(
      (p) =>
        !query ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.id.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase())
    );
  }

  public getOpenSourceReplacement(vscodeExtensionId: string): string | null {
    return this.replacementMap.get(vscodeExtensionId.toLowerCase()) || null;
  }
}

export const forgeRegistryManager = new ForgeRegistryManager();
