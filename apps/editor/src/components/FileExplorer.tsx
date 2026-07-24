import { useState, useEffect, useCallback, useRef } from "react";
import { FileIcon } from "./FileIcons.js";

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileItem[];
  isOpen?: boolean;
}

interface ContextMenuState {
  x: number;
  y: number;
  item: FileItem;
}

interface FileExplorerProps {
  workspaceRoots?: string[];
  onOpenFile: (filePath: string) => void;
  onSelectRepo: () => void;
  onAddFolder?: () => void;
  onOpenInTerminal?: (dir: string) => void;
}

export function FileExplorer({ workspaceRoots, onOpenFile, onSelectRepo, onAddFolder, onOpenInTerminal }: FileExplorerProps) {
  const [tree, setTree] = useState<FileItem[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | undefined>();
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const ctxMenuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    if (!ctxMenu) return;
    const handleClick = () => setCtxMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [ctxMenu]);

  const loadDirectory = useCallback(async (dirPath: string): Promise<FileItem[]> => {
    const api = window.atlasAPI;
    if (!api?.readDir) return [];
    const entries = await api.readDir(dirPath);
    return entries.map((e: any) => ({
      name: e.name,
      path: e.path,
      isDirectory: e.isDirectory,
      children: e.isDirectory ? [] : undefined,
      isOpen: false,
    }));
  }, []);

  const refreshWorkspace = useCallback(async () => {
    if (!workspaceRoots || workspaceRoots.length === 0) {
      setTree([]);
      return;
    }
    setTree(prevTree => {
      return workspaceRoots.map(root => {
        const existing = prevTree.find(n => n.path === root);
        if (existing) return existing;
        return {
          name: root.split(/[/\\]/).pop() || root,
          path: root,
          isDirectory: true,
          children: undefined,
          isOpen: false,
        };
      });
    });
  }, [workspaceRoots]);

  useEffect(() => {
    refreshWorkspace();
  }, [refreshWorkspace]);

  const toggleFolder = async (item: FileItem) => {
    if (!item.isDirectory) return;

    const updateTreeItem = async (nodes: FileItem[]): Promise<FileItem[]> => {
      return Promise.all(
        nodes.map(async (node) => {
          if (node.path === item.path) {
            const nextIsOpen = !node.isOpen;
            let children = node.children;
            if (nextIsOpen && (!children || children.length === 0)) {
              children = await loadDirectory(node.path);
            }
            return { ...node, isOpen: nextIsOpen, children };
          }
          if (node.isDirectory && node.children) {
            return { ...node, children: await updateTreeItem(node.children) };
          }
          return node;
        })
      );
    };

    setTree(await updateTreeItem(tree));
  };

  const findItemByPath = (nodes: FileItem[], targetPath: string): FileItem | undefined => {
    for (const node of nodes) {
      if (node.path === targetPath) return node;
      if (node.children) {
        const found = findItemByPath(node.children, targetPath);
        if (found) return found;
      }
    }
    return undefined;
  };

  const handleCreateFile = async (targetDir?: string) => {
    const filename = prompt("Enter file name (e.g. index.ts):");
    if (!filename || !workspaceRoots || workspaceRoots.length === 0) return;

    let dir = targetDir || workspaceRoots[0];
    if (!targetDir && selectedPath) {
      const selectedItem = findItemByPath(tree, selectedPath);
      if (selectedItem?.isDirectory) {
        dir = selectedItem.path;
      } else {
        const parts = selectedPath.split(/[/\\]/);
        parts.pop();
        if (parts.length > 0) dir = parts.join("/");
      }
    }

    const targetPath = `${dir}/${filename}`.replace(/\/+/g, "/");
    const api = window.atlasAPI;
    if (api?.createFile) {
      await api.createFile(targetPath, false);
      await refreshWorkspace();
      onOpenFile(targetPath);
    }
  };

  const handleCreateFolder = async (parentDir?: string) => {
    const folderName = prompt("Enter folder name:");
    if (!folderName || !workspaceRoots || workspaceRoots.length === 0) return;

    let dir = parentDir || workspaceRoots[0];
    const targetPath = `${dir}/${folderName}`.replace(/\/+/g, "/");
    const api = window.atlasAPI;
    if (api?.createFile) {
      await api.createFile(targetPath + "/.gitkeep", false);
      await refreshWorkspace();
    }
  };

  const handleRename = async (item: FileItem) => {
    const newName = prompt("Rename to:", item.name);
    if (!newName || newName === item.name) return;
    const parentDir = item.path.split(/[/\\]/).slice(0, -1).join("/");
    const newPath = `${parentDir}/${newName}`.replace(/\/+/g, "/");
    const api = window.atlasAPI;
    if (api?.moveFile) {
      await api.moveFile(item.path, newPath);
      await refreshWorkspace();
    }
  };

  const handleDelete = async (item: FileItem) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    const api = window.atlasAPI;
    if (api?.deleteFile) {
      await api.deleteFile(item.path);
      await refreshWorkspace();
    }
  };

  const handleCopyPath = (item: FileItem) => {
    const api = window.atlasAPI;
    if (api?.clipboardWriteText) {
      api.clipboardWriteText(item.path);
    } else {
      navigator.clipboard.writeText(item.path).catch(() => {});
    }
  };

  const handleRevealInTerminal = (item: FileItem) => {
    const dir = item.isDirectory ? item.path : item.path.split(/[/\\]/).slice(0, -1).join("/");
    if (onOpenInTerminal) onOpenInTerminal(dir);
  };

  const handleFileDrop = async (e: React.DragEvent, targetDir: string) => {
    e.preventDefault();
    e.stopPropagation();
    const api = window.atlasAPI;

    const sourcePath = e.dataTransfer.getData("atlas-file");
    if (sourcePath && sourcePath !== targetDir) {
      if (api?.moveFile) {
        const fileName = sourcePath.split(/[/\\]/).pop();
        await api.moveFile(sourcePath, `${targetDir}/${fileName}`.replace(/\/+/g, "/"));
        await refreshWorkspace();
      }
      return;
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (api?.copyFile) {
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          const file = e.dataTransfer.files[i] as any;
          if (file.path) {
            const fileName = file.path.split(/[/\\]/).pop();
            await api.copyFile(file.path, `${targetDir}/${fileName}`.replace(/\/+/g, "/"));
          }
        }
        await refreshWorkspace();
      }
    }
  };

  const openContextMenu = (e: React.MouseEvent, node: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, item: node });
  };

  const renderTree = (nodes: FileItem[], level = 0) => {
    return nodes.map((node, i) => {
      const staggerClass = `stagger-${Math.min(i + 1, 15)}`;
      return (
      <div key={node.path}>
        <div
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.setData("atlas-file", node.path);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (node.isDirectory) e.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(e) => {
            if (node.isDirectory) {
              handleFileDrop(e, node.path);
            } else {
              const parentDir = node.path.split(/[/\\]/).slice(0, -1).join("/");
              handleFileDrop(e, parentDir);
            }
          }}
          className={`file-explorer-item anim-slide-right ${staggerClass}`}
          style={{
            ...styles.treeItem,
            paddingLeft: `${level * 14 + 10}px`,
            ...(selectedPath === node.path ? styles.selectedItem : {}),
          }}
          onClick={() => {
            setSelectedPath(node.path);
            if (node.isDirectory) {
              toggleFolder(node);
            } else {
              onOpenFile(node.path);
            }
          }}
          onContextMenu={(e) => openContextMenu(e, node)}
        >
          <FileIcon fileName={node.name} isDirectory={node.isDirectory} isOpen={node.isOpen} />
          <span style={styles.label}>{node.name}</span>
        </div>
        {node.isDirectory && node.isOpen && node.children && renderTree(node.children, level + 1)}
      </div>
    )});
  };

  return (
    <div
      style={styles.container}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(e) => {
        if (workspaceRoots && workspaceRoots[0]) {
          handleFileDrop(e, workspaceRoots[0]);
        }
      }}
    >
      <div style={styles.header}>
        <span style={styles.headerTitle}>EXPLORER</span>
        <div style={styles.actions}>
          <button className="hover-scale" style={styles.actionButton} onClick={() => handleCreateFile()} title="New File">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
          </button>
          <button className="hover-scale" style={styles.actionButton} onClick={() => handleCreateFolder()} title="New Folder">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
          </button>
          {onAddFolder && (
            <button className="hover-scale" style={styles.actionButton} onClick={onAddFolder} title="Add Workspace Folder">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            </button>
          )}
          <button className="hover-scale" style={styles.actionButton} onClick={onSelectRepo} title="Open Workspace">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
        </div>
      </div>
      <div style={styles.treeContainer}>
        {tree.length === 0 ? (
          <div style={styles.empty}>
            <p style={styles.emptyText}>No workspace open</p>
            <button style={styles.openButton} onClick={onSelectRepo}>
              Open Folder
            </button>
          </div>
        ) : (
          renderTree(tree)
        )}
      </div>

      {/* Right-click context menu */}
      {ctxMenu && (
        <div
          ref={ctxMenuRef}
          className="anim-scale-in"
          style={{
            position: "fixed",
            top: Math.min(ctxMenu.y, window.innerHeight - 240),
            left: Math.min(ctxMenu.x, window.innerWidth - 200),
            zIndex: 99999,
            backgroundColor: "rgba(18,18,21,0.92)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "8px",
            boxShadow: "0 16px 40px -8px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)",
            padding: "4px",
            minWidth: "190px",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "13px",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {!ctxMenu.item.isDirectory && (
            <CtxMenuItem label="Open" icon="file" onClick={() => { onOpenFile(ctxMenu.item.path); setCtxMenu(null); }} />
          )}
          {ctxMenu.item.isDirectory && (
            <CtxMenuItem label="New File Here" icon="new-file" onClick={() => { handleCreateFile(ctxMenu.item.path); setCtxMenu(null); }} />
          )}
          {ctxMenu.item.isDirectory && (
            <CtxMenuItem label="New Folder Here" icon="new-folder" onClick={() => { handleCreateFolder(ctxMenu.item.path); setCtxMenu(null); }} />
          )}
          <CtxMenuItem
            label="Open in Terminal"
            icon="terminal"
            onClick={() => { handleRevealInTerminal(ctxMenu.item); setCtxMenu(null); }}
          />
          <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.07)", margin: "4px 0" }} />
          <CtxMenuItem label="Rename" icon="rename" onClick={() => { handleRename(ctxMenu.item); setCtxMenu(null); }} />
          <CtxMenuItem label="Copy Path" icon="copy" onClick={() => { handleCopyPath(ctxMenu.item); setCtxMenu(null); }} />
          <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.07)", margin: "4px 0" }} />
          <CtxMenuItem label="Delete" icon="delete" onClick={() => { handleDelete(ctxMenu.item); setCtxMenu(null); }} danger />
        </div>
      )}
    </div>
  );
}

