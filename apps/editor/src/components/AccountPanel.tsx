import { useState, useEffect } from "react";

const api = () => (window as any).atlasAPI;

export function AccountPanel() {
  const [userName, setUserName] = useState("Developer");
  const [userEmail, setUserEmail] = useState("developer@local");
  const [signedIn, setSignedIn] = useState(true);
  const [activeProfile, setActiveProfile] = useState("Personal");
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [activities, setActivities] = useState<Array<{ author: string; action: string; time: string }>>([]);

  useEffect(() => {
    async function loadIdentity() {
      const a = api();
      if (!a) return;

      try {
        if (a.getGitConfig) {
          const cfg = await a.getGitConfig();
          if (cfg.name) setUserName(cfg.name);
          if (cfg.email) setUserEmail(cfg.email);
        } else if (a.getSystemUserInfo) {
          const info = await a.getSystemUserInfo();
          if (info.username) setUserName(info.username);
        }
      } catch {
        // Fallback to local
      }

      try {
        if (a.gitLog) {
          const logs = await a.gitLog(localStorage.getItem("atlas_last_repo") || "", 5);
          if (logs && logs.length > 0) {
            setActivities(
              logs.map(l => ({
                author: l.author || "Developer",
                action: l.message,
                time: l.date,
              }))
            );
          }
        }
      } catch {
        // Fallback
      }
    }
    loadIdentity();
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>ACCOUNT & TEAM COLLABORATION</span>
        <span style={styles.subtext}>{signedIn ? "[PASS] Online & Synced" : "[WARN] Offline"}</span>
      </div>

      <div style={styles.content}>
        {/* User Card */}
        <div style={styles.userCard}>
          <div style={styles.avatar}>{userName.charAt(0).toUpperCase()}</div>
          <div style={styles.userMeta}>
            <p style={styles.userName}>{userName}</p>
            <p style={styles.userEmail}>{userEmail}</p>
            <span style={styles.planBadge}>Pro Developer</span>
          </div>

          <button style={styles.authBtn} onClick={() => setSignedIn(p => !p)}>
            {signedIn ? "Sign Out" : "Sign In"}
          </button>
        </div>

        {/* Sync & Profile Selector */}
        <div style={styles.section}>
          <p style={styles.secHdr}>WORKSPACE PROFILES & SYNC</p>

          <div style={styles.row}>
            <span>Cloud Settings Sync</span>
            <input
              type="checkbox"
              checked={syncEnabled}
              onChange={e => setSyncEnabled(e.target.checked)}
            />
          </div>

          <div style={styles.row}>
            <span>Active Profile</span>
            <select
              style={styles.select}
              value={activeProfile}
              onChange={e => setActiveProfile(e.target.value)}
            >
              <option value="Personal">Personal</option>
              <option value="Work">Work Enterprise</option>
              <option value="Open Source">Open Source</option>
              <option value="Research">Research Sandbox</option>
            </select>
          </div>
        </div>

        {/* Dynamic Activity Log */}
        <div style={styles.section}>
          <p style={styles.secHdr}>RECENT WORKSPACE GIT ACTIVITY</p>
          {activities.length === 0 ? (
            <p style={styles.noAct}>No recent git commits found in active workspace.</p>
          ) : (
            activities.map((a, idx) => (
              <div key={idx} style={styles.activityRow}>
                <p style={styles.actMsg}>
                  <strong>{a.author}</strong> {a.action}
                </p>
                <p style={styles.actTime}>{a.time}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#0d0d10",
    color: "#fafafa",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    backgroundColor: "#09090b",
    borderBottom: "1px solid #27272a",
  },
  title: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.8px",
  },
  subtext: {
    fontSize: "11px",
    color: "#4ade80",
  },
  content: {
    flex: 1,
    padding: "12px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  userCard: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    backgroundColor: "#141417",
    border: "1px solid #27272a",
    borderRadius: "8px",
    padding: "12px",
  },
  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    backgroundColor: "#38bdf8",
    color: "#09090b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: "16px",
  },
  userMeta: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  userName: {
    fontSize: "13px",
    fontWeight: 700,
    margin: "0 0 2px",
    color: "#fafafa",
  },
  userEmail: {
    fontSize: "11px",
    color: "#71717a",
    margin: "0 0 4px",
  },
  planBadge: {
    fontSize: "9px",
    fontWeight: 700,
    color: "#38bdf8",
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    padding: "1px 5px",
    borderRadius: "3px",
    width: "fit-content",
  },
  authBtn: {
    backgroundColor: "#27272a",
    color: "#fafafa",
    border: "none",
    borderRadius: "4px",
    padding: "4px 10px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
  },
  section: {
    backgroundColor: "#141417",
    border: "1px solid #27272a",
    borderRadius: "6px",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  secHdr: {
    fontSize: "10px",
    fontWeight: 700,
    color: "#71717a",
    margin: "0 0 4px",
    letterSpacing: "0.8px",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "12px",
  },
  select: {
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    color: "#fafafa",
    borderRadius: "4px",
    padding: "3px 8px",
    fontSize: "11px",
  },
  activityRow: {
    display: "flex",
    flexDirection: "column",
    borderBottom: "1px solid #27272a",
    paddingBottom: "4px",
  },
  actMsg: {
    fontSize: "11px",
    color: "#e4e4e7",
    margin: "0 0 2px",
  },
  actTime: {
    fontSize: "9px",
    color: "#71717a",
    margin: 0,
  },
  noAct: {
    fontSize: "11px",
    color: "#71717a",
    margin: 0,
  },
};
