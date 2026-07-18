import { useState } from "react";

interface UserAccount {
  name: string;
  email: string;
  plan: string;
  signedIn: boolean;
}

export function AccountPanel() {
  const [user, setUser] = useState<UserAccount>({
    name: "Eren Jaeger",
    email: "eren@atlas.dev",
    plan: "Pro Developer",
    signedIn: true,
  });

  const [activeProfile, setActiveProfile] = useState("Personal");
  const [syncEnabled, setSyncEnabled] = useState(true);

  const teamMembers = [
    { name: "Eren Jaeger", status: "active", file: "App.tsx" },
    { name: "Armin Arlert", status: "idle", file: "EventBus.ts" },
    { name: "Mikasa Ackerman", status: "offline", file: "" },
  ];

  const activities = [
    { author: "Eren Jaeger", action: "Pushed 3 commits to main", time: "5 mins ago" },
    { author: "Armin Arlert", action: "Resolved merge conflict in EditorPane.tsx", time: "20 mins ago" },
    { author: "Mikasa Ackerman", action: "Published extension atlas.prettier v2.4", time: "1 hour ago" },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>ACCOUNT & TEAM COLLABORATION</span>
        <span style={styles.subtext}>{user.signedIn ? "[PASS] Online & Synced" : "[WARN] Offline"}</span>
      </div>

      <div style={styles.content}>
        {/* User Card */}
        <div style={styles.userCard}>
          <div style={styles.avatar}>{user.name.charAt(0)}</div>
          <div style={styles.userMeta}>
            <p style={styles.userName}>{user.name}</p>
            <p style={styles.userEmail}>{user.email}</p>
            <span style={styles.planBadge}>{user.plan}</span>
          </div>

          <button
            style={styles.authBtn}
            onClick={() => setUser(prev => ({ ...prev, signedIn: !prev.signedIn }))}
          >
            {user.signedIn ? "Sign Out" : "Sign In"}
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

        {/* Team Members */}
        <div style={styles.section}>
          <p style={styles.secHdr}>TEAM PRESENCE ({teamMembers.length})</p>
          {teamMembers.map(m => (
            <div key={m.name} style={styles.teamRow}>
              <span style={styles.memberName}>
                <span
                  style={{
                    ...styles.statusDot,
                    backgroundColor:
                      m.status === "active" ? "#4ade80" : m.status === "idle" ? "#facc15" : "#71717a",
                  }}
                />
                {m.name}
              </span>
              <span style={styles.memberFile}>{m.file || "Offline"}</span>
            </div>
          ))}
        </div>

        {/* Activity Timeline */}
        <div style={styles.section}>
          <p style={styles.secHdr}>TEAM ACTIVITY TIMELINE</p>
          {activities.map((a, idx) => (
            <div key={idx} style={styles.activityRow}>
              <p style={styles.actMsg}>
                <strong>{a.author}</strong> {a.action}
              </p>
              <p style={styles.actTime}>{a.time}</p>
            </div>
          ))}
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
  teamRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "12px",
    borderBottom: "1px solid #27272a",
    paddingBottom: "4px",
  },
  memberName: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  statusDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
  },
  memberFile: {
    fontSize: "11px",
    color: "#71717a",
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
};
