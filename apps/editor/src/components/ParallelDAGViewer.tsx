import React, { useState } from "react";
import type { WorkerState, ParallelWorkerStatus } from "./ParallelAgentsDashboard.js";

interface DAGNode {
  id: string;
  title: string;
  status: ParallelWorkerStatus;
  deps: string[];
  x: number;
  y: number;
  worker?: WorkerState;
}

interface ParallelDAGViewerProps {
  workers: WorkerState[];
  onSelectWorker?: (workerId: string) => void;
}

const STATUS_COLOR: Record<ParallelWorkerStatus, string> = {
  pending:   "#71717a",
  planning:  "#38bdf8",
  coding:    "#a78bfa",
  testing:   "#fbbf24",
  reviewing: "#34d399",
  done:      "#22c55e",
  error:     "#f87171",
  cancelled: "#52525b"
};

export function ParallelDAGViewer({ workers, onSelectWorker }: ParallelDAGViewerProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  if (workers.length === 0) {
    return (
      <div style={{ padding: "40px 16px", textAlign: "center", color: "#52525b", fontSize: 12 }}>
        No DAG tasks active. Submit a goal to visualize execution flow.
      </div>
    );
  }

  // Calculate topological levels for positioning
  const nodesMap = new Map<string, DAGNode>();
  workers.forEach(w => {
    nodesMap.set(w.task.id, {
      id: w.task.id,
      title: w.task.title,
      status: w.status,
      deps: w.task.deps || [],
      x: 0,
      y: 0,
      worker: w
    });
  });

  // Assign level (column index)
  const levels = new Map<string, number>();
  const getLevel = (id: string, visited = new Set<string>()): number => {
    if (levels.has(id)) return levels.get(id)!;
    if (visited.has(id)) return 0; // Cycle safety fallback
    visited.add(id);
    const node = nodesMap.get(id);
    if (!node || node.deps.length === 0) {
      levels.set(id, 0);
      return 0;
    }
    const maxDepLevel = Math.max(...node.deps.map(d => getLevel(d, new Set(visited))));
    const lvl = maxDepLevel + 1;
    levels.set(id, lvl);
    return lvl;
  };

  workers.forEach(w => getLevel(w.task.id));

  // Group nodes by level
  const levelGroups = new Map<number, DAGNode[]>();
  nodesMap.forEach(node => {
    const lvl = levels.get(node.id) || 0;
    const existing = levelGroups.get(lvl) || [];
    existing.push(node);
    levelGroups.set(lvl, existing);
  });

  const maxLevel = Math.max(0, ...Array.from(levelGroups.keys()));
  const containerWidth = 320;
  const colWidth = Math.max(90, containerWidth / (maxLevel + 1));
  const rowHeight = 70;

  // Compute (x, y) coordinates
  levelGroups.forEach((groupNodes, lvl) => {
    groupNodes.forEach((node, idx) => {
      node.x = lvl * colWidth + 45;
      node.y = idx * rowHeight + 40;
    });
  });

  const dagNodes = Array.from(nodesMap.values());
  const maxOffsetY = Math.max(180, ...dagNodes.map(n => n.y + 40));

  return (
    <div style={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 8, padding: "12px", overflowX: "auto" }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", color: "#a1a1aa", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>DEPENDENCY GRAPH (DAG)</span>
        <span style={{ fontSize: 10, color: "#52525b" }}>{dagNodes.length} nodes</span>
      </div>

      <svg width={Math.max(containerWidth, (maxLevel + 1) * colWidth + 40)} height={maxOffsetY}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3f3f46" />
          </marker>
          <marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
          </marker>
        </defs>

        {/* Draw Edges */}
        {dagNodes.map(node => {
          return node.deps.map(depId => {
            const depNode = nodesMap.get(depId);
            if (!depNode) return null;

            const isHovered = hoveredNode === node.id || hoveredNode === depId;
            const isDepDone = depNode.status === "done";

            return (
              <line
                key={`${depId}->${node.id}`}
                x1={depNode.x + 30}
                y1={depNode.y}
                x2={node.x - 30}
                y2={node.y}
                stroke={isHovered ? "#38bdf8" : isDepDone ? "#3f3f46" : "#27272a"}
                strokeWidth={isHovered ? 2 : 1.5}
                strokeDasharray={node.status === "coding" || node.status === "planning" ? "4 4" : undefined}
                markerEnd={isHovered ? "url(#arrow-active)" : "url(#arrow)"}
                style={{ transition: "stroke 0.2s, stroke-width 0.2s" }}
              />
            );
          });
        })}

        {/* Draw Nodes */}
        {dagNodes.map(node => {
          const color = STATUS_COLOR[node.status] || "#71717a";
          const isHovered = hoveredNode === node.id;
          const isActive = ["planning", "coding", "testing", "reviewing"].includes(node.status);

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => node.worker && onSelectWorker?.(node.worker.id)}
            >
              {/* Pulsing glow background for active nodes */}
              {isActive && (
                <rect
                  x="-35" y="-18" width="70" height="36" rx="6"
                  fill="none" stroke={color} strokeWidth="1" opacity="0.4"
                >
                  <animate attributeName="opacity" values="0.2;0.7;0.2" dur="2s" repeatCount="indefinite" />
                </rect>
              )}

              {/* Node Card Box */}
              <rect
                x="-32" y="-15" width="64" height="30" rx="5"
                fill={isHovered ? "#18181b" : "#0f0f12"}
                stroke={isHovered ? "#38bdf8" : color}
                strokeWidth={isHovered ? 2 : 1.5}
                style={{ transition: "all 0.2s" }}
              />

              {/* Status Circle */}
              <circle cx="-20" cy="0" r="4" fill={color} />

              {/* Node Title */}
              <text
                x="-12" y="3"
                fill="#fafafa"
                fontSize="9"
                fontWeight="600"
                fontFamily="system-ui, sans-serif"
              >
                {node.title.length > 7 ? node.title.slice(0, 6) + "…" : node.title}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
