import { useState, useMemo } from "react";
import styled from "styled-components";
import { CloudSyncEngine } from "@atlas/core";
import { useGithubAuth } from "../hooks/useGithubAuth";
import { useGitActivity } from "../hooks/useGitActivity";
import { useStorage } from "./StorageContext";

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

const Title = styled.span`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.8px;
`;

const Subtext = styled.span<{ $offline?: boolean }>`
  font-size: 11px;
  color: ${props => props.$offline ? "var(--text-muted, #71717a)" : "#4ade80"};
`;

const Content = styled.div`
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const UserCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: var(--bg-panel, #141417);
  border: 1px solid #27272a;
  border-radius: 8px;
  padding: 12px;
`;

const Avatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--accent, #38bdf8);
  color: var(--bg-base, #09090b);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 16px;
`;

const AvatarImg = styled.img`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
`;

const UserMeta = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const UserName = styled.p`
  font-size: 13px;
  font-weight: 700;
  margin: 0 0 2px;
  color: var(--text-main, #fafafa);
`;

const UserEmail = styled.p`
  font-size: 11px;
  color: var(--text-muted, #71717a);
  margin: 0 0 4px;
`;

const PlanBadge = styled.span`
  font-size: 9px;
  font-weight: 700;
  color: var(--accent, #38bdf8);
  background-color: rgba(56, 189, 248, 0.1);
  padding: 1px 5px;
  border-radius: 3px;
  width: fit-content;
`;

const AuthBtn = styled.button`
  background-color: var(--border-color, #27272a);
  color: var(--text-main, #fafafa);
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
`;

const LoginContainer = styled.div`
  background-color: var(--bg-panel, #141417);
  border: 1px solid #27272a;
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
`;

const TabBtn = styled.button<{ $active?: boolean }>`
  flex: 1;
  background-color: var(--bg-base, #09090b);
  color: var(--text-main, #fafafa);
  border: 1px solid #27272a;
  border-radius: 4px;
  padding: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  opacity: ${props => props.$active ? 1 : 0.5};
`;

const Input = styled.input`
  background-color: var(--bg-base, #09090b);
  border: 1px solid #27272a;
  color: var(--text-main, #fafafa);
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 11px;
  outline: none;
`;

const Section = styled.div`
  background-color: var(--bg-panel, #141417);
  border: 1px solid #27272a;
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SecHdr = styled.p`
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted, #71717a);
  margin: 0 0 4px;
  letter-spacing: 0.8px;
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
`;

const ActivityRow = styled.div`
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid #27272a;
  padding-bottom: 4px;
`;

const ActMsg = styled.p`
  font-size: 11px;
  color: var(--text-main, #e4e4e7);
  margin: 0 0 2px;
`;

const ActTime = styled.p`
  font-size: 9px;
  color: var(--text-muted, #71717a);
  margin: 0;
`;

export function AccountPanel({ repoPath }: { repoPath?: string }) {
  const storage = useStorage();

  const cloudSyncEngine = useMemo(() => {
    // Injecting the provided StorageProvider to satisfy the DI architecture.
    return new CloudSyncEngine(storage);
  }, [storage]);
  
  // Custom hooks
  const { userName, userEmail, activities } = useGitActivity(repoPath);
  const { 
    isGithubAuth, githubProfile, loginError, 
    isPolling, deviceCodeRes, handlePatLogin, 
    startDeviceFlow, handleLogout 
  } = useGithubAuth();

  // Local UI state
  const [showLoginUI, setShowLoginUI] = useState(false);
  const [authMode, setAuthMode] = useState<"pat" | "device">("pat");
  const [patToken, setPatToken] = useState("");
  const [clientId, setClientId] = useState("");
  const [syncEnabled, setSyncEnabled] = useState(cloudSyncEngine.isSyncEnabled());

  const onSyncToggle = (checked: boolean) => {
    cloudSyncEngine.setSyncEnabled(checked);
    setSyncEnabled(checked);
  };

  const displayName = isGithubAuth ? githubProfile?.name || githubProfile?.login : userName;
  const displayEmail = isGithubAuth ? githubProfile?.email || `@${githubProfile?.login}` : userEmail;

  return (
    <Container>
      <Header>
        <Title>ACCOUNT & TEAM COLLABORATION</Title>
        <Subtext $offline={!isGithubAuth}>
          {isGithubAuth && syncEnabled ? "[PASS] Online & Synced" : isGithubAuth ? "[PASS] Online (Sync Disabled)" : "[WARN] Offline (Local Mode)"}
        </Subtext>
      </Header>

      <Content>
        {/* User Card */}
        <UserCard>
          {isGithubAuth && githubProfile?.avatar_url ? (
            <AvatarImg src={githubProfile.avatar_url} alt="Avatar" />
          ) : (
            <Avatar>{displayName?.charAt(0).toUpperCase()}</Avatar>
          )}
          <UserMeta>
            <UserName>{displayName}</UserName>
            <UserEmail>{displayEmail}</UserEmail>
            <PlanBadge>{isGithubAuth ? "GitHub Authenticated" : "Local Developer"}</PlanBadge>
          </UserMeta>

          <AuthBtn onClick={() => isGithubAuth ? handleLogout() : setShowLoginUI(!showLoginUI)}>
            {isGithubAuth ? "Sign Out" : (showLoginUI ? "Cancel" : "Sign In with GitHub")}
          </AuthBtn>
        </UserCard>

        {/* Login UI */}
        {showLoginUI && !isGithubAuth && (
          <LoginContainer>
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <TabBtn $active={authMode === "pat"} onClick={() => setAuthMode("pat")}>Personal Token</TabBtn>
              <TabBtn $active={authMode === "device"} onClick={() => setAuthMode("device")}>Device Flow</TabBtn>
            </div>

            {loginError && <p style={{ color: "#ef4444", fontSize: "11px", marginBottom: "8px" }}>{loginError}</p>}

            {authMode === "pat" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <Input 
                  type="password" 
                  value={patToken} 
                  onChange={e => setPatToken(e.target.value)} 
                  placeholder="ghp_..." 
                />
                <AuthBtn onClick={() => handlePatLogin(patToken)}>Verify & Sign In</AuthBtn>
                <p style={{fontSize: "10px", color: "var(--text-muted)"}}>Create a classic PAT with `user` and `repo` scopes on GitHub.</p>
              </div>
            )}

            {authMode === "device" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {!deviceCodeRes ? (
                  <>
                    <Input 
                      type="text" 
                      value={clientId} 
                      onChange={e => setClientId(e.target.value)} 
                      placeholder="OAuth App Client ID" 
                    />
                    <AuthBtn onClick={() => startDeviceFlow(clientId)}>Start Device Flow</AuthBtn>
                    <p style={{fontSize: "10px", color: "var(--text-muted)"}}>Provide your GitHub OAuth App Client ID to start the flow.</p>
                  </>
                ) : (
                  <div style={{ backgroundColor: "var(--bg-base)", padding: "12px", borderRadius: "4px", textAlign: "center" }}>
                    <p style={{ fontSize: "11px", marginBottom: "8px" }}>1. Open <strong>{deviceCodeRes.verification_uri}</strong></p>
                    <p style={{ fontSize: "11px", marginBottom: "8px" }}>2. Enter this code:</p>
                    <h2 style={{ letterSpacing: "2px", margin: "8px 0" }}>{deviceCodeRes.user_code}</h2>
                    <p style={{ fontSize: "11px", color: "#38bdf8" }}>{isPolling ? "Waiting for authorization..." : ""}</p>
                  </div>
                )}
              </div>
            )}
          </LoginContainer>
        )}

        {/* Sync Selector */}
        <Section>
          <SecHdr>WORKSPACE PROFILES & SYNC</SecHdr>
          <Row>
            <span>Cloud Settings Sync</span>
            <input
              type="checkbox"
              checked={syncEnabled}
              onChange={e => onSyncToggle(e.target.checked)}
            />
          </Row>
        </Section>

        {/* Dynamic Activity Log */}
        <Section>
          <SecHdr>RECENT WORKSPACE GIT ACTIVITY</SecHdr>
          {activities.length === 0 ? (
            <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>
              No recent git commits found in active workspace.
            </p>
          ) : (
            activities.map((a, idx) => (
              <ActivityRow key={idx}>
                <ActMsg>
                  <strong>{a.author}</strong> {a.action}
                </ActMsg>
                <ActTime>{a.time}</ActTime>
              </ActivityRow>
            ))
          )}
        </Section>
      </Content>
    </Container>
  );
}
