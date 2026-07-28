import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { useAtlasAPI } from "../hooks/useAtlasAPI";

export interface ExtensionData {
  id?: string;
  dirName?: string;
  name?: string;
  publisher?: string;
  version?: string;
  description?: string;
  permissions?: string[];
  repository?: string;
  license?: string;
  isEnabled?: boolean;
}

interface ExtensionDetailViewProps {
  extension: ExtensionData;
  onOpenSettings?: () => void;
  onToggleEnable?: () => void;
  onUninstall?: () => void;
}

interface ExtensionMeta {
  readme: string | null;
  sizeStr: string;
  repository: string | null;
  license: string | null;
  lastUpdated: string | null;
  keywords: string[];
}

// ---------------------------------------------------------------------------
// Styled Components
// ---------------------------------------------------------------------------

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: var(--bg-base, #000000);
  color: var(--text-main, #fafafa);
  overflow-y: auto;
  font-family: var(--font-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
`;

const HeaderSection = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 24px;
  padding: 32px 40px 24px;
  background-color: #050505;
  border-bottom: 1px solid #1e1e24;
`;

const LogoBox = styled.div`
  width: 100px;
  height: 100px;
  border-radius: 20px;
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 25px rgba(99, 102, 241, 0.25);
  flex-shrink: 0;
`;

const TitleInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
`;

const ExtName = styled.h1`
  font-size: 26px;
  font-weight: 700;
  margin: 0;
  color: #ffffff;
  letter-spacing: -0.5px;
`;

const MetaLine = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  color: #a1a1aa;
  flex-wrap: wrap;
`;

const PublisherSpan = styled.span`
  color: var(--accent, #38bdf8);
  font-weight: 600;
`;

const Description = styled.p`
  font-size: 14px;
  color: #d4d4d8;
  margin: 6px 0 16px;
  line-height: 1.5;
`;

const ButtonRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ActionBtn = styled.button<{ $primary?: boolean; $danger?: boolean }>`
  background: ${props => props.$danger ? "rgba(239,68,68,0.15)" : props.$primary ? "var(--accent, #38bdf8)" : "#18181b"};
  color: ${props => props.$danger ? "#ef4444" : props.$primary ? "#000000" : "#ffffff"};
  border: 1px solid ${props => props.$danger ? "#ef4444" : props.$primary ? "var(--accent, #38bdf8)" : "#27272a"};
  border-radius: 6px;
  padding: 6px 16px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
`;

const GearBtn = styled.button`
  background: #18181b;
  border: 1px solid #27272a;
  color: #a1a1aa;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    color: #ffffff;
    border-color: #3f3f46;
  }
`;

const SubTabBar = styled.div`
  display: flex;
  gap: 24px;
  padding: 0 40px;
  background-color: #050505;
  border-bottom: 1px solid #1e1e24;
`;

const SubTab = styled.button<{ $active: boolean }>`
  background: none;
  border: none;
  color: ${props => props.$active ? "var(--accent, #38bdf8)" : "#71717a"};
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 12px 0;
  cursor: pointer;
  border-bottom: 2px solid ${props => props.$active ? "var(--accent, #38bdf8)" : "transparent"};
  &:hover {
    color: #ffffff;
  }
`;

const ContentLayout = styled.div`
  display: flex;
  flex: 1;
  padding: 32px 40px;
  gap: 48px;
`;

const MainDetails = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
`;

const SidebarInfo = styled.div`
  width: 260px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  flex-shrink: 0;
  border-left: 1px solid #18181b;
  padding-left: 32px;
`;

const InfoGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const InfoTitle = styled.span`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #71717a;
  letter-spacing: 0.8px;
`;

const InfoItem = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  gap: 8px;
`;

const InfoLabel = styled.span`
  color: #a1a1aa;
  white-space: nowrap;
`;

const InfoValue = styled.span`
  color: #ffffff;
  font-family: monospace;
  text-align: right;
  word-break: break-all;
`;

const KeywordTag = styled.span`
  background: #18181b;
  border: 1px solid #27272a;
  color: #a1a1aa;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  display: inline-block;
  margin-right: 6px;
  margin-bottom: 4px;
`;

const LinkItem = styled.a`
  color: var(--accent, #38bdf8);
  font-size: 12px;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 6px;
  &:hover {
    text-decoration: underline;
  }
`;

const ReadmeBox = styled.div`
  background-color: #050505;
  border: 1px solid #18181b;
  border-radius: 12px;
  padding: 24px 32px;
  line-height: 1.7;
  font-size: 13px;
  color: #d4d4d8;
  h1, h2, h3 { color: #ffffff; border-bottom: 1px solid #27272a; padding-bottom: 8px; margin-top: 24px; }
  h1 { font-size: 20px; }
  h2 { font-size: 16px; }
  h3 { font-size: 14px; }
  code { background: #18181b; padding: 2px 6px; border-radius: 4px; color: var(--accent, #38bdf8); font-family: monospace; }
  pre { background: #09090b; padding: 16px; border-radius: 8px; border: 1px solid #27272a; overflow-x: auto; }
  ul { padding-left: 20px; }
  li { margin-bottom: 6px; }
  p { margin: 10px 0; }
  a { color: var(--accent, #38bdf8); }
`;

const PermBadge = styled.span`
  background-color: #18181b;
  border: 1px solid #27272a;
  color: #a1a1aa;
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 4px;
  font-family: monospace;
`;

const PermList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const LoadingMsg = styled.div`
  color: #52525b;
  font-size: 12px;
  padding: 12px 0;
`;

const NoReadme = styled.div`
  color: #52525b;
  font-size: 13px;
  padding: 16px 0;
  font-style: italic;
`;

// ---------------------------------------------------------------------------
// HTML Sanitizer & Markdown Renderer
// ---------------------------------------------------------------------------
function sanitizeHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^>]*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, 'href="#"');
}

