import React, { useState } from "react";

interface MermaidDiagramViewerProps {
  code: string;
}

export function MermaidDiagramViewer({ code }: MermaidDiagramViewerProps) {
  const [copied, setCopied] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  // Parse nodes and edges for visual SVG rendering
  const lines = code
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("flowchart") && !l.startsWith("graph") && !l.startsWith("sequenceDiagram") && !l.startsWith("classDiagram"));

  const nodes = new Set<string>();
  const connections: Array<{ from: string; to: string; label?: string }> = [];

  for (const line of lines) {
    const match = line.match(/^([\w-]+)(?:\[(.*?)\])?\s*-->\s*(?:\|(.*?)\|)?\s*([\w-]+)(?:\[(.*?)\])?/);
    if (match) {
      const from = match[2] || match[1]!;
      const label = match[3];
      const to = match[5] || match[4]!;
      nodes.add(from);
      nodes.add(to);
      connections.push({ from, to, label });
    } else {
      const rawNodes = line.match(/[\w-]+/g);
      if (rawNodes) {
        rawNodes.forEach((n) => nodes.add(n));
      }
    }
  }

  const nodeList = Array.from(nodes);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleGroup}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #38bdf8)" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
          <span style={styles.title}>MERMAID DIAGRAM</span>
        </div>
        <div style={styles.btnGroup}>
          <button style={styles.iconBtn} onClick={() => setZoomed(!zoomed)} title={zoomed ? "Reset Zoom" : "Expand View"}>
            {zoomed ? "↙ Collapse" : "↗ Expand"}
          </button>
          <button style={styles.iconBtn} onClick={handleCopy}>
            {copied ? "✓ Copied" : "Copy Code"}
          </button>
        </div>
      </div>

      {/* SVG Diagram Canvas */}
      <div style={{ ...styles.canvas, maxHeight: zoomed ? "500px" : "240px" }}>
        <svg width="100%" height={Math.max(160, nodeList.length * 50)} style={{ minHeight: "160px" }}>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent, #38bdf8)" />
            </marker>
          </defs>

          {/* Render Flow Nodes */}
          {nodeList.map((node, idx) => {
            const x = 20 + (idx % 2) * 160;
            const y = 20 + Math.floor(idx / 2) * 60;
            return (
              <g key={node} transform={`translate(${x}, ${y})`}>
                <rect width="130" height="36" rx="6" fill="var(--bg-base, #09090b)" stroke="var(--accent, #38bdf8)" strokeWidth="1.5" />
                <text x="65" y="22" textAnchor="middle" fill="var(--text-main, #fafafa)" fontSize="11" fontWeight="600">
                  {node.length > 15 ? node.slice(0, 13) + "..." : node}
                </text>
              </g>
            );
          })}

          {/* Render Flow Connections */}
          {connections.map((conn, idx) => {
            const fromIdx = nodeList.indexOf(conn.from);
            const toIdx = nodeList.indexOf(conn.to);
            if (fromIdx === -1 || toIdx === -1) return null;

            const x1 = 20 + (fromIdx % 2) * 160 + 65;
            const y1 = 20 + Math.floor(fromIdx / 2) * 60 + 36;
            const x2 = 20 + (toIdx % 2) * 160 + 65;
            const y2 = 20 + Math.floor(toIdx / 2) * 60;

            return (
              <g key={idx}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--accent, #38bdf8)" strokeWidth="1.5" strokeDasharray="4 2" markerEnd="url(#arrow)" />
                {conn.label && (
                  <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 4} textAnchor="middle" fill="var(--text-muted, #a1a1aa)" fontSize="9">
                    {conn.label}
                  </text>
                )}
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
    backgroundColor: "var(--bg-glass-strong, rgba(14, 14, 18, 0.95))",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid var(--border-strong, #27272a)",
    borderRadius: "var(--radius-md, 8px)",
    overflow: "hidden",
    margin: "8px 0",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 10px",
    backgroundColor: "var(--bg-base, #09090b)",
    borderBottom: "1px solid var(--border-subtle, #27272a)",
  },
  titleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  title: {
    fontSize: "10px",
    fontWeight: 700,
    color: "var(--accent, #38bdf8)",
    letterSpacing: "0.8px",
    textTransform: "uppercase",
  },
  btnGroup: {
    display: "flex",
    gap: "6px",
  },
  iconBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted, #a1a1aa)",
    fontSize: "10px",
    fontWeight: 600,
    cursor: "pointer",
    padding: "2px 6px",
    borderRadius: "4px",
    backgroundColor: "var(--bg-panel, #18181b)",
  },
  canvas: {
    padding: "12px",
    overflow: "auto",
    transition: "max-height 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
  },
};
