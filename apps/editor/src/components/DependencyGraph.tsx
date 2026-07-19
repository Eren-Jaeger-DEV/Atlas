// WARN - The symbol data is populated from a real graph search via atlasAPI,
// however, the visual layout (circleLayout) is a mock layout that artificially draws edges from the center node to all others.
// It does not reflect true topological dependency edges.
import { useState, useEffect, useRef } from "react";

const api = () => (window as any).atlasAPI;

interface GraphNode {
  id: string;
  label?: string;
  kind?: string;
  filePath?: string;
}

interface LayoutNode {
  id: string;
  label: string;
  kind: string;
  x: number;
  y: number;
}

interface DependencyGraphProps {
  repoPath?: string;
}

// Simple deterministic circle layout — no external library needed
function circleLayout(nodes: GraphNode[], cx: number, cy: number, r: number): LayoutNode[] {
  return nodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
    return {
      id: n.id ?? String(i),
      label: n.label ?? (n.filePath ? n.filePath.split(/[/\\]/).pop()! : `Node ${i}`),
      kind: n.kind ?? "symbol",
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });
}

export function DependencyGraph({ repoPath }: DependencyGraphProps) {
  const [nodes, setNodes] = useState<LayoutNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<LayoutNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!repoPath) return;
    setLoading(true);
    setError(null);

    api()
      .search("*")
      .then((results: GraphNode[]) => {
        const topN = (Array.isArray(results) ? results : []).slice(0, 30);
        setNodes(circleLayout(topN, 300, 220, 180));
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [repoPath]);

  const kindColor = (kind: string) => {
    switch (kind) {
      case "function": return "#fbbf24";
      case "class":    return "#60a5fa";
      case "variable": return "#86efac";
      case "file":     return "#e4e4e7";
      default:         return "#a1a1aa";
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>VISUAL DEPENDENCY GRAPH</span>
        <span style={styles.subtext}>
          {loading ? "Indexing..." : repoPath ? `${nodes.length} symbols` : "No workspace open"}
        </span>
      </div>

      <div style={styles.graphContainer}>
        {!repoPath && (
          <p style={styles.emptyMsg}>Open a workspace to explore its dependency graph.</p>
        )}

        {error && (
          <p style={{ ...styles.emptyMsg, color: "#f87171" }}>[FAIL] {error}</p>
        )}

        {nodes.length > 0 && (
          <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 600 440" style={styles.svg}>
            {/* Draw edges from center to all outer nodes */}
            {nodes.map((n, i) => {
              const center = nodes[0];
              if (i === 0) return null;
              return (
                <line
                  key={`edge-${n.id}`}
                  x1={center.x} y1={center.y}
                  x2={n.x} y2={n.y}
                  stroke="#27272a" strokeWidth="1"
                />
              );
            })}

            {/* Draw nodes */}
            {nodes.map(n => (
              <g
                key={n.id}
                transform={`translate(${n.x - 44},${n.y - 14})`}
                onClick={() => setSelectedNode(n)}
                style={{ cursor: "pointer" }}
              >
                <rect
                  width="88" height="28" rx="5"
                  fill={selectedNode?.id === n.id ? "#27272a" : "#18181b"}
                  stroke={kindColor(n.kind)}
                  strokeWidth={selectedNode?.id === n.id ? "1.5" : "1"}
                />
                <text
                  x="44" y="17"
                  textAnchor="middle"
                  fill={kindColor(n.kind)}
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {n.label.length > 12 ? n.label.slice(0, 12) + "..." : n.label}
                </text>
              </g>
            ))}
          </svg>
        )}

        {/* Detail panel */}
        {selectedNode && (
          <div style={styles.detail}>
            <p style={styles.detailHdr}>NODE INSPECTOR</p>
            <p style={styles.detailRow}><strong>Label:</strong> {selectedNode.label}</p>
            <p style={styles.detailRow}><strong>Kind:</strong> {selectedNode.kind}</p>
            <p style={styles.detailRow}><strong>ID:</strong> {selectedNode.id}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex", flexDirection: "column", height: "100%",
    backgroundColor: "#09090b", color: "#fafafa",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "8px 12px", backgroundColor: "#0d0d10", borderBottom: "1px solid #27272a",
  },
  title: { fontSize: "11px", fontWeight: 700, letterSpacing: "0.8px" },
  subtext: { fontSize: "11px", color: "#71717a" },
  graphContainer: {
    flex: 1, position: "relative", overflow: "hidden",
    display: "flex", flexDirection: "column",
  },
  svg: { flex: 1 },
  emptyMsg: { fontSize: "11px", color: "#52525b", margin: "20px 12px" },
  detail: {
    position: "absolute", bottom: "12px", right: "12px",
    backgroundColor: "#141417", border: "1px solid #27272a",
    borderRadius: "6px", padding: "10px 12px", minWidth: "200px",
  },
  detailHdr: { fontSize: "10px", fontWeight: 700, color: "#71717a", margin: "0 0 6px" },
  detailRow: { fontSize: "11px", color: "#e4e4e7", margin: "0 0 2px" },
};
