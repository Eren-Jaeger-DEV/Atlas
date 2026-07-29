import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

export interface ContextMenuItem {
  label?: string;
  icon?: React.ReactNode;
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
    const handleGlobalClick = (e: MouseEvent) => {
      if (e.button === 2) return;
      const target = e.target as HTMLElement;
      if (target && target.closest("#atlas-custom-context-menu")) return;
      hideContextMenu();
    };
    const handleGlobalEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") hideContextMenu();
    };

    if (menu) {
      const timer = setTimeout(() => {
        document.addEventListener("mousedown", handleGlobalClick);
      }, 50);
      document.addEventListener("keydown", handleGlobalEsc);

      return () => {
        clearTimeout(timer);
        document.removeEventListener("mousedown", handleGlobalClick);
        document.removeEventListener("keydown", handleGlobalEsc);
      };
    }
  }, [menu]);

  const itemHeight = 30;
  const menuHeight = menu ? menu.items.length * itemHeight + 16 : 200;
  const menuWidth = 210;

  const topPos = menu ? (menu.y + menuHeight > window.innerHeight ? Math.max(10, window.innerHeight - menuHeight) : Math.max(10, menu.y)) : 10;
  const leftPos = menu ? (menu.x + menuWidth > window.innerWidth ? Math.max(10, window.innerWidth - menuWidth) : Math.max(10, menu.x)) : 10;

  return (
    <ContextMenuContext.Provider value={{ showContextMenu, hideContextMenu }}>
      {children}
      {createPortal(
        <AnimatePresence>
          {menu && (
            <motion.div
              key="atlas-custom-context-menu"
              id="atlas-custom-context-menu"
              initial={{ opacity: 0, scale: 0.94, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -4 }}
              transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: "fixed",
                top: `${topPos}px`,
                left: `${leftPos}px`,
                width: `${menuWidth}px`,
                backgroundColor: "rgba(18, 18, 22, 0.96)",
                backdropFilter: "blur(20px) saturate(1.5)",
                WebkitBackdropFilter: "blur(20px) saturate(1.5)",
                border: "1px solid #3f3f46",
                borderRadius: "8px",
                boxShadow: "0 12px 32px rgba(0, 0, 0, 0.85)",
                zIndex: 99999999,
                padding: "5px",
                fontFamily: "var(--font-ui, system-ui, sans-serif)",
                color: "#fafafa",
                pointerEvents: "auto"
              }}
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
            >
              {menu.items.map((item, idx) => {
                if (item.separator) {
                  return <div key={idx} style={{ height: "1px", backgroundColor: "var(--border-subtle, #27272a)", margin: "4px 0" }} />;
                }
                return (
                  <div
                    key={idx}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      color: item.disabled ? "var(--text-faint, #52525b)" : "var(--text-main, #fafafa)",
                      cursor: item.disabled ? "default" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      opacity: item.disabled ? 0.5 : 1,
                      transition: "all 0.1s ease"
                    }}
                    onMouseOver={(e) => {
                      if (!item.disabled) {
                        e.currentTarget.style.backgroundColor = "var(--bg-hover-strong, rgba(255,255,255,0.08))";
                        e.currentTarget.style.color = "var(--accent, #38bdf8)";
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!item.disabled) {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "var(--text-main, #fafafa)";
                      }
                    }}
                    onClick={() => {
                      if (!item.disabled && item.onClick) {
                        item.onClick();
                        hideContextMenu();
                      }
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {item.icon && <span style={{ display: "flex", alignItems: "center", color: "inherit" }}>{item.icon}</span>}
                      <span>{item.label}</span>
                    </div>
                    {item.shortcut && (
                      <span style={{
                        opacity: 0.6,
                        fontSize: "10px",
                        fontFamily: "var(--font-mono)",
                        backgroundColor: "rgba(255,255,255,0.06)",
                        padding: "1px 5px",
                        borderRadius: "3px",
                        border: "1px solid rgba(255,255,255,0.1)"
                      }}>
                        {item.shortcut}
                      </span>
                    )}
                    {item.items && <span style={{ opacity: 0.6, fontSize: "10px" }}>▶</span>}
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </ContextMenuContext.Provider>
  );
}
