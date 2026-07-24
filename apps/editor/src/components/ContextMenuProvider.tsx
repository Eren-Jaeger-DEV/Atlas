import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createPortal } from "react-dom";

export interface ContextMenuItem {
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
  separator?: boolean;
  shortcut?: string;
  items?: ContextMenuItem[];
}

export interface ContextMenuOptions {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

interface ContextMenuContextValue {
  showContextMenu: (options: ContextMenuOptions) => void;
  hideContextMenu: () => void;
}

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null);

export function useContextMenu() {
  const ctx = useContext(ContextMenuContext);
  if (!ctx) throw new Error("useContextMenu must be used within ContextMenuProvider");
  return ctx;
}

export function ContextMenuProvider({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState<ContextMenuOptions | null>(null);

  const showContextMenu = (options: ContextMenuOptions) => {
    setMenu(options);
  };

  const hideContextMenu = () => {
    setMenu(null);
  };

  useEffect(() => {
    const handleGlobalClick = () => hideContextMenu();
    const handleGlobalEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") hideContextMenu();
    };

    if (menu) {
      document.addEventListener("click", handleGlobalClick);
      document.addEventListener("contextmenu", handleGlobalClick);
      document.addEventListener("keydown", handleGlobalEsc);
    }
    return () => {
      document.removeEventListener("click", handleGlobalClick);
      document.removeEventListener("contextmenu", handleGlobalClick);
      document.removeEventListener("keydown", handleGlobalEsc);
    };
  }, [menu]);

  return (
    <ContextMenuContext.Provider value={{ showContextMenu, hideContextMenu }}>
      {children}
      {menu && createPortal(
        <div
          className="anim-scale-in"
          style={{
            position: "fixed",
            top: Math.min(menu.y, window.innerHeight - (menu.items.length * 30)),
            left: Math.min(menu.x, window.innerWidth - 200),
            width: "200px",
            backgroundColor: "rgba(24, 24, 27, 0.7)",
            backdropFilter: "blur(12px) saturate(1.5)",
            WebkitBackdropFilter: "blur(12px) saturate(1.5)",
            border: "1px solid var(--border-medium)",
            borderRadius: "6px",
            boxShadow: "var(--shadow-lg), var(--shadow-panel)",
            zIndex: 999999,
            padding: "4px 0",
            fontFamily: "var(--font-ui)"
          }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          {menu.items.map((item, idx) => {
            if (item.separator) {
              return <div key={idx} style={{ height: "1px", backgroundColor: "var(--border-subtle)", margin: "4px 0" }} />;
            }
            return (
              <div
                key={idx}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  color: item.disabled ? "var(--text-faint)" : "var(--text-main)",
                  cursor: item.disabled ? "default" : "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  opacity: item.disabled ? 0.6 : 1,
                  transition: "background-color 0.1s"
                }}
                onMouseOver={(e) => {
                  if (!item.disabled) e.currentTarget.style.backgroundColor = "var(--accent)";
                }}
                onMouseOut={(e) => {
                  if (!item.disabled) e.currentTarget.style.backgroundColor = "transparent";
                }}
                onClick={() => {
                  if (!item.disabled && item.onClick) {
                    item.onClick();
                    hideContextMenu();
                  }
                }}
              >
                <span>{item.label}</span>
                {item.shortcut && <span style={{ opacity: 0.7, fontSize: "11px", fontFamily: "var(--font-mono)" }}>{item.shortcut}</span>}
                {item.items && <span style={{ opacity: 0.7, fontSize: "11px" }}>▶</span>}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </ContextMenuContext.Provider>
  );
}