function formatMarkdown(src: string): string {
  if (!src) return "";
  const rawHtml = src
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^\- (.*$)/gim, "<li>$1</li>")
    .replace(/\n\n/g, "<br/><br/>");

  return sanitizeHtml(rawHtml);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ExtensionDetailView({
  extension,
  onOpenSettings,
  onToggleEnable,
  onUninstall,
}: ExtensionDetailViewProps) {
  const api = useAtlasAPI();
  const [activeTab, setActiveTab] = useState<"details" | "features">("details");
  const [enabled, setEnabled] = useState(extension.isEnabled !== false);
  const [meta, setMeta] = useState<ExtensionMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);

  const dirName = extension.dirName ?? extension.id ?? null;

  useEffect(() => {
    if (!dirName || !api?.getExtensionMeta) return;
    setMetaLoading(true);
    api.getExtensionMeta(dirName)
      .then(data => setMeta(data))
      .catch(err => {
        console.error("[ExtensionDetailView] Failed to load extension metadata:", err);
        setMeta(null);
      })
      .finally(() => setMetaLoading(false));
  }, [dirName]);

  const handleEnableToggle = () => {
    setEnabled(prev => !prev);
    onToggleEnable?.();
  };

  // Use real repository from meta or manifest, never hardcoded
  const repository = meta?.repository ?? extension.repository ?? null;
  const license = meta?.license ?? extension.license ?? null;

  return (
    <Container>
      <HeaderSection>
        <LogoBox>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </LogoBox>

        <TitleInfo>
          <ExtName>{extension.name ?? extension.dirName ?? extension.id}</ExtName>
          <MetaLine>
            {extension.publisher && (
              <span>by <PublisherSpan>{extension.publisher}</PublisherSpan></span>
            )}
            {extension.version && <span>v{extension.version}</span>}
            {meta?.sizeStr && <span>{meta.sizeStr}</span>}
          </MetaLine>

          {extension.description && (
            <Description>{extension.description}</Description>
          )}

          <ButtonRow>
            <ActionBtn onClick={handleEnableToggle} $primary={!enabled}>
              {enabled ? "Disable" : "Enable"}
            </ActionBtn>

            <ActionBtn $danger onClick={onUninstall}>
              Uninstall
            </ActionBtn>

            {onOpenSettings && (
              <GearBtn title="Extension Settings" onClick={onOpenSettings}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </GearBtn>
            )}
          </ButtonRow>
        </TitleInfo>
      </HeaderSection>

      <SubTabBar>
        <SubTab $active={activeTab === "details"} onClick={() => setActiveTab("details")}>DETAILS</SubTab>
        <SubTab $active={activeTab === "features"} onClick={() => setActiveTab("features")}>FEATURES</SubTab>
      </SubTabBar>

      <ContentLayout>
        <MainDetails>
          {activeTab === "details" && (
            metaLoading ? (
              <LoadingMsg>Loading README...</LoadingMsg>
            ) : (
              <>
                {(extension.id?.toLowerCase().includes("atlascord") || extension.name?.toLowerCase().includes("atlascord") || dirName?.toLowerCase().includes("atlascord")) && (
                  <div style={{
                    marginBottom: "24px",
                    padding: "20px",
                    backgroundColor: "rgba(88, 101, 242, 0.08)",
                    border: "1px solid rgba(88, 101, 242, 0.3)",
                    borderRadius: "12px",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.4)"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 700, color: "#5865F2", textTransform: "uppercase" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                        Discord Rich Presence Live Preview
                      </div>
                      <span style={{ fontSize: "11px", color: "#4ade80", backgroundColor: "rgba(74, 222, 128, 0.15)", padding: "2px 8px", borderRadius: "12px", fontWeight: 600 }}>
                        ● Connected
                      </span>
                    </div>

                    <div style={{
                      backgroundColor: "#18191c",
                      borderRadius: "8px",
                      padding: "16px",
                      display: "flex",
                      gap: "16px",
                      alignItems: "center"
                    }}>
                      <div style={{ position: "relative", width: "56px", height: "56px" }}>
                        <div style={{ width: "56px", height: "56px", borderRadius: "12px", backgroundColor: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: 700, color: "#ffffff" }}>
                          A
                        </div>
                        <div style={{ position: "absolute", bottom: "-4px", right: "-4px", width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#38bdf8", border: "2px solid #18191c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", color: "#000000", fontWeight: 800 }}>
                          TS
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff" }}>Atlas Studio IDE</span>
                        <span style={{ fontSize: "13px", color: "#dbdee1" }}>Editing App.tsx in Atlas</span>
                        <span style={{ fontSize: "12px", color: "#949ba4" }}>Atlas Studio v1.0 • TYPESCRIPT</span>
                        <span style={{ fontSize: "11px", color: "#949ba4", marginTop: "2px" }}>00:14:22 elapsed</span>
                      </div>
                    </div>
                  </div>
                )}

                {meta?.readme ? (
                  <ReadmeBox dangerouslySetInnerHTML={{ __html: formatMarkdown(meta.readme) }} />
                ) : (
                  <NoReadme>No README.md found for this extension.</NoReadme>
                )}
              </>
            )
          )}

          {activeTab === "features" && Array.isArray(extension.permissions) && extension.permissions.length > 0 && (
            <ReadmeBox>
              <h2>Permissions</h2>
              <PermList>
                {extension.permissions.map(p => (
                  <PermBadge key={p}>{p}</PermBadge>
                ))}
              </PermList>
            </ReadmeBox>
          )}

          {activeTab === "features" && (!extension.permissions || extension.permissions.length === 0) && (
            <NoReadme>No feature declarations found for this extension.</NoReadme>
          )}
        </MainDetails>

        <SidebarInfo>
          <InfoGroup>
            <InfoTitle>Details</InfoTitle>
            {(extension.id ?? extension.dirName) && (
              <InfoItem>
                <InfoLabel>Identifier</InfoLabel>
                <InfoValue>{extension.id ?? extension.dirName}</InfoValue>
              </InfoItem>
            )}
            {extension.version && (
              <InfoItem>
                <InfoLabel>Version</InfoLabel>
                <InfoValue>{extension.version}</InfoValue>
              </InfoItem>
            )}
            {meta?.lastUpdated && (
              <InfoItem>
                <InfoLabel>Last Updated</InfoLabel>
                <InfoValue>{meta.lastUpdated}</InfoValue>
              </InfoItem>
            )}
            {meta?.sizeStr && (
              <InfoItem>
                <InfoLabel>Size</InfoLabel>
                <InfoValue>{meta.sizeStr}</InfoValue>
              </InfoItem>
            )}
          </InfoGroup>

          {meta && meta.keywords.length > 0 && (
            <InfoGroup>
              <InfoTitle>Keywords</InfoTitle>
              <div>
                {meta.keywords.map(k => (
                  <KeywordTag key={k}>{k}</KeywordTag>
                ))}
              </div>
            </InfoGroup>
          )}

          <InfoGroup>
            <InfoTitle>Resources</InfoTitle>
            {repository ? (
              <LinkItem href={repository} target="_blank" rel="noreferrer">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                Repository
              </LinkItem>
            ) : (
              <span style={{ color: "#52525b", fontSize: 12 }}>No repository URL</span>
            )}
            {license && (
              <InfoItem>
                <InfoLabel>License</InfoLabel>
                <InfoValue>{license}</InfoValue>
              </InfoItem>
            )}
          </InfoGroup>
        </SidebarInfo>
      </ContentLayout>
    </Container>
  );
}
