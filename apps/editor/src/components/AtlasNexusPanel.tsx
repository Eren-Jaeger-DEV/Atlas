import React, { useState, useEffect } from "react";
import { Users, Radio, Copy, Check, LogOut, UserPlus, ShieldCheck, Globe } from "lucide-react";
import { atlasNexus, type CollabSessionState } from "@atlas/agents";

export function AtlasNexusPanel() {
  const [session, setSession] = useState<CollabSessionState | null>(atlasNexus.getSession());
  const [joinInput, setJoinInput] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>("Local Dev");

  useEffect(() => {
    return atlasNexus.subscribe((nextState) => setSession(nextState));
  }, []);

  const handleStartHost = () => {
    atlasNexus.startSession(userName);
  };

  const handleJoin = () => {
    if (!joinInput.trim()) return;
    atlasNexus.joinSession(joinInput.trim(), userName);
  };

  const handleLeave = () => {
    atlasNexus.leaveSession();
  };

  const handleCopyRoomId = () => {
    if (!session) return;
    navigator.clipboard.writeText(session.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Users size={16} color="#60a5fa" />
          <span style={styles.title}>ATLAS NEXUS — P2P REAL-TIME COLLAB</span>
        </div>
        {session && (
          <span style={styles.statusBadge}>
            <Radio size={10} color="#34d399" className="pulse" />
            LIVE P2P
          </span>
        )}
      </div>

      {!session ? (
        /* Host or Join Controls */
        <div style={styles.welcomeBox}>
          <div style={styles.introCard}>
            <Globe size={24} color="#60a5fa" style={{ marginBottom: "6px" }} />
            <span style={{ fontWeight: 700, fontSize: "13px", color: "#f4f4f5" }}>
              Zero-Cloud Peer-to-Peer Editing
            </span>
            <span style={{ color: "#a1a1aa", fontSize: "11px", textAlign: "center", lineHeight: 1.4 }}>
              Collaborate live with zero central server or relay. Edit files and share cursor presence directly peer-to-peer.
            </span>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>YOUR DISPLAY NAME</label>
            <input
              type="text"
              style={styles.input}
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
          </div>

          <button style={styles.hostBtn} onClick={handleStartHost}>
            <UserPlus size={14} color="#ffffff" />
            <span>Host New P2P Collaboration Session</span>
          </button>

          <div style={styles.divider}>
            <span>OR JOIN ROOM</span>
          </div>

          <div style={styles.joinRow}>
            <input
              type="text"
              style={{ ...styles.input, textTransform: "uppercase", letterSpacing: "0.1em" }}
              placeholder="ROOM CODE (e.g. X7K9W2)"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
            <button style={styles.joinBtn} onClick={handleJoin}>
              Join
            </button>
          </div>
        </div>
      ) : (
        /* Active Collaboration Session View */
        <div style={styles.sessionStream}>
          {/* Room Code Banner */}
          <div style={styles.roomBanner}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={styles.roomLabel}>P2P SESSION ROOM CODE</span>
              <span style={styles.roomCode}>{session.roomId}</span>
            </div>
            <button style={styles.copyBtn} onClick={handleCopyRoomId}>
              {copied ? <Check size={12} color="#34d399" /> : <Copy size={12} color="#a1a1aa" />}
              <span>{copied ? "Copied!" : "Copy Code"}</span>
            </button>
          </div>

          {/* Connected Peers List */}
          <div style={styles.peersSection}>
            <div style={styles.sectionTitle}>
              <ShieldCheck size={12} color="#34d399" />
              CONNECTED PEERS ({session.connectedPeers.length})
            </div>

            <div style={styles.peersList}>
              {session.connectedPeers.map((peer) => (
                <div key={peer.id} style={styles.peerCard}>
                  <div style={{ ...styles.avatar, backgroundColor: peer.color }}>
                    {peer.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={styles.peerDetails}>
                    <span style={styles.peerName}>
                      {peer.name} {peer.id === "peer-host-1" ? "(Host)" : ""}
                    </span>
                    <span style={styles.peerLoc}>
                      {peer.activeFilePath ? `${peer.activeFilePath.split("/").pop()}:${peer.cursorLine || 1}` : "Viewing active document"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button style={styles.leaveBtn} onClick={handleLeave}>
            <LogOut size={12} color="#f87171" />
            <span>Leave Session</span>
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        .pulse { animation: pulse 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#09090b",
    color: "#f4f4f5",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: "12px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    backgroundColor: "#111113",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  title: {
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "#60a5fa",
    fontSize: "11px",
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "9px",
    fontWeight: 700,
    color: "#34d399",
    backgroundColor: "rgba(52, 211, 153, 0.12)",
    padding: "2px 6px",
    borderRadius: "4px",
    border: "1px solid rgba(52, 211, 153, 0.3)",
  },
  welcomeBox: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  introCard: {
    backgroundColor: "#111113",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "6px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  label: {
    fontSize: "9px",
    fontWeight: 700,
    color: "#71717a",
    letterSpacing: "0.05em",
  },
  input: {
    backgroundColor: "#111113",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "4px",
    color: "#f4f4f5",
    padding: "6px 8px",
    fontSize: "11px",
    outline: "none",
  },
  hostBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    backgroundColor: "#2563eb",
    border: "none",
    borderRadius: "4px",
    color: "#ffffff",
    padding: "8px 12px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#52525b",
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    margin: "4px 0",
  },
  joinRow: {
    display: "flex",
    gap: "8px",
  },
  joinBtn: {
    backgroundColor: "rgba(96, 165, 250, 0.15)",
    border: "1px solid rgba(96, 165, 250, 0.3)",
    borderRadius: "4px",
    color: "#60a5fa",
    padding: "0 14px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
  },
  sessionStream: {
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  roomBanner: {
    backgroundColor: "#111113",
    border: "1px solid rgba(96, 165, 250, 0.3)",
    borderRadius: "6px",
    padding: "10px 12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roomLabel: {
    fontSize: "8px",
    fontWeight: 700,
    color: "#71717a",
    letterSpacing: "0.06em",
  },
  roomCode: {
    fontSize: "18px",
    fontWeight: 800,
    color: "#60a5fa",
    fontFamily: "monospace",
    letterSpacing: "0.1em",
  },
  copyBtn: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    backgroundColor: "#18181b",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "4px",
    color: "#a1a1aa",
    padding: "4px 8px",
    fontSize: "11px",
    cursor: "pointer",
  },
  peersSection: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  sectionTitle: {
    fontSize: "9px",
    fontWeight: 700,
    color: "#71717a",
    letterSpacing: "0.06em",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
  peersList: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  peerCard: {
    backgroundColor: "#111113",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "4px",
    padding: "8px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  avatar: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: "11px",
  },
  peerDetails: {
    display: "flex",
    flexDirection: "column",
  },
  peerName: {
    fontWeight: 600,
    color: "#f4f4f5",
    fontSize: "11px",
  },
  peerLoc: {
    color: "#71717a",
    fontSize: "10px",
    fontFamily: "monospace",
  },
  leaveBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    backgroundColor: "rgba(248, 113, 113, 0.12)",
    border: "1px solid rgba(248, 113, 113, 0.3)",
    borderRadius: "4px",
    color: "#f87171",
    padding: "6px 12px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: "8px",
  },
};
