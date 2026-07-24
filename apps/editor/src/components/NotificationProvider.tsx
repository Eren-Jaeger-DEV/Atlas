import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { createPortal } from "react-dom";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

export interface Notification {
  id: string;
  message: ReactNode;
  type?: NotificationType;
  actions?: NotificationAction[];
  duration?: number; // 0 = persistent
}

interface NotificationContextValue {
  showNotification: (notification: Omit<Notification, "id">) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification must be used within NotificationProvider");
  return ctx;
}

const TYPE_CONFIG: Record<NotificationType, { accent: string; bg: string; icon: React.ReactNode }> = {
  info: {
    accent: "#38bdf8",
    bg: "rgba(56,189,248,0.08)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  },
  success: {
    accent: "#22c55e",
    bg: "rgba(34,197,94,0.08)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
  },
  warning: {
    accent: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  error: {
    accent: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    ),
  },
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((notification: Omit<Notification, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotif = { ...notification, id, type: notification.type || "info" };
    setNotifications(prev => [...prev, newNotif]);

    if (notification.duration !== 0) {
      const ms = notification.duration || 4500;
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, ms);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification, removeNotification }}>
      {children}
      {createPortal(
        <div style={{
          position: "fixed",
          bottom: "30px",
          right: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          zIndex: 999999,
          pointerEvents: "none",
          width: "320px",
        }}>
          {notifications.map(n => {
            const cfg = TYPE_CONFIG[n.type || "info"];
            return (
              <div
                key={n.id}
                className="notification-toast"
                style={{
                  backgroundColor: "rgba(14, 14, 18, 0.94)",
                  backdropFilter: "blur(16px) saturate(1.5)",
                  WebkitBackdropFilter: "blur(16px) saturate(1.5)",
                  border: `1px solid rgba(255,255,255,0.07)`,
                  borderLeft: `3px solid ${cfg.accent}`,
                  boxShadow: `0 16px 40px -8px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03), 0 0 12px -4px ${cfg.accent}40`,
                  borderRadius: "10px",
                  padding: "11px 12px",
                  pointerEvents: "auto",
                  fontFamily: "var(--font-ui, Inter, system-ui, sans-serif)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "9px" }}>
                  {cfg.icon}
                  <span style={{
                    fontSize: "12.5px",
                    color: "#e4e4e8",
                    lineHeight: "1.45",
                    flex: 1,
                    wordBreak: "break-word",
                  }}>
                    {n.message}
                  </span>
                  <button
                    onClick={() => removeNotification(n.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#52525b",
                      cursor: "pointer",
                      padding: "1px",
                      display: "flex",
                      alignItems: "center",
                      borderRadius: "3px",
                      flexShrink: 0,
                      transition: "color 0.1s",
                      marginTop: "-1px",
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/>
                    </svg>
                  </button>
                </div>
                {n.actions && n.actions.length > 0 && (
                  <div style={{ display: "flex", gap: "6px" }}>
                    {n.actions.map((act, i) => (
                      <button
                        key={i}
                        onClick={() => { act.onClick(); removeNotification(n.id); }}
                        style={{
                          background: "rgba(255,255,255,0.07)",
                          border: `1px solid ${cfg.accent}40`,
                          color: cfg.accent,
                          padding: "4px 10px",
                          fontSize: "11.5px",
                          fontWeight: 600,
                          borderRadius: "5px",
                          cursor: "pointer",
                          transition: "background 0.12s",
                        }}
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </NotificationContext.Provider>
  );
}
