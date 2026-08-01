import { useState, useRef, useEffect, useCallback } from "react";

const api = () => window.atlasAPI;

export interface EditorTab {
  filePath: string;
  isDirty?: boolean;
  content: string;
  language: string;
  targetLine?: number;
  targetColumn?: number;
  isBinary?: boolean;
  tabType?: "file" | "extension-detail" | "settings" | "plugin-viewer";
  usePluginViewer?: boolean;
  extensionData?: any;
}

export function useWorkspaceTabs() {
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(() => localStorage.getItem("atlas_auto_save") === "true");
  const untitledCounterRef = useRef(1);

  const activeTab = tabs[activeTabIndex];

  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  useEffect(() => {
    localStorage.setItem("atlas_auto_save", String(autoSaveEnabled));
    if (!autoSaveEnabled) return;
    const timer = setInterval(() => {
      tabsRef.current.forEach((tab) => {
        if (tab.isDirty && tab.filePath && !tab.filePath.startsWith("Untitled") && tab.tabType !== "extension-detail") {
          api()
            ?.writeFile(tab.filePath, tab.content)
            .then(() => {
              setTabs((prev) => prev.map((t) => (t.filePath === tab.filePath ? { ...t, isDirty: false } : t)));
            })
            .catch(() => {});
        }
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [autoSaveEnabled]);

  const handleSave = useCallback(async () => {
    if (!activeTab || !activeTab.isDirty || activeTab.tabType === "extension-detail") return;
    try {
      if (activeTab.filePath.startsWith("Untitled")) {
        const target = await api()?.saveFileAsDialog?.(activeTab.filePath);
        if (target) {
          await api()?.writeFile(target, activeTab.content);
          setTabs((prev) => prev.map((t, idx) => (idx === activeTabIndex ? { ...t, filePath: target, isDirty: false } : t)));
        }
      } else {
        await api()?.writeFile(activeTab.filePath, activeTab.content);
        setTabs((prev) => prev.map((t, idx) => (idx === activeTabIndex ? { ...t, isDirty: false } : t)));
      }
    } catch (err) {
      console.error("Failed to save file:", err);
    }
  }, [activeTab, activeTabIndex]);

  const handleCloseTab = useCallback((index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTabs((prev) => {
      const closedTab = prev[index];
      if (closedTab?.filePath && (window as any).monaco) {
        try {
          const monaco = (window as any).monaco;
          const uri = monaco.Uri.file(closedTab.filePath);
          const model = monaco.editor.getModel(uri);
          if (model) model.dispose();
        } catch {}
      }
      const next = prev.filter((_, i) => i !== index);
      if (activeTabIndex >= next.length) {
        setActiveTabIndex(Math.max(0, next.length - 1));
      }
      return next;
    });
  }, [activeTabIndex]);

  const handleOpenFile = useCallback(async (filePath: string, line?: number, col?: number) => {
    try {
      const content = await api()?.readFile(filePath);
      const isBinary = content === undefined || content.includes("\0");
      setTabs((prev) => {
        const existingIdx = prev.findIndex((t) => t.filePath === filePath);
        if (existingIdx !== -1) {
          setActiveTabIndex(existingIdx);
          if (line !== undefined) {
            const next = [...prev];
            next[existingIdx] = { ...next[existingIdx]!, targetLine: line, targetColumn: col };
            return next;
          }
          return prev;
        }
        const lang = filePath.split(".").pop() || "plaintext";
        const newTab: EditorTab = {
          filePath,
          content: content || "",
          language: lang,
          isDirty: false,
          targetLine: line,
          targetColumn: col,
          isBinary,
          tabType: "file"
        };
        const next = [...prev, newTab];
        setActiveTabIndex(next.length - 1);
        return next;
      });
    } catch (err) {
      console.error("Failed to open file:", err);
    }
  }, []);

  const handleOpenExtensionDetail = useCallback((extensionData: any) => {
    const extId = extensionData.id || extensionData.name || "atlascord";
    const tabKey = `Extension: ${extensionData.name || "Atlascord"}`;

    setTabs((prev) => {
      const existingIdx = prev.findIndex((t) => t.filePath === tabKey);
      if (existingIdx !== -1) {
        setActiveTabIndex(existingIdx);
        return prev;
      }
      const newTab: EditorTab = {
        filePath: tabKey,
        content: "",
        language: "markdown",
        isDirty: false,
        tabType: "extension-detail",
        extensionData
      };
      const next = [...prev, newTab];
      setActiveTabIndex(next.length - 1);
      return next;
    });
  }, []);

  const handleCreateNewTextFile = useCallback(() => {
    const filename = `Untitled-${untitledCounterRef.current}.txt`;
    untitledCounterRef.current += 1;
    const newTab: EditorTab = {
      filePath: filename,
      content: "",
      language: "plaintext",
      isDirty: true,
      tabType: "file"
    };
    setTabs((prev) => {
      const next = [...prev, newTab];
      setActiveTabIndex(next.length - 1);
      return next;
    });
  }, []);

  return {
    tabs,
    setTabs,
    activeTabIndex,
    setActiveTabIndex,
    activeTab,
    autoSaveEnabled,
    setAutoSaveEnabled,
    untitledCounterRef,
    handleSave,
    handleCloseTab,
    handleOpenFile,
    handleOpenExtensionDetail,
    handleCreateNewTextFile
  };
}
