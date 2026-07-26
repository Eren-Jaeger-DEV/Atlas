import React, { useState } from "react";

export type ProfileType = "Personal" | "Enterprise" | "Open Source" | "Research";

export interface WorkspaceProfileItem {
  id: ProfileType;
  name: string;
  description: string;
  theme: string;
  memoryScope: string;
}

interface WorkspaceProfileSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProfile?: (profile: ProfileType) => void;
}

export function WorkspaceProfileSwitcher({ isOpen, onClose, onSelectProfile }: WorkspaceProfileSwitcherProps) {
  const [activeProfile, setActiveProfile] = useState<ProfileType>("Personal");

  const profiles: WorkspaceProfileItem[] = [
    {
      id: "Personal",
      name: "Personal Workspace",
      description: "Standard local development profile with default keybindings and dark theme.",
      theme: "Synthwave / Dark Glass",
      memoryScope: "User & Session",
    },
    {
      id: "Enterprise",
      name: "Enterprise Production",
      description: "Strict OS kernel sandboxing, untrusted workspace policy, and audit logging.",
      theme: "Nordic Glass",
      memoryScope: "Repo & Enterprise",
    },
    {
      id: "Open Source",
      name: "Open Source Contributor",
      description: "Auto-runs linter checks, shields secret credentials, and enables PR workflows.",
      theme: "Tokyo Night",
      memoryScope: "Session Only",
    },
    {
      id: "Research",
      name: "AI & ML Research",
      description: "Jupyter Notebook cell rendering enabled, multi-region LLM failover active.",
      theme: "Abyss Dark",
      memoryScope: "User & Repo",
    },
  ];

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #38bdf8)" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span style={styles.title}>SWITCH WORKSPACE PROFILE</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.profileList}>
          {profiles.map((p) => {
            const isSelected = p.id === activeProfile;
            return (
              <div
                key={p.id}
                style={isSelected ? styles.cardSelected : styles.card}
                onClick={() => {
                  setActiveProfile(p.id);
                  onSelectProfile?.(p.id);
                  onClose();
                }}
              >
                <div style={styles.cardHeader}>
                  <span style={styles.profileName}>{p.name}</span>
                  {isSelected && <span style={styles.activeTag}>ACTIVE</span>}
                </div>
                <div style={styles.profileDesc}>{p.description}</div>
                <div style={styles.metaRow}>
                  <span style={styles.metaBadge}>Theme: {p.theme}</span>
                  <span style={styles.metaBadge}>Memory: {p.memoryScope}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    zIndex: 9999,
    display: "flex",
    justifyContent: "center",
    paddingTop: "90px",
  },
  modal: {
    width: "540px",
    backgroundColor: "var(--bg-glass-strong, rgba(14, 14, 18, 0.95))",
    border: "1px solid var(--border-strong, #27272a)",
    borderRadius: "var(--radius-lg, 12px)",
    overflow: "hidden",
    fontFamily: "var(--font-sans, system-ui)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 14px",
    backgroundColor: "var(--bg-panel, #18181b)",
    borderBottom: "1px solid var(--border-subtle, #27272a)",
  },
  title: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--accent, #38bdf8)",
    letterSpacing: "0.8px",
  },
  closeBtn: {
    marginLeft: "auto",
    background: "none",
    border: "none",
    color: "var(--text-muted, #a1a1aa)",
    fontSize: "12px",
    cursor: "pointer",
  },
  profileList: {
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  card: {
    backgroundColor: "var(--bg-panel, #18181b)",
    border: "1px solid var(--border-subtle, #27272a)",
    borderRadius: "6px",
    padding: "10px",
    cursor: "pointer",
  },
  cardSelected: {
    backgroundColor: "var(--bg-panel, #18181b)",
    border: "1px solid var(--accent, #38bdf8)",
    borderRadius: "6px",
    padding: "10px",
    cursor: "pointer",
    boxShadow: "0 0 12px rgba(56, 189, 248, 0.2)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  },
  profileName: {
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--text-main, #fafafa)",
  },
  activeTag: {
    fontSize: "9px",
    fontWeight: 700,
    color: "#09090b",
    backgroundColor: "var(--accent, #38bdf8)",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  profileDesc: {
    fontSize: "11px",
    color: "var(--text-muted, #a1a1aa)",
    marginBottom: "6px",
  },
  metaRow: {
    display: "flex",
    gap: "6px",
  },
  metaBadge: {
    fontSize: "9px",
    color: "var(--text-muted, #a1a1aa)",
    backgroundColor: "var(--bg-base, #09090b)",
    padding: "2px 6px",
    borderRadius: "4px",
  },
};
