import { useState, useEffect } from "react";
import { useAtlasAPI } from "./useAtlasAPI";

export function useGitActivity(repoPath?: string) {
  const api = useAtlasAPI();
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [activities, setActivities] = useState<Array<{ author: string; action: string; time: string }>>([]);

  useEffect(() => {
    async function fetchUserInfo() {
      if (!api) return;
      try {
        if (api.getGitConfig) {
          const cfg = await api.getGitConfig(repoPath);
          if (cfg.name) setUserName(cfg.name);
          if (cfg.email) setUserEmail(cfg.email);
        } else if (api.getSystemUserInfo) {
          const info = await api.getSystemUserInfo();
          if (info.username) setUserName(info.username);
        }
      } catch (e) {
        console.error("Failed to fetch git config or system user info", e);
      }
    }

    async function fetchLogs() {
      if (!api) return;
      try {
        if (api.gitLog && repoPath) {
          const logs = await api.gitLog(repoPath, 5);
          if (logs && logs.length > 0) {
            setActivities(logs.map((l: any) => ({
              author: l.author || "Developer",
              action: l.message,
              time: l.date,
            })));
          }
        }
      } catch (e) {
        console.error("Failed to fetch git logs", e);
      }
    }

    fetchUserInfo();
    fetchLogs();
  }, [api, repoPath]);

  return {
    userName,
    userEmail,
    activities
  };
}
