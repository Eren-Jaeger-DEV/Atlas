import { useState, useEffect } from "react";
import styled from "styled-components";
import { useAtlasAPI } from "../hooks/useAtlasAPI";
import { GlobalErrorBoundary } from "./GlobalErrorBoundary";

interface PluginManifest {
  id?: string;
  dirName?: string;
  name?: string;
  version?: string;
  publisher?: string;
  description?: string;
  permissions?: string[];
  readme?: string;
  downloadUrl?: string;
  verified?: boolean;
}

interface ForgeGalleryProps {
  onOpenPluginDetail?: (pluginData: any) => void;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-base, #0d0d10);
  color: var(--text-main, #fafafa);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: var(--bg-base, #09090b);
  border-bottom: 1px solid #27272a;
`;

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Title = styled.span`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.8px;
`;

const Subtext = styled.span`
  font-size: 11px;
  color: var(--text-muted, #71717a);
`;

const ActionBtn = styled.button`
  background-color: transparent;
  border: none;
  color: var(--text-muted, #a1a1aa);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    color: var(--text-main, #fafafa);
    background-color: var(--bg-panel, #141417);
  }
`;

const SearchBox = styled.div`
  padding: 10px 12px;
  border-bottom: 1px solid #27272a;
`;

const SearchInput = styled.input`
  width: 100%;
  background-color: var(--bg-header, #18181b);
  border: 1px solid #27272a;
  color: var(--text-main, #fafafa);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
  &:focus {
    border-color: var(--accent, #38bdf8);
  }
`;

const List = styled.div`
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const EmptyState = styled.div`
  background-color: var(--bg-panel, #141417);
  border: 1px solid #27272a;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const EmptyTitle = styled.p`
  font-size: 13px;
  font-weight: 700;
  margin: 0;
  color: var(--text-muted, #a1a1aa);
`;

const EmptyDesc = styled.p`
  font-size: 11px;
  color: var(--text-muted, #71717a);
  margin: 0;
  line-height: 1.6;
`;

const EmptyPath = styled.p`
  font-size: 10px;
  color: #52525b;
  margin: 0;
`;

const Code = styled.code`
  font-family: monospace;
  color: var(--accent, #38bdf8);
  font-size: 10px;
`;

const Card = styled.div`
  background-color: var(--bg-panel, #141417);
  border: 1px solid #27272a;
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  transition: all 0.12s ease;
  &:hover {
    border-color: var(--accent, #38bdf8);
    transform: translateY(-1px);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const PluginName = styled.p`
  font-size: 13px;
  font-weight: 700;
  margin: 0 0 2px;
  color: var(--text-main, #fafafa);
`;

const PluginMeta = styled.p`
  font-size: 10px;
  color: var(--text-muted, #71717a);
  margin: 0;
`;

const Publisher = styled.span`
  color: var(--accent, #38bdf8);
`;

const InstalledBadge = styled.span`
  font-size: 9px;
  font-weight: 700;
  color: #4ade80;
  background-color: rgba(74, 222, 128, 0.08);
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;
`;

const VerifiedBadge = styled.span`
  font-size: 9px;
  font-weight: 700;
  color: #38bdf8;
  background-color: rgba(56, 189, 248, 0.08);
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;
  margin-left: 4px;
`;

const PluginDesc = styled.p`
  font-size: 11px;
  color: var(--text-muted, #a1a1aa);
  margin: 0;
  line-height: 1.4;
`;

const PermList = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 2px;
`;

const PermBadge = styled.span`
  background-color: var(--bg-header, #18181b);
  border: 1px solid #27272a;
  color: var(--text-muted, #71717a);
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 3px;
  font-family: monospace;
`;

const ErrorAlert = styled.div`
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
  color: #fca5a5;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 11px;
  margin: 10px 12px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TabBar = styled.div`
  display: flex;
  gap: 16px;
  padding: 0 12px;
  background-color: var(--bg-base, #09090b);
  border-bottom: 1px solid #27272a;
`;

const Tab = styled.button<{ $active: boolean }>`
  background: none;
  border: none;
  color: ${props => props.$active ? "var(--accent, #38bdf8)" : "var(--text-muted, #71717a)"};
  font-size: 11px;
  font-weight: 600;
  padding: 8px 0;
  cursor: pointer;
  border-bottom: 2px solid ${props => props.$active ? "var(--accent, #38bdf8)" : "transparent"};
  &:hover {
    color: var(--text-main, #fafafa);
  }
`;

const InstallBtn = styled.button`
  background-color: var(--accent, #38bdf8);
  color: #000;
  border: none;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  padding: 4px 10px;
  cursor: pointer;
  white-space: nowrap;
  &:hover {
    opacity: 0.9;
  }
`;

function ForgeGalleryContent({ onOpenPluginDetail }: ForgeGalleryProps) {
  const api = useAtlasAPI();
  const [plugins, setPlugins] = useState<PluginManifest[]>([]);
  const [forgePlugins, setForgePlugins] = useState<PluginManifest[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"installed" | "forge">("installed");

  const loadPlugins = () => {
    setLoading(true);
    const fetchInstalled = (api as any)?.listPlugins ? (api as any).listPlugins() : Promise.resolve([]);
    
    fetchInstalled
      .then((list: PluginManifest[]) => {
        setPlugins(list || []);
      })
      .catch((e: any) => {
        console.error("Failed to load installed plugins", e);
        setPlugins([]);
      })
      .finally(() => setLoading(false));
  };

  const loadForgeRegistry = () => {
    // Default built-in Forge registry items
    const registry: PluginManifest[] = [
      {
        id: "atlas-lang-typescript",
        name: "TypeScript & JavaScript Support",
        publisher: "atlas-core",
        version: "1.0.0",
        description: "Official TypeScript and JavaScript IntelliSense and debugging engine.",
        verified: true,
      },
      {
        id: "atlas-lang-python",
        name: "Python Language Support",
        publisher: "atlas-core",
        version: "1.0.0",
        description: "Adds Python IntelliSense and debugging via Pyright and Debugpy.",
        verified: true,
      },
      {
        id: "atlas-viewer-markdown",
        name: "Markdown Preview Viewer",
        publisher: "atlas-core",
        version: "1.0.0",
        description: "Live Markdown rendering preview for .md and .markdown files.",
        verified: true,
      },
    ];
    setForgePlugins(registry);
  };

  useEffect(() => {
    loadPlugins();
    loadForgeRegistry();
  }, []);

  const handleInstallLocal = async () => {
    setInstallError(null);
    try {
      if (!api?.selectDirectory) return;
      const dir = await api.selectDirectory();
      if (dir) {
        setLoading(true);
        if ((api as any)?.installPlugin) {
          await (api as any).installPlugin(dir);
        }
        loadPlugins();
      }
    } catch (e: unknown) {
      console.error("Plugin installation failed:", e);
      setInstallError(e instanceof Error ? e.message : "Failed to install plugin. Check the console for details.");
      setLoading(false);
    }
  };

  const handleInstallMarketplace = async (plugin: PluginManifest) => {
    setInstallError(null);
    try {
      setLoading(true);
      if ((api as any)?.installMarketplaceExtension) {
        await (api as any).installMarketplaceExtension(plugin);
      } else if ((api as any)?.installPlugin) {
        await (api as any).installPlugin(plugin);
      }
      loadPlugins();
    } catch (e: unknown) {
      console.error("Marketplace installation failed:", e);
      setInstallError(e instanceof Error ? e.message : `Failed to install plugin '${plugin.name}'.`);
    } finally {
      setLoading(false);
    }
  };

  const displayList = activeTab === "installed" ? plugins : forgePlugins;

  const filtered = displayList.filter(plugin => {
    const q = search.toLowerCase();
    return (
      (plugin.name ?? "").toLowerCase().includes(q) ||
      (plugin.description ?? "").toLowerCase().includes(q) ||
      (plugin.id ?? plugin.dirName ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <Container>
      <Header>
        <HeaderLeft>
          <Title>ATLAS FORGE</Title>
          <Subtext>
            {loading ? "Scanning..." : `${plugins.length} Installed`}
          </Subtext>
        </HeaderLeft>
        <ActionBtn onClick={handleInstallLocal} title="Install Local Plugin Package...">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
        </ActionBtn>
      </Header>

      <TabBar>
        <Tab $active={activeTab === "installed"} onClick={() => setActiveTab("installed")}>Installed</Tab>
        <Tab $active={activeTab === "forge"} onClick={() => setActiveTab("forge")}>Marketplace</Tab>
      </TabBar>

      {installError && (
        <ErrorAlert>
          <span>{installError}</span>
          <button 
            style={{ background: "transparent", border: "none", color: "#fca5a5", cursor: "pointer", padding: "4px" }}
            onClick={() => setInstallError(null)}
          >
            ✕
          </button>
        </ErrorAlert>
      )}

      <SearchBox>
        <SearchInput
          placeholder={activeTab === "installed" ? "Filter installed plugins..." : "Search Atlas Forge plugins..."}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </SearchBox>

      <List>
        {activeTab === "installed" && !loading && plugins.length === 0 && (
          <EmptyState>
            <EmptyTitle>No Plugins Installed</EmptyTitle>
            <EmptyDesc>
              Install plugins by placing a folder containing a <Code>plugin.json</Code> into your Atlas plugins directory, or use the install button above.
            </EmptyDesc>
            <EmptyPath>
              Plugins dir: <Code>~/.atlas/plugins/</Code>
            </EmptyPath>
          </EmptyState>
        )}

        {filtered.map((plugin, idx) => {
          const isInstalled = plugins.some(p => p.id === plugin.id);
          return (
            <Card key={plugin.id ?? plugin.dirName ?? idx} onClick={() => onOpenPluginDetail?.(plugin)}>
              <CardHeader>
                <div>
                  <PluginName>
                    {plugin.name ?? plugin.dirName ?? plugin.id}
                    {plugin.verified && <VerifiedBadge>[VERIFIED]</VerifiedBadge>}
                  </PluginName>
                  <PluginMeta>
                    {plugin.version && <>v{plugin.version} </>}
                    {plugin.publisher && <>by <Publisher>{plugin.publisher}</Publisher></>}
                  </PluginMeta>
                </div>
                {isInstalled ? (
                  <InstalledBadge>[INSTALLED]</InstalledBadge>
                ) : (
                  <InstallBtn
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInstallMarketplace(plugin);
                    }}
                  >
                    Install
                  </InstallBtn>
                )}
              </CardHeader>

              {plugin.description && (
                <PluginDesc>{plugin.description}</PluginDesc>
              )}

              {Array.isArray(plugin.permissions) && plugin.permissions.length > 0 && (
                <PermList>
                  {plugin.permissions.map(p => (
                    <PermBadge key={p}>{p}</PermBadge>
                  ))}
                </PermList>
              )}
            </Card>
          );
        })}
      </List>
    </Container>
  );
}

export function ForgeGallery({ onOpenPluginDetail }: ForgeGalleryProps) {
  return (
    <GlobalErrorBoundary>
      <ForgeGalleryContent onOpenPluginDetail={onOpenPluginDetail} />
    </GlobalErrorBoundary>
  );
}
