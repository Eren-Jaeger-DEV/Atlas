import { useState, useRef, useEffect } from "react";
import { useAtlasAPI } from "./useAtlasAPI";

export function useGithubAuth() {
  const api = useAtlasAPI();
  const [isGithubAuth, setIsGithubAuth] = useState(false);
  const [githubProfile, setGithubProfile] = useState<{name: string, login: string, email: string, avatar_url: string} | null>(null);
  const [loginError, setLoginError] = useState("");
  const [isPolling, setIsPolling] = useState(false);
  const [deviceCodeRes, setDeviceCodeRes] = useState<any>(null);
  
  // FIX: Proper interval cleanup without using global window state
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function checkStoredToken() {
      if (!api) return;
      try {
        if (api.githubGetStoredToken) {
          const storedToken = await api.githubGetStoredToken();
          if (storedToken) {
            const res = await api.githubVerifyToken(storedToken);
            if (res.success) {
              setIsGithubAuth(true);
              setGithubProfile(res.profile);
            }
          }
        }
      } catch (e) {
        console.error("Failed to check stored GitHub token:", e);
      }
    }
    checkStoredToken();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [api]);

  const handlePatLogin = async (patToken: string): Promise<boolean> => {
    if (!patToken) return false;
    setLoginError("");
    try {
      const res = await api.githubVerifyToken(patToken);
      if (res.success) {
        setIsGithubAuth(true);
        setGithubProfile(res.profile);
        return true;
      } else {
        setLoginError(res.error || "Invalid Token");
        return false;
      }
    } catch (e: any) {
      setLoginError(e.message || "Failed to verify PAT token");
      return false;
    }
  };

  const startDeviceFlow = async (clientId: string) => {
    if (!clientId) return;
    setLoginError("");
    try {
      const res = await api.githubDeviceLogin(clientId);
      if (res.error) {
        setLoginError(res.error);
        return;
      }
      setDeviceCodeRes(res);
      setIsPolling(true);
      
      intervalRef.current = setInterval(async () => {
        try {
          const pollRes = await api.githubDevicePoll(clientId, res.device_code);
          if (pollRes.access_token) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            const verifyRes = await api.githubVerifyToken(pollRes.access_token);
            if (verifyRes.success) {
              setIsGithubAuth(true);
              setGithubProfile(verifyRes.profile);
              setDeviceCodeRes(null);
              setIsPolling(false);
            }
          } else if (pollRes.error && pollRes.error !== "authorization_pending") {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setIsPolling(false);
            setLoginError("Device flow expired or failed.");
          }
        } catch (e: any) {
          console.error("Error during device polling", e);
        }
      }, (res.interval || 5) * 1000);
    } catch (e: any) {
      setLoginError(e.message || "Failed to start device flow");
    }
  };

  const cancelDeviceFlow = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPolling(false);
    setDeviceCodeRes(null);
  };

  const handleLogout = async () => {
    try {
      if (api.githubLogout) await api.githubLogout();
      setIsGithubAuth(false);
      setGithubProfile(null);
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  return {
    isGithubAuth,
    githubProfile,
    loginError,
    isPolling,
    deviceCodeRes,
    handlePatLogin,
    startDeviceFlow,
    cancelDeviceFlow,
    handleLogout
  };
}
