import { useState, useEffect } from "react";

interface NodeData {
  id: string;
  label: string;
  kind: string;
}

interface DependencyGraphProps {
  repoPath?: string;
}

export function DependencyGraph({ repoPath }: DependencyGraphProps) {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);

  useEffect(() => {
    // Generate workspace component visual nodes from active path
    if (repoPath) {
      setNodes([
        { id: "1", label: "App.tsx", kind: "file" },
        { id: "2", label: "EditorPane.tsx", kind: "file" },
        { id: "3", label: "FileExplorer.tsx", kind: "file" },
        { id: "4", label: "GitPanel.tsx", kind: "file" },
        { id: "5", label: "TerminalPanel.tsx", kind: "file" },
        { id: "6", label: "ServiceContainer.ts", kind: "file" },
        { id: "7", label: "EventBus.ts", kind: "file" },
      ]);
    }
  }, [repoPath]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>VISUAL DEPENDENCY GRAPH</span>
        <span style={styles.subtext}>{repoPath ? `${nodes.length} nodes` : "No workspace open"}</span>
      </div>

      <div style={styles.graphContainer}>
        <svg width="100%" height="100%" style={styles.svg}>
          {/* Edge lines */}
          <line x1="120" y1="60" x2="260" y2="100" stroke="#3f3f46" strokeWidth="1.5" />
          <line x1="120" y1="60" x2="260" y2="160" stroke="#3f3f46" strokeWidth="1.5" />
          <line x1="120" y1="60" x2="260" y2="220" stroke="#3f3f46" strokeWidth="1.5" />
          <line x1="260" y1="100" x2="420" y2="120" stroke="#3f3f46" strokeWidth="1.5" />
          <line x1="260" y1="160" x2="420" y2="180" stroke="#3f3f46" strokeWidth="1.5" />

          {/* Root node */}
          <g transform="translate(60, 40)" onClick={() => setSelectedNode(nodes[0])} style={{ cursor: "pointer" }}>
            <rect width="120" height="36" rx="6" fill="#18181b" stroke="#e4e4e7" strokeWidth="1.5" />
            <text x="60" y="22" textAnchor="middle" fill="#fafafa" fontSize="12" fontWeight="600">App.tsx</text>
          </g>

          {/* Child nodes */}
          <g transform="translate(200, 80)" onClick={() => setSelectedNode(nodes[1])} style={{ cursor: "pointer" }}>
            <rect width="120" height="34" rx="6" fill="#18181b" stroke="#27272a" strokeWidth="1" />
            <text x="60" y="21" textAnchor="middle" fill="#e4e4e7" fontSize="11">EditorPane.tsx</text>
          </g>

          <g transform="translate(200, 140)" onClick={() => setSelectedNode(nodes[2])} style={{ cursor: "pointer" }}>
            <rect width="120" height="34" rx="6" fill="#18181b" stroke="#27272a" strokeWidth="1" />
            <text x="60" y="21" textAnchor="middle" fill="#e4e4e7" fontSize="11">FileExplorer.tsx</text>
          </g>

          <g transform="translate(200, 200)" onClick={() => setSelectedNode(nodes[3])} style={{ cursor: "pointer" }}>
            <rect width="120" height="34" rx="6" fill="#18181b" stroke="#27272a" strokeWidth="1" />
            <text x="60" y="21" textAnchor="middle" fill="#e4e4e7" fontSize="11">GitPanel.tsx</text>
          </g>

          {/* Service nodes */}
          <g transform="translate(360, 100)" style={{ cursor: "pointer" }}>
            <rect width="130" height="34" rx="6" fill="#18181b" stroke="#38bdf8" strokeWidth="1" />
            <text x="65" y="21" textAnchor="middle" fill="#38bdf8" fontSize="11">ServiceContainer</text>
          </g>

          <g transform="translate(360, 160)" style={{ cursor: "pointer" }}>
            <rect width="130" height="34" rx="6" fill="#18181b" stroke="#38bdf8" strokeWidth="1" />
            <text x="65" y="21" textAnchor="middle" fill="#38bdf8" fontSize="11">EventBus.ts</text>
          </g>
        </svg>

        {selectedNode && (
          <div style={styles.infoBox}>
            <p style={styles.infoHdr}>NODE DETAILS</p>
            <p style={styles.infoTxt}>Label: {selectedNode.label}</p>
            <p style={styles.infoTxt}>Type: {selectedNode.kind}</p>
          </div>
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
    backgroundColor: "#09090b",
    color: "#fafafa",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    backgroundColor: "#0d0d10",
    borderBottom: "1px solid #27272a",
  },
  title: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.8px",
  },
  subtext: {
    fontSize: "11px",
    color: "#71717a",
  },
  graphContainer: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  svg: {
    width: "100%",
    height: "100%",
  },
  infoBox: {
    position: "absolute",
    bottom: "12px",
    right: "12px",
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    borderRadius: "6px",
    padding: "10px",
    minWidth: "160px",
  },
  infoHdr: {
    fontSize: "10px",
    fontWeight: 700,
    color: "#71717a",
    margin: "0 0 4px",
  },
  infoTxt: {
    fontSize: "12px",
    margin: "0 0 2px",
    color: "#e4e4e7",
  },
};
