import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { createPortal } from "react-dom";

export interface QuickPickItem {
  id: string;
  label: string;
  description?: string;
  detail?: string;
  alwaysShow?: boolean;
}

interface QuickInputState {
  type: "quickpick" | "inputbox";
  placeholder?: string;
  prompt?: string;
  password?: boolean;
  items?: QuickPickItem[];
  resolveQuickPick?: (value: QuickPickItem | undefined) => void;
  resolveInput?: (value: string | undefined) => void;
}

interface QuickInputContextValue {
  showQuickPick: (items: QuickPickItem[], options?: { placeholder?: string }) => Promise<QuickPickItem | undefined>;
  showInputBox: (options?: { prompt?: string, placeholder?: string, password?: boolean }) => Promise<string | undefined>;
}

const QuickInputContext = createContext<QuickInputContextValue | null>(null);

export function useQuickInput() {
  const ctx = useContext(QuickInputContext);
  if (!ctx) throw new Error("useQuickInput must be used within QuickInputProvider");
  return ctx;
}

export function QuickInputProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<QuickInputState | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const showQuickPick = (items: QuickPickItem[], options?: { placeholder?: string }) => {
    return new Promise<QuickPickItem | undefined>((resolve) => {
      setInputValue("");
      setSelectedIndex(0);
      setState({
        type: "quickpick",
        items,
        placeholder: options?.placeholder,
        resolveQuickPick: resolve
      });
    });
  };

  const showInputBox = (options?: { prompt?: string, placeholder?: string, password?: boolean }) => {
    return new Promise<string | undefined>((resolve) => {
      setInputValue("");
      setState({
        type: "inputbox",
        prompt: options?.prompt,
        placeholder: options?.placeholder,
        password: options?.password,
        resolveInput: resolve
      });
    });
  };

  const close = () => {
    if (state?.resolveQuickPick) state.resolveQuickPick(undefined);
    if (state?.resolveInput) state.resolveInput(undefined);
    setState(null);
  };

  useEffect(() => {
    if (state && inputRef.current) {
      inputRef.current.focus();
    }
  }, [state]);

  const filteredItems = state?.type === "quickpick" && state.items
    ? state.items.filter(item => 
        item.alwaysShow || 
        item.label.toLowerCase().includes(inputValue.toLowerCase()) || 
        item.description?.toLowerCase().includes(inputValue.toLowerCase())
      )
    : [];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      close();
    } else if (state?.type === "quickpick") {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
        listRef.current?.children[selectedIndex + 1]?.scrollIntoView({ block: "nearest" });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
        listRef.current?.children[selectedIndex - 1]?.scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems.length > 0) {
          state.resolveQuickPick!(filteredItems[selectedIndex]);
          setState(null);
        }
      }
    } else if (state?.type === "inputbox") {
      if (e.key === "Enter") {
        e.preventDefault();
        state.resolveInput!(inputValue);
        setState(null);
      }
    }
  };

  return (
    <QuickInputContext.Provider value={{ showQuickPick, showInputBox }}>
      {children}
      {state && createPortal(
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.4)", zIndex: 999998,
          display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: "5vh"
        }} onClick={close}>
          <div style={{
            backgroundColor: "var(--bg-main, #1e1e1e)",
            border: "1px solid var(--border-color, #333333)",
            borderRadius: "6px",
            width: "600px",
            maxWidth: "90vw",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 10px rgba(0,0,0,0.5)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            fontFamily: "system-ui, sans-serif"
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "8px" }}>
              <input
                ref={inputRef}
                type={state.password ? "password" : "text"}
                style={{
                  width: "100%", padding: "10px", backgroundColor: "var(--bg-sidebar, #252526)",
                  border: "1px solid var(--border-color, #3c3c3c)", borderRadius: "4px",
                  color: "var(--text-main, #cccccc)", fontSize: "14px", outline: "none",
                  boxSizing: "border-box"
                }}
                placeholder={state.placeholder}
                value={inputValue}
                onChange={e => {
                  setInputValue(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
              />
              {state.type === "inputbox" && state.prompt && (
                <div style={{ fontSize: "12px", color: "var(--text-secondary, #969696)", marginTop: "8px", paddingLeft: "4px" }}>
                  {state.prompt}
                </div>
              )}
            </div>
            {state.type === "quickpick" && (
              <div ref={listRef} style={{ maxHeight: "40vh", overflowY: "auto", paddingBottom: "4px" }}>
                {filteredItems.length === 0 ? (
                  <div style={{ padding: "12px", fontSize: "13px", color: "var(--text-secondary, #969696)", textAlign: "center" }}>
                    No results found
                  </div>
                ) : (
                  filteredItems.map((item, idx) => (
                    <div
                      key={item.id}
                      style={{
                        padding: "8px 16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                        cursor: "pointer",
                        backgroundColor: idx === selectedIndex ? "var(--accent, #005a9e)" : "transparent",
                        color: idx === selectedIndex ? "#ffffff" : "var(--text-main, #cccccc)"
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => {
                        state.resolveQuickPick!(item);
                        setState(null);
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "13px" }}>{item.label}</span>
                        {item.description && (
                          <span style={{ fontSize: "12px", opacity: 0.7 }}>{item.description}</span>
                        )}
                      </div>
                      {item.detail && (
                        <div style={{ fontSize: "11px", opacity: 0.7 }}>{item.detail}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </QuickInputContext.Provider>
  );
}
