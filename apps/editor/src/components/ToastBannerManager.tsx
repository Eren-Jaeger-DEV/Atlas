import React, { useState } from "react";

export type ToastSeverity = "info" | "success" | "warning" | "error";

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  severity: ToastSeverity;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastBannerManagerProps {
  toasts?: ToastNotification[];
  onDismiss?: (id: string) => void;
}

export function ToastBannerManager({ toasts: initialToasts = [], onDismiss }: ToastBannerManagerProps) {
  const [toasts, setToasts] = useState<ToastNotification[]>(initialToasts);

  const handleDismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    onDismiss?.(id);
  };

  return (
    <div style={styles.toastStack}>
      {toasts.map((toast) => {
        const severityColor =
          toast.severity === "success"
            ? "#34d399"
            : toast.severity === "warning"
            ? "#fbbf24"
            : toast.severity === "error"
            ? "#f87171"
            : "var(--accent, #38bdf8)";

        return (
          <div key={toast.id} style={{ ...styles.toastCard, borderLeft: `3px solid ${severityColor}` }}>
            <div style={styles.toastHeader}>
              <span style={{ ...styles.toastTitle, color: severityColor }}>{toast.title}</span>
              <button style={styles.closeBtn} onClick={() => handleDismiss(toast.id)}>
                ✕
              </button>
            </div>
            <div style={styles.toastMessage}>{toast.message}</div>
            {toast.actionLabel && (
              <button
                style={{ ...styles.actionBtn, borderColor: severityColor, color: severityColor }}
                onClick={toast.onAction}
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  toastStack: {
    position: "fixed",
    bottom: "28px",
    right: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    zIndex: 9999,
    maxWidth: "340px",
    fontFamily: "var(--font-sans, system-ui)",
  },
  toastCard: {
    backgroundColor: "var(--bg-glass-strong, rgba(14, 14, 18, 0.92))",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid var(--border-strong, #27272a)",
    borderRadius: "var(--radius-md, 8px)",
    padding: "10px 12px",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
  },
  toastHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  },
  toastTitle: {
    fontSize: "12px",
    fontWeight: 700,
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted, #a1a1aa)",
    fontSize: "11px",
    cursor: "pointer",
  },
  toastMessage: {
    fontSize: "11px",
    color: "var(--text-main, #fafafa)",
    lineHeight: "1.4",
  },
  actionBtn: {
    marginTop: "8px",
    backgroundColor: "transparent",
    border: "1px solid",
    borderRadius: "4px",
    padding: "2px 8px",
    fontSize: "10px",
    fontWeight: 600,
    cursor: "pointer",
  },
};
