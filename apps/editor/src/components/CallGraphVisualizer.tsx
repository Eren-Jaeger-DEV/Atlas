import React, { useState } from "react";

export interface GraphNode {
  id: string;
  name: string;
  file: string;
  x: number;
  y: number;
  type: "function" | "class" | "module";
}

export interface GraphEdge {
  from: string;
  to: string;
  calls: number;
}

interface CallGraphVisualizerProps {
  onSelectNode?: (file: string, name: string) => void;
}

export function CallGraphVisualizer({ onSelectNode }: CallGraphVisualizerProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("node-1");

  const nodes: GraphNode[] = [
    { id: "node-1", name: "SmartModelClassifier", file: "packages/agents/src/llm/SmartModelClassifier.ts", x: 120, y: 80, type: "class" },
    { id: "node-2", name: "classifyPromptIntent", file: "packages/agents/src/llm/SmartModelClassifier.ts", x: 360, y: 60, type: "function" },
    { id: "node-3", name: "DiffZoneTransport", file: "packages/core/src/protobuf/DiffZoneTransport.ts", x: 360, y: 160, type: "class" },
    { id: "node-4", name: "SessionManager", file: "packages/core/src/session/SessionManager.ts", x: 600, y: 110, type: "class" },
  ];

  const edges: GraphEdge[] = [
    { from: "node-1", to: "node-2", calls: 14 },
    { from: "node-1", to: "node-3", calls: 8 },
    { from: "node-2", to: "node-4", calls: 5 },
  ];

  const getNode = (id: string) => nodes.find((n) => n.id === id);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #38bdf8)" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        <span style={styles.title}>AST DEPENDENCY & CALL GRAPH</span>
        <span style={styles.nodeBadge}>{nodes.length} Nodes</span>
      </div>

      <div style={styles.canvasArea}>
        <svg width="100%" height="240" style={styles.svgCanvas}>
          {/* Edge Connection Lines */}
          {edges.map((edge) => {
            const source = getNode(edge.from);
            const target = getNode(edge.to);
            if (!source || !target) return null;
            return (
              <g key={`${edge.from}-${edge.to}`}>
                <line
                  x1={source.x + 60}
                  y1={source.y + 15}
                  x2={target.x + 60}
                  y2={target.y + 15}
                  stroke="var(--accent-glow, rgba(14, 165, 233, 0.4))"
                  strokeWidth="2"
                  strokeDasharray="4"
                />
              </g>
            );
          })}

          {/* Render Graph Nodes */}
          {nodes.map((node) => {
            const isSelected = node.id === selectedNodeId;
            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => {
                  setSelectedNodeId(node.id);
                  onSelectNode?.(node.file, node.name);
                }}
                style={{ cursor: "pointer" }}
              >
                <rect
                  width="130"
                  height="34"
                  rx="6"
                  fill={isSelected ? "var(--bg-panel, #18181b)" : "var(--bg-base, #09090b)"}
                  stroke={isSelected ? "var(--accent, #38bdf8)" : "var(--border-strong, #27272a)"}
                  strokeWidth={isSelected ? "2" : "1"}
                />
                <text x="10" y="20" fill="var(--text-main, #fafafa)" fontSize="11" fontWeight="600" fontFamily="sans-serif">
                  {node.name.length > 14 ? node.name.substring(0, 12) + ".." : node.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: "var(--bg-base, #09090b)",
    border: "1px solid var(--border-strong, #27272a)",
    borderRadius: "var(--radius-md, 8px)",
    overflow: "hidden",
    fontFamily: "var(--font-sans, system-ui)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    backgroundColor: "var(--bg-panel, #18181b)",
    borderBottom: "1px solid var(--border-subtle, #27272a)",
  },
  title: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--accent, #38bdf8)",
    letterSpacing: "0.8px",
  },
  nodeBadge: {
    marginLeft: "auto",
    fontSize: "10px",
    fontWeight: 600,
    color: "var(--text-muted, #a1a1aa)",
    backgroundColor: "var(--bg-base, #09090b)",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  canvasArea: {
    backgroundColor: "var(--bg-base, #09090b)",
    padding: "10px",
  },
  svgCanvas: {
    display: "block",
  },
};