function CtxMenuItem({ label, icon, onClick, danger }: { label: string; icon: string; onClick: () => void; danger?: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "6px 10px",
        borderRadius: "5px",
        cursor: "pointer",
        color: danger ? (hovered ? "#fff" : "#f87171") : (hovered ? "#fff" : "#d4d4d8"),
        backgroundColor: hovered ? (danger ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.08)") : "transparent",
        transition: "all 0.1s",
        fontSize: "13px",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <CtxIcon name={icon} />
      {label}
    </div>
  );
}

function CtxIcon({ name }: { name: string }) {
  const s = { width: 14, height: 14, flexShrink: 0 as const };
  switch (name) {
    case "file": return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
    case "new-file": return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>;
    case "new-folder": return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>;
    case "terminal": return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>;
    case "rename": return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
    case "copy": return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
    case "delete": return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
    default: return null;
  }
}

import React from "react";

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "transparent",
    color: "var(--text-muted)",
    fontSize: "13px",
    userSelect: "none",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 8px 0 12px",
    height: "36px",
    backgroundColor: "transparent",
    borderBottom: "1px solid var(--border-subtle)",
  },
  headerTitle: {
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.8px",
    textTransform: "uppercase",
    color: "var(--text-muted)",
  },
  actions: { display: "flex", gap: "2px" },
  actionButton: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    padding: "4px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
    transition: "color 0.15s, background 0.15s",
  },
  treeContainer: { flex: 1, overflowY: "auto", paddingTop: "4px" },
  treeItem: {
    display: "flex",
    alignItems: "center",
    padding: "0 8px",
    cursor: "pointer",
    margin: "1px 4px",
    height: "24px",
    gap: "6px",
    borderRadius: "4px",
    transition: "background-color 0.1s, color 0.1s",
  },
  selectedItem: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    color: "var(--accent)",
  },
  label: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "inherit",
    fontSize: "13px",
    fontFamily: "var(--font-ui)",
  },
  empty: { padding: "32px 16px", textAlign: "center" },
  emptyText: { fontSize: "12.5px", color: "var(--text-muted)", marginBottom: "16px", lineHeight: "1.5" },
  openButton: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "var(--text-main)",
    fontWeight: 500,
    fontSize: "12px",
    padding: "7px 14px",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "background 0.15s",
  },
};
