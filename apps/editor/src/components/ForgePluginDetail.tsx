import { useState } from "react";
import styled from "styled-components";
import { useAtlasAPI } from "../hooks/useAtlasAPI";
import { GlobalErrorBoundary } from "./GlobalErrorBoundary";

interface ForgePluginDetailProps {
  pluginData: any;
  onClose?: () => void;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-base, #0d0d10);
  color: var(--text-main, #fafafa);
  overflow-y: auto;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background-color: var(--bg-base, #09090b);
  border-bottom: 1px solid #27272a;
`;

const TitleSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Name = styled.h2`
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  color: var(--text-main, #fafafa);
`;

const Meta = styled.div`
  font-size: 11px;
  color: var(--text-muted, #71717a);
  display: flex;
  gap: 12px;
`;

const Publisher = styled.span`
  color: var(--accent, #38bdf8);
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: var(--text-muted, #a1a1aa);
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  &:hover {
    color: var(--text-main, #fafafa);
    background-color: var(--bg-panel, #141417);
  }
`;

const Content = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SectionTitle = styled.h3`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-muted, #a1a1aa);
  margin: 0;
`;

const Description = styled.p`
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-main, #e4e4e7);
  margin: 0;
`;

const PermList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const PermItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: var(--bg-panel, #141417);
  border: 1px solid #27272a;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-family: monospace;
  color: var(--accent, #38bdf8);
`;

const ActionRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 10px;
`;

const ActionButton = styled.button<{ $danger?: boolean }>`
  background-color: ${props => props.$danger ? "rgba(239, 68, 68, 0.15)" : "var(--accent, #38bdf8)"};
  color: ${props => props.$danger ? "#ef4444" : "#09090b"};
  border: ${props => props.$danger ? "1px solid #ef4444" : "none"};
  font-weight: 700;
  font-size: 12px;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  &:hover {
    opacity: 0.9;
  }
`;

function ForgePluginDetailContent({ pluginData, onClose }: ForgePluginDetailProps) {
  const api = useAtlasAPI();
  const [uninstalling, setUninstalling] = useState(false);

  const handleUninstall = async () => {
    if (!pluginData?.id || !(api as any)?.uninstallPlugin) return;
    setUninstalling(true);
    try {
      await (api as any).uninstallPlugin(pluginData.id);
      onClose?.();
    } catch (e) {
      console.error("Failed to uninstall plugin", e);
    } finally {
      setUninstalling(false);
    }
  };

  return (
    <Container>
      <Header>
        <TitleSection>
          <Name>{pluginData?.name || pluginData?.id || "Plugin Detail"}</Name>
          <Meta>
            {pluginData?.version && <span>Version {pluginData.version}</span>}
            {pluginData?.publisher && <span>Published by <Publisher>{pluginData.publisher}</Publisher></span>}
          </Meta>
        </TitleSection>
        {onClose && <CloseBtn onClick={onClose}>✕</CloseBtn>}
      </Header>

      <Content>
        <ActionRow>
          <ActionButton $danger onClick={handleUninstall} disabled={uninstalling}>
            {uninstalling ? "Uninstalling..." : "Uninstall Plugin"}
          </ActionButton>
        </ActionRow>

        {pluginData?.description && (
          <Section>
            <SectionTitle>Description</SectionTitle>
            <Description>{pluginData.description}</Description>
          </Section>
        )}

        {Array.isArray(pluginData?.permissions) && pluginData.permissions.length > 0 && (
          <Section>
            <SectionTitle>Declared Permissions</SectionTitle>
            <PermList>
              {pluginData.permissions.map((perm: string) => (
                <PermItem key={perm}>🔒 {perm}</PermItem>
              ))}
            </PermList>
          </Section>
        )}
      </Content>
    </Container>
  );
}

export function ForgePluginDetail({ pluginData, onClose }: ForgePluginDetailProps) {
  return (
    <GlobalErrorBoundary>
      <ForgePluginDetailContent pluginData={pluginData} onClose={onClose} />
    </GlobalErrorBoundary>
  );
}
