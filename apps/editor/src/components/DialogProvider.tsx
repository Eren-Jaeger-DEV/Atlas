import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from "react";
import { createPortal } from "react-dom";

export type DialogType = "info" | "warning" | "error" | "question";

export interface DialogButton {
  label: string;
  onClick: (inputValue?: string) => void;
  primary?: boolean;
}

export interface DialogOptions {
  title: string;
  message: ReactNode;
  type?: DialogType;
  buttons?: DialogButton[];
  onDismiss?: () => void;
  /** If true, a text input is rendered in the dialog */
  input?: boolean;
  /** Default value for the input */
  inputDefault?: string;
  /** Callback invoked with the input value when a primary button is clicked */
  onInput?: (value: string | null) => void;
}

interface DialogContextValue {
  showDialog: (options: DialogOptions) => void;
  hideDialog: () => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within DialogProvider");
  return ctx;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogOptions | null>(null);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (dialog?.input) {
      setInputValue(dialog.inputDefault ?? "");
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [dialog]);

  const showDialog = (options: DialogOptions) => {
    setDialog(options);
  };

  const hideDialog = () => {
    if (dialog?.onDismiss) dialog.onDismiss();
    setDialog(null);
  };

  const handleButtonClick = (btn: DialogButton) => {
    if (dialog?.input) {
      if (btn.primary) dialog.onInput?.(inputValue);
      btn.onClick(inputValue);
    } else {
      btn.onClick();
    }
    setDialog(null);
  };

  const handleOk = () => {
    if (dialog?.input) dialog.onInput?.(inputValue);
    setDialog(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleOk();
    if (e.key === "Escape") { dialog?.onInput?.(null); hideDialog(); }
  };

  const iconColor: Record<string, string> = { error: "#f87171", warning: "#fbbf24", info: "#38bdf8", question: "#a78bfa" };
  const iconLabel: Record<string, string> = { error: "[ERROR]", warning: "[WARN]", info: "[INFO]", question: "[?]" };

  return (
    <DialogContext.Provider value={{ showDialog, hideDialog }}>
      {children}
      {dialog && createPortal(
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.55)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 99999, fontFamily: "system-ui, sans-serif"
        }}>
          <div style={{
            backgroundColor: "var(--bg-main, #18181b)",
            border: "1px solid var(--border-color, #27272a)",
            borderRadius: "8px", width: "420px", maxWidth: "90vw",
            boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
            display: "flex", flexDirection: "column", overflow: "hidden"
          }}>
            {/* Header */}
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-color, #27272a)", display: "flex", alignItems: "center", gap: "8px" }}>
              {dialog.type && (
                <span style={{ color: iconColor[dialog.type], fontSize: "12px", fontWeight: 700, fontFamily: "monospace" }}>
                  {iconLabel[dialog.type]}
                </span>
              )}
              <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--text-main, #e4e4e7)" }}>
                {dialog.title}
              </h2>
            </div>

            {/* Body */}
            <div style={{ padding: "16px", fontSize: "13px", color: "var(--text-secondary, #a1a1aa)", lineHeight: 1.6 }}>
              {dialog.message}
              {dialog.input && (
                <input
                  ref={inputRef}
                  style={{
                    display: "block", width: "100%", marginTop: "12px", boxSizing: "border-box",
                    padding: "8px 10px", backgroundColor: "var(--bg-sidebar, #09090b)",
                    border: "1px solid var(--accent, #38bdf8)", borderRadius: "4px",
                    color: "var(--text-main, #e4e4e7)", fontSize: "13px", outline: "none"
                  }}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 16px", backgroundColor: "var(--bg-sidebar, #09090b)", borderTop: "1px solid var(--border-color, #27272a)", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              {dialog.buttons ? (
                dialog.buttons.map((btn, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleButtonClick(btn)}
                    style={{
                      padding: "6px 16px", borderRadius: "4px", border: "none",
                      fontSize: "12px", fontWeight: 500, cursor: "pointer",
                      backgroundColor: btn.primary ? "var(--accent, #3b82f6)" : "var(--bg-hover, #27272a)",
                      color: btn.primary ? "#ffffff" : "var(--text-main, #e4e4e7)",
                    }}
                  >
                    {btn.label}
                  </button>
                ))
              ) : (
                <button
                  onClick={handleOk}
                  style={{ padding: "6px 16px", borderRadius: "4px", border: "none", fontSize: "12px", fontWeight: 500, cursor: "pointer", backgroundColor: "var(--accent, #3b82f6)", color: "#ffffff" }}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </DialogContext.Provider>
  );
}
