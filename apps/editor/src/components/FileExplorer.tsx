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
  repoPath?: string;
  onOpenFile: (filePath: string) => void;
  onSelectRepo: () => void;
}

export function FileExplorer({ repoPath, onOpenFile, onSelectRepo }: FileExplorerProps) {
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
    if (!repoPath) return;
    const items = await loadDirectory(repoPath);
    setTree(items);
  }, [repoPath, loadDirectory]);

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

  const handleCreateFile = async () => {
    const filename = prompt("Enter file name (e.g. index.ts):");
    if (!filename || !repoPath) return;
    const targetDir = selectedPath && !selectedPath.endsWith("/") ? selectedPath : repoPath;
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
            + File
          </button>
          <button style={styles.actionButton} onClick={onSelectRepo} title="Open Workspace">
            Open
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
    backgroundColor: "#0d0d10",
    color: "#a1a1aa",
    fontSize: "12px",
    userSelect: "none",
    borderRight: "1px solid #27272a",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    backgroundColor: "#09090b",
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
    gap: "6px",
  },
  actionButton: {
    background: "#18181b",
    border: "1px solid #27272a",
    color: "#e4e4e7",
    fontSize: "11px",
    borderRadius: "4px",
    padding: "3px 8px",
    cursor: "pointer",
    fontWeight: 500,
  },
  treeContainer: {
    flex: 1,
    overflowY: "auto",
    paddingTop: "6px",
  },
  treeItem: {
    display: "flex",
    alignItems: "center",
    padding: "4px 8px",
    cursor: "pointer",
    borderRadius: "4px",
    margin: "1px 6px",
    height: "26px",
  },
  selectedItem: {
    backgroundColor: "#18181b",
    color: "#fafafa",
  },
  label: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "#e4e4e7",
    fontSize: "12px",
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
