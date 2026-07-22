import { useState, useEffect } from "react";
import styled from "styled-components";
import { useAtlasAPI } from "../hooks/useAtlasAPI";
import { GlobalErrorBoundary } from "./GlobalErrorBoundary";

interface ExtensionManifest {
  id?: string;
  dirName?: string;
  name?: string;
  version?: string;
  publisher?: string;
  description?: string;
  permissions?: string[];
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

const InstallBtn = styled.button`
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
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const ExtName = styled.p`
  font-size: 13px;
  font-weight: 700;
  margin: 0 0 2px;
  color: var(--text-main, #fafafa);
`;

const ExtMeta = styled.p`
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

const ExtDesc = styled.p`
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

function ExtensionGalleryContent() {
  const api = useAtlasAPI();
  const [extensions, setExtensions] = useState<ExtensionManifest[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);

  const loadExtensions = () => {
    setLoading(true);
    if (!api?.listExtensions) {
      setExtensions([]);
      setLoading(false);
      return;
    }
    api.listExtensions()
      .then((list: ExtensionManifest[]) => {
        setExtensions(list || []);
      })
      .catch((e) => {
        console.error("Failed to load extensions", e);
        setExtensions([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadExtensions();
  }, [api]);

  const handleInstall = async () => {
    setInstallError(null);
    try {
      if (!api?.selectDirectory || !api?.installExtension) return;
      const dir = await api.selectDirectory();
      if (dir) {
        setLoading(true);
        await api.installExtension(dir);
        loadExtensions();
      }
    } catch (e: unknown) {
      console.error("Extension installation failed:", e);
      setInstallError(e instanceof Error ? e.message : "Failed to install extension. Check the console for details.");
      setLoading(false);
    }
  };

  const filtered = extensions.filter(ext => {
    const q = search.toLowerCase();
    return (
      (ext.name ?? "").toLowerCase().includes(q) ||
      (ext.description ?? "").toLowerCase().includes(q) ||
      (ext.id ?? ext.dirName ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <Container>
      <Header>
        <HeaderLeft>
          <Title>EXTENSIONS MARKETPLACE</Title>
          <Subtext>
            {loading ? "Scanning..." : `${extensions.length} Installed`}
          </Subtext>
        </HeaderLeft>
        <InstallBtn onClick={handleInstall} title="Install Local Extension...">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
        </InstallBtn>
      </Header>

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
          placeholder="Filter installed extensions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </SearchBox>

      <List>
        {!loading && extensions.length === 0 && (
          <EmptyState>
            <EmptyTitle>No Extensions Installed</EmptyTitle>
            <EmptyDesc>
              Install extensions by placing a folder containing a{" "}
              <Code>manifest.json</Code> into the Atlas
              extensions directory. Marketplace integration is coming in a
              future release.
            </EmptyDesc>
            <EmptyPath>
              Extensions dir:{" "}
              <Code>%APPDATA%\atlas\extensions\</Code>
            </EmptyPath>
          </EmptyState>
        )}

        {filtered.map((ext, idx) => (
          <Card key={ext.id ?? ext.dirName ?? idx}>
            <CardHeader>
              <div>
                <ExtName>{ext.name ?? ext.dirName ?? "Unknown Extension"}</ExtName>
                <ExtMeta>
                  v{ext.version ?? "?.?.?"} by{" "}
                  <Publisher>{ext.publisher ?? "Unknown"}</Publisher>
                </ExtMeta>
              </div>
              <InstalledBadge>[INSTALLED]</InstalledBadge>
            </CardHeader>

            {ext.description && (
              <ExtDesc>{ext.description}</ExtDesc>
            )}

            {Array.isArray(ext.permissions) && ext.permissions.length > 0 && (
              <PermList>
                {ext.permissions.map(p => (
                  <PermBadge key={p}>{p}</PermBadge>
                ))}
              </PermList>
            )}
          </Card>
        ))}
      </List>
    </Container>
  );
}

// Wrap the main content in an ErrorBoundary to prevent catastrophic crashes
export function ExtensionGallery() {
  return (
    <GlobalErrorBoundary>
      <ExtensionGalleryContent />
    </GlobalErrorBoundary>
  );
}
