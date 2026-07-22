import { useState, useEffect, useCallback } from "react";
import { FileIcon } from "./FileIcons.js";

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileItem[];
  isOpen?: boolean;
}

interface FileExplorerProps {
  workspaceRoots?: string[];
  onOpenFile: (filePath: string) => void;
  onSelectRepo: () => void;
  onAddFolder?: () => void;
}

export function FileExplorer({ workspaceRoots, onOpenFile, onSelectRepo, onAddFolder }: FileExplorerProps) {
  const [tree, setTree] = useState<FileItem[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | undefined>();

  const loadDirectory = useCallback(async (dirPath: string): Promise<FileItem[]> => {
    const api = (window as any).atlasAPI;
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

  const handleCreateFile = async () => {
    const filename = prompt("Enter file name (e.g. index.ts):");
    if (!filename || !workspaceRoots || workspaceRoots.length === 0) return;

    let targetDir = workspaceRoots[0];
    if (selectedPath) {
      const selectedItem = findItemByPath(tree, selectedPath);
      if (selectedItem?.isDirectory) {
        targetDir = selectedItem.path;
      } else {
        const parts = selectedPath.split(/[/\\]/);
        parts.pop();
        if (parts.length > 0) targetDir = parts.join("/");
      }
    }

    const targetPath = `${targetDir}/${filename}`.replace(/\/+/g, "/");

    const api = (window as any).atlasAPI;
    if (api?.createFile) {
      await api.createFile(targetPath, false);
      await refreshWorkspace();
      onOpenFile(targetPath);
    }
  };

  const handleDelete = async (item: FileItem) => {
    if (!confirm(`Delete ${item.name}?`)) return;
    const api = (window as any).atlasAPI;
    if (api?.deleteFile) {
      await api.deleteFile(item.path);
      await refreshWorkspace();
    }
  };

  const renderTree = (nodes: FileItem[], level = 0) => {
    return nodes.map((node) => (
      <div key={node.path}>
        <div
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
        >
          <FileIcon fileName={node.name} isDirectory={node.isDirectory} isOpen={node.isOpen} />
          <span style={styles.label}>{node.name}</span>
          <button
            style={styles.deleteButton}
            title="Delete File"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(node);
            }}
          >
            x
          </button>
        </div>
        {node.isDirectory && node.isOpen && node.children && renderTree(node.children, level + 1)}
      </div>
    ));
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>EXPLORER</span>
        <div style={styles.actions}>
          <button style={styles.actionButton} onClick={handleCreateFile} title="New File">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2-2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
          </button>
          {onAddFolder && (
            <button style={styles.actionButton} onClick={onAddFolder} title="Add Workspace Folder">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
            </button>
          )}
          <button style={styles.actionButton} onClick={onSelectRepo} title="Open Workspace">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
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
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#050505",
    color: "#a1a1aa",
    fontSize: "13px",
    userSelect: "none",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 8px",
    height: "35px",
    backgroundColor: "#000000",
    borderBottom: "1px solid #27272a",
  },
  headerTitle: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.8px",
    color: "#fafafa",
  },
  actions: {
    display: "flex",
    gap: "2px",
  },
  actionButton: {
    background: "none",
    border: "none",
    color: "#71717a",
    padding: "4px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "color 0.1s",
  },
  treeContainer: {
    flex: 1,
    overflowY: "auto",
    paddingTop: "6px",
  },
  treeItem: {
    display: "flex",
    alignItems: "center",
    padding: "0 8px",
    cursor: "pointer",
    borderRadius: "0",
    margin: "0",
    height: "22px",
    transition: "background-color 0.1s",
  },
  selectedItem: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    color: "#fafafa",
  },
  label: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "#e4e4e7",
    fontSize: "13px",
    fontFamily: "'Inter', sans-serif",
  },
  deleteButton: {
    background: "none",
    border: "none",
    color: "#71717a",
    cursor: "pointer",
    fontSize: "12px",
    opacity: 0,
    padding: "0 4px",
  },
  empty: {
    padding: "32px 16px",
    textAlign: "center",
  },
  emptyText: {
    fontSize: "12px",
    color: "#71717a",
    marginBottom: "14px",
  },
  openButton: {
    background: "#fafafa",
    border: "none",
    color: "#09090b",
    fontWeight: 600,
    fontSize: "12px",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
  },
};
