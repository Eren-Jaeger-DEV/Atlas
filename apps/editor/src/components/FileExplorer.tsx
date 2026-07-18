import { useState, useEffect, useCallback } from "react";

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
            paddingLeft: `${level * 12 + 8}px`,
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
          <span style={styles.icon}>
            {node.isDirectory ? (node.isOpen ? "📂" : "📁") : "📄"}
          </span>
          <span style={styles.label}>{node.name}</span>
          <button
            style={styles.deleteButton}
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(node);
            }}
          >
            ×
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
    backgroundColor: "#16161e",
    color: "#a9b1d6",
    fontSize: "13px",
    userSelect: "none",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    backgroundColor: "#1f2335",
    borderBottom: "1px solid #292e42",
  },
  headerTitle: {
    fontSize: "11px",
    fontWeight: "bold",
    letterSpacing: "0.5px",
    color: "#7aa2f7",
  },
  actions: {
    display: "flex",
    gap: "6px",
  },
  actionButton: {
    background: "#292e42",
    border: "1px solid #3b4261",
    color: "#c0caf5",
    fontSize: "10px",
    borderRadius: "3px",
    padding: "2px 6px",
    cursor: "pointer",
  },
  treeContainer: {
    flex: 1,
    overflowY: "auto",
    paddingTop: "4px",
  },
  treeItem: {
    display: "flex",
    alignItems: "center",
    padding: "4px 8px",
    cursor: "pointer",
    borderRadius: "3px",
  },
  selectedItem: {
    backgroundColor: "#292e42",
    color: "#7aa2f7",
  },
  icon: {
    marginRight: "6px",
    fontSize: "12px",
  },
  label: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  deleteButton: {
    background: "none",
    border: "none",
    color: "#f7768e",
    cursor: "pointer",
    fontSize: "14px",
    opacity: 0.6,
  },
  empty: {
    padding: "24px 12px",
    textAlign: "center",
  },
  emptyText: {
    fontSize: "12px",
    color: "#565f89",
    marginBottom: "12px",
  },
  openButton: {
    background: "#7aa2f7",
    border: "none",
    color: "#15161e",
    fontWeight: "bold",
    fontSize: "12px",
    padding: "6px 14px",
    borderRadius: "4px",
    cursor: "pointer",
  },
};
