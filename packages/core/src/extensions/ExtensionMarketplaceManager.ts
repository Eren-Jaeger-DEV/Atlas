/**
 * @atlas/core — ExtensionMarketplaceManager
 *
 * Open VSX registry query manager and extension replacement engine matching Cursor (Chapter 3 & 8)
 * and Antigravity (Chapter 11).
 * Queries live Open VSX API endpoints and maps proprietary competitor extensions to open-source community equivalents.
 */

export interface MarketplaceExtension {
  id: string;
  name: string;
  publisher: string;
  version: string;
  description: string;
  downloadCount: number;
}

export class ExtensionMarketplaceManager {
  private replacementMap: Map<string, string> = new Map([
    ["ms-vscode.cpptools", "llvm-vs-code-extensions.vscode-clangd"],
    ["ms-python.python", "ms-python.python"],
    ["github.copilot", "atlas.ai-cascade"],
  ]);

  /**
   * Search Open VSX extension registry via live API request.
   */
  public async searchMarketplaceAsync(query: string): Promise<MarketplaceExtension[]> {
    try {
      const url = `https://open-vsx.org/api/-/search?q=${encodeURIComponent(query)}&size=10`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Open VSX HTTP ${res.status}`);
      const data: any = await res.json();
      
      if (Array.isArray(data.extensions)) {
        return data.extensions.map((item: any) => ({
          id: `${item.namespace}.${item.name}`,
          name: item.name,
          publisher: item.namespace,
          version: item.version || "1.0.0",
          description: item.description || "",
          downloadCount: item.downloadCount || 0,
        }));
      }
    } catch {
      // Graceful offline fallback
    }

    return this.searchMarketplace(query);
  }

  /**
   * Search local registry cache.
   */
  public searchMarketplace(query: string): MarketplaceExtension[] {
    const registry: MarketplaceExtension[] = [
      {
        id: "llvm-vs-code-extensions.vscode-clangd",
        name: "clangd",
        publisher: "llvm-vs-code-extensions",
        version: "0.1.28",
        description: "C/C++ completion, navigation, and refactoring using clangd.",
        downloadCount: 4500000,
      },
      {
        id: "golang.go",
        name: "Go",
        publisher: "golang",
        version: "0.41.0",
        description: "Rich Go language support for Visual Studio Code.",
        downloadCount: 12000000,
      },
      {
        id: "rust-lang.rust-analyzer",
        name: "rust-analyzer",
        publisher: "rust-lang",
        version: "0.3.1800",
        description: "Rust language support using rust-analyzer.",
        downloadCount: 8500000,
      },
    ];

    return registry.filter(
      (ext) =>
        ext.name.toLowerCase().includes(query.toLowerCase()) ||
        ext.id.toLowerCase().includes(query.toLowerCase()) ||
        ext.description.toLowerCase().includes(query.toLowerCase())
    );
  }

  /**
   * Resolve competitor extension ID to open-source equivalent.
   */
  public resolveReplacement(competitorExtensionId: string): string {
    return this.replacementMap.get(competitorExtensionId) || competitorExtensionId;
  }
}
