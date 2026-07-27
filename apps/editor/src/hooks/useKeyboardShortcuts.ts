import { useEffect } from "react";

export interface KeybindingHandlers {
  onSave: () => void;
  onOpenFolder: () => void;
  onCommandPalette: () => void;
  onInlineAi: () => void;
  onSplitEditor: () => void;
  onExplorer: () => void;
  onSearch: () => void;
  onGit: () => void;
  onExtensions: () => void;
  onToggleTerminal: () => void;
  onToggleAiSidebar: () => void;
  onDebug: () => void;
  onEscape: () => void;
}

export function useKeyboardShortcuts(handlers: KeybindingHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (isCtrl && key === "s" && !e.shiftKey) {
        e.preventDefault();
        handlers.onSave();
      } else if (isCtrl && key === "o") {
        e.preventDefault();
        handlers.onOpenFolder();
      } else if (isCtrl && e.shiftKey && key === "p") {
        e.preventDefault();
        handlers.onCommandPalette();
      } else if (isCtrl && key === "i") {
        e.preventDefault();
        handlers.onInlineAi();
      } else if (isCtrl && key === "\\") {
        e.preventDefault();
        handlers.onSplitEditor();
      } else if (isCtrl && e.shiftKey && key === "e") {
        e.preventDefault();
        handlers.onExplorer();
      } else if (isCtrl && e.shiftKey && key === "f") {
        e.preventDefault();
        handlers.onSearch();
      } else if (isCtrl && e.shiftKey && key === "g") {
        e.preventDefault();
        handlers.onGit();
      } else if (isCtrl && e.shiftKey && key === "x") {
        e.preventDefault();
        handlers.onExtensions();
      } else if (isCtrl && key === "`") {
        e.preventDefault();
        handlers.onToggleTerminal();
      } else if (isCtrl && key === "l") {
        e.preventDefault();
        handlers.onToggleAiSidebar();
      } else if (key === "f5") {
        e.preventDefault();
        handlers.onDebug();
      } else if (e.key === "Escape") {
        handlers.onEscape();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlers]);
}
