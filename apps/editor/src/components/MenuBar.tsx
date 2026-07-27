import React, { useState, useRef, useEffect } from "react";
import { Tooltip } from "./Tooltip.js";

const SearchIcon = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
  disabled?: boolean;
  checked?: boolean;
  submenu?: MenuItem[];
}

export interface MenuBarProps {
  menus: Record<string, MenuItem[]>;
  wname: string;
  isSplit: boolean;
  setIsSplit: React.Dispatch<React.SetStateAction<boolean>>;
  activeSidebar: string | null;
  setActiveSidebar: (view: any) => void;
  activeTabIndex: number;
  setActiveTabIndex: (idx: number) => void;
  tabsCount: number;
  showBottomPanel: boolean;
  setShowBottomPanel: React.Dispatch<React.SetStateAction<boolean>>;
  showRightAiSidebar: boolean;
  setShowRightAiSidebar: React.Dispatch<React.SetStateAction<boolean>>;
  onShowCommandPalette: () => void;
  onOpenSettings: () => void;
  api: () => any;
  logoImg: string;
}

export function MenuBar({
  menus,
  wname,
  isSplit,
  setIsSplit,
  activeSidebar,
  setActiveSidebar,
  activeTabIndex,
  setActiveTabIndex,
  tabsCount,
  showBottomPanel,
  setShowBottomPanel,
  showRightAiSidebar,
  setShowRightAiSidebar,
  onShowCommandPalette,
  onOpenSettings,
  api,
  logoImg
}: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [submenuOpen, setSubmenuOpen] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
        setSubmenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const nodrag: React.CSSProperties = { WebkitAppRegion: "no-drag" } as any;

  const s = {
    titlebar: {
      height: "35px",
      backgroundColor: "var(--bg-titlebar, #0d0d11)",
      borderBottom: "1px solid var(--border-subtle, #1e1e24)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 10px",
      fontSize: "12px",
      color: "var(--text-muted, #a1a1aa)",
      userSelect: "none",
      WebkitAppRegion: "drag",
      flexShrink: 0,
      zIndex: 1000
    } as React.CSSProperties,
    tbLeft: { display: "flex", alignItems: "center", gap: "2px" },
    logo: { width: "16px", height: "16px", marginRight: "6px" },
    menuWrapper: { position: "relative" } as React.CSSProperties,
    menuItem: {
      backgroundColor: "transparent",
      border: "none",
      color: "var(--text-muted, #a1a1aa)",
      padding: "4px 8px",
      borderRadius: "4px",
      fontSize: "12px",
      cursor: "pointer"
    },
    menuItemOn: {
      backgroundColor: "var(--bg-hover-strong, rgba(255,255,255,0.08))",
      color: "var(--text-main, #fafafa)"
    },
    dropdown: {
      position: "absolute",
      left: 0,
      top: "100%",
      marginTop: "2px",
      backgroundColor: "var(--bg-glass-strong, rgba(14, 14, 18, 0.98))",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: "1px solid var(--border-strong, #27272a)",
      borderRadius: "6px",
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
      padding: "4px",
      minWidth: "210px",
      zIndex: 100000
    } as React.CSSProperties,
    dropItem: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "5px 10px",
      borderRadius: "4px",
      fontSize: "12px",
      color: "var(--text-main, #fafafa)",
      backgroundColor: "transparent",
      border: "none",
      cursor: "pointer"
    },
    dropDisabled: { opacity: 0.4, cursor: "default" },
    dropShortcut: {
      opacity: 0.5,
      fontSize: "10px",
      fontFamily: "var(--font-mono)",
      marginLeft: "12px"
    },
    dropSep: {
      height: "1px",
      backgroundColor: "var(--border-subtle, #27272a)",
      margin: "4px 0"
    },
    tbCenter: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      backgroundColor: "var(--bg-input, #18181c)",
      border: "1px solid var(--border-subtle, #27272a)",
      borderRadius: "6px",
      padding: "3px 12px",
      fontSize: "11px",
      color: "var(--text-muted, #a1a1aa)"
    },
    centerTxt: { maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } as React.CSSProperties,
    tbRight: { display: "flex", alignItems: "center", gap: "4px" },
    iconBtn: {
      backgroundColor: "transparent",
      border: "none",
      color: "var(--text-muted, #a1a1aa)",
      cursor: "pointer",
      padding: "4px 6px",
      borderRadius: "4px",
      display: "flex",
      alignItems: "center"
    },
    iconOn: { color: "var(--accent, #38bdf8)" },
    winSep: { width: "1px", height: "14px", backgroundColor: "var(--border-subtle, #27272a)", margin: "0 4px" },
    wc: {
      backgroundColor: "transparent",
      border: "none",
      color: "var(--text-muted, #a1a1aa)",
      cursor: "pointer",
      padding: "4px 8px",
      borderRadius: "4px",
      display: "flex",
      alignItems: "center"
    },
    wcClose: { color: "#f43f5e" }
  };

  return (
    <header style={s.titlebar}>
      <div ref={menuRef} style={{ ...s.tbLeft, ...nodrag }}>
        <img src={logoImg} alt="Atlas" style={s.logo} />
        {Object.keys(menus).map((name) => (
          <div key={name} style={s.menuWrapper}>
            <button
              className="menu-btn"
              style={{ ...s.menuItem, ...(openMenu === name ? s.menuItemOn : {}) }}
              onClick={() => setOpenMenu(openMenu === name ? null : name)}
              onMouseEnter={() => {
                if (openMenu && openMenu !== name) setOpenMenu(name);
              }}
            >
              {name}
            </button>
            {openMenu === name && (
              <div style={s.dropdown}>
                {menus[name]!.map((item, i) =>
                  item.separator ? (
                    <div key={i} style={s.dropSep} />
                  ) : (
                    <div
                      key={i}
                      style={{ position: "relative" }}
                      onMouseEnter={() => setSubmenuOpen(item.submenu ? i : null)}
                    >
                      <button
                        className="drop-item"
                        style={{ ...s.dropItem, ...(item.disabled ? s.dropDisabled : {}) }}
                        disabled={item.disabled}
                        onClick={() => {
                          if (!item.submenu) {
                            item.action?.();
                            setOpenMenu(null);
                            setSubmenuOpen(null);
                          }
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {item.checked !== undefined ? (
                            <span style={{ width: "12px", display: "inline-block", color: "#38bdf8", fontWeight: "bold", fontSize: "11px" }}>
                              {item.checked ? "✓" : ""}
                            </span>
                          ) : null}
                          <span>{item.label}</span>
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {item.shortcut && <span style={s.dropShortcut}>{item.shortcut}</span>}
                          {item.submenu && <span style={{ opacity: 0.6, fontSize: "9px" }}>▶</span>}
                        </div>
                      </button>

                      {/* Nested Submenu Dropdown */}
                      {item.submenu && submenuOpen === i && (
                        <div
                          style={{
                            position: "absolute",
                            left: "100%",
                            top: "0",
                            marginTop: "-4px",
                            marginLeft: "2px",
                            backgroundColor: "var(--bg-glass-strong, rgba(14, 14, 18, 0.98))",
                            backdropFilter: "blur(20px)",
                            border: "1px solid var(--border-strong, #27272a)",
                            borderRadius: "6px",
                            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                            padding: "4px",
                            minWidth: "190px",
                            zIndex: 100000
                          }}
                          onMouseLeave={() => setSubmenuOpen(null)}
                        >
                          {item.submenu.map((sub, j) =>
                            sub.separator ? (
                              <div key={j} style={s.dropSep} />
                            ) : (
                              <button
                                key={j}
                                className="drop-item"
                                style={{ ...s.dropItem, ...(sub.disabled ? s.dropDisabled : {}) }}
                                disabled={sub.disabled}
                                onClick={() => {
                                  sub.action?.();
                                  setSubmenuOpen(null);
                                  setOpenMenu(null);
                                }}
                              >
                                <span>{sub.label}</span>
                                {sub.shortcut && <span style={s.dropShortcut}>{sub.shortcut}</span>}
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ ...s.tbCenter, cursor: "pointer" }} onClick={onShowCommandPalette} className="hover-scale">
        <SearchIcon size={12} color="var(--text-faint)" />
        <span style={s.centerTxt}>{wname}</span>
      </div>

      <div style={{ ...s.tbRight, ...nodrag }}>
        <Tooltip content="Search (Ctrl+K)" position="bottom">
          <button style={s.iconBtn} onClick={onShowCommandPalette}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          </button>
        </Tooltip>
        <Tooltip content="Toggle Split Editor (Ctrl+\)" position="bottom">
          <button style={{ ...s.iconBtn, ...(isSplit ? s.iconOn : {}) }} onClick={() => setIsSplit(p => !p)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="1.5" /><line x1="12" y1="3" x2="12" y2="21" /></svg>
          </button>
        </Tooltip>
        <Tooltip content="Toggle Explorer" position="bottom">
          <button style={s.iconBtn} onClick={() => setActiveSidebar("explorer")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="1.5" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
          </button>
        </Tooltip>
        <Tooltip content="Toggle Terminal" position="bottom">
          <button style={{ ...s.iconBtn, ...(showBottomPanel ? s.iconOn : {}) }} onClick={() => setShowBottomPanel(p => !p)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="1.5" /><line x1="3" y1="16" x2="21" y2="16" /></svg>
          </button>
        </Tooltip>
        <Tooltip content="Toggle AI Chat (Ctrl+L)" position="bottom">
          <button style={{ ...s.iconBtn, ...(showRightAiSidebar ? s.iconOn : {}) }} onClick={() => setShowRightAiSidebar(p => !p)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" /><line x1="15" y1="3" x2="15" y2="21" /></svg>
          </button>
        </Tooltip>
        <Tooltip content="Settings (Ctrl+,)" position="bottom">
          <button style={s.iconBtn} onClick={onOpenSettings}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-2.82-1.17l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 2.82 1.17l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 2z" /></svg>
          </button>
        </Tooltip>
        <div style={s.winSep} />
        <Tooltip content="Minimize" position="bottom">
          <button style={s.wc} onClick={() => api()?.windowMinimize()}>
            <svg width="10" height="1" viewBox="0 0 10 1"><line x1="0" y1="0.5" x2="10" y2="0.5" stroke="currentColor" strokeWidth="1.5" /></svg>
          </button>
        </Tooltip>
        <Tooltip content="Maximize" position="bottom">
          <button style={s.wc} onClick={() => api()?.windowMaximize()}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="0.75" y="0.75" width="8.5" height="8.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" /></svg>
          </button>
        </Tooltip>
        <Tooltip content="Close" position="bottom">
          <button style={{ ...s.wc, ...s.wcClose }} onClick={() => api()?.windowClose()}>
            <svg width="10" height="10" viewBox="0 0 10 10"><line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" /><line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.5" /></svg>
          </button>
        </Tooltip>
      </div>
    </header>
  );
}
