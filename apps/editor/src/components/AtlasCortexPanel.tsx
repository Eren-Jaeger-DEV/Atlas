import React, { useState, useEffect, useCallback } from "react";
import { Network, Search, Copy, Check, Sparkles, ExternalLink, ArrowRight, Share2 } from "lucide-react";
import { graphRagEngine, type GraphRagNeighborhood, type KnowledgeNode } from "@atlas/graph";

interface AtlasCortexPanelProps {
  onOpenFile?: (filePath: string, line?: number) => void;
  onCopyGraphContext?: (context: string) => void;
}

export function AtlasCortexPanel({ onOpenFile, onCopyGraphContext }: AtlasCortexPanelProps) {
  const [query, setQuery] = useState<string>("ProviderRouter");
  const [neighborhood, setNeighborhood] = useState<GraphRagNeighborhood | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const runQuery = useCallback(() => {
    const res = graphRagEngine.getNeighborhood(query);
    setNeighborhood(res);
  }, [query]);

  useEffect(() => {
    runQuery();
  }, [runQuery]);

  const handleCopyContext = () => {
    if (!neighborhood) return;
    navigator.clipboard.writeText(neighborhood.graphSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopyGraphContext?.(neighborhood.graphSummary);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Network size={16} color="#34d399" />
          <span style={styles.title}>ATLAS CORTEX — GRAPHRAG KNOWLEDGE GRAPH</span>
        </div>
      </div>

      {/* Search Input Bar */}
      <div style={styles.searchBar}>
        <div style={styles.inputWrapper}>
          <Search size={12} color="#71717a" style={{ marginLeft: "8px" }} />
          <input
            type="text"
            style={styles.searchInput}
            placeholder="Search symbol (e.g. ProviderRouter)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runQuery()}
          />
        </div>
        <button style={styles.queryBtn} onClick={runQuery}>
          Query Graph
        </button>
      </div>

      {neighborhood && (
        <div style={styles.graphStream}>
          {/* Target Symbol Card */}
          <div style={styles.targetCard}>
            <div style={styles.targetHeader}>
              <span style={styles.targetKind}>{neighborhood.targetNode.kind.toUpperCase()}</span>
              <span style={styles.targetLabel}>{neighborhood.targetNode.label}</span>
            </div>
            <div style={styles.targetLoc} onClick={() => onOpenFile?.(neighborhood.targetNode.filePath, neighborhood.targetNode.line)}>
              {neighborhood.targetNode.filePath}:{neighborhood.targetNode.line} <ExternalLink size={10} color="#71717a" />
            </div>
          </div>

          {/* Incoming Callers */}
          <div style={styles.relationSection}>
            <div style={styles.relationTitle}>
              <Share2 size={12} color="#38bdf8" />
              INCOMING CALLERS ({neighborhood.callers.length})
            </div>
            <div style={styles.nodeList}>
              {neighborhood.callers.length === 0 ? (
                <div style={styles.emptyText}>No callers detected in 2-hop graph</div>
              ) : (
                neighborhood.callers.map((node) => (
                  <NodeCard key={node.id} node={node} color="#38bdf8" onOpenFile={onOpenFile} />
                ))
              )}
            </div>
          </div>

          {/* Outgoing Callees */}
          <div style={styles.relationSection}>
            <div style={styles.relationTitle}>
              <ArrowRight size={12} color="#c084fc" />
              OUTGOING CALLEES ({neighborhood.callees.length})
            </div>
            <div style={styles.nodeList}>
              {neighborhood.callees.length === 0 ? (
                <div style={styles.emptyText}>No outgoing callees</div>
              ) : (
                neighborhood.callees.map((node) => (
                  <NodeCard key={node.id} node={node} color="#c084fc" onOpenFile={onOpenFile} />
                ))
              )}
            </div>
          </div>

          {/* GraphRAG AI Prompt Context Box */}
          <div style={styles.contextBox}>
            <div style={styles.contextHeader}>
              <Sparkles size={12} color="#34d399" />
              <span>GRAPHRAG PROMPT CONTEXT</span>
            </div>
            <div style={styles.contextText}>{neighborhood.graphSummary}</div>
            <button style={styles.copyBtn} onClick={handleCopyContext}>
              {copied ? <Check size={12} color="#34d399" /> : <Copy size={12} color="#a1a1aa" />}
              <span>{copied ? "Copied!" : "Copy Context for AI Prompt"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NodeCard({ node, color, onOpenFile }: { node: KnowledgeNode; color: string; onOpenFile?: (path: string, line?: number) => void }) {
  return (
    <div
      style={{
        backgroundColor: "#111113",
        border: `1px solid ${color}40`,
        borderRadius: "4px",
        padding: "6px 8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: "pointer",
      }}
      onClick={() => onOpenFile?.(node.filePath, node.line)}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "9px", fontWeight: 700, color, backgroundColor: `${color}15`, padding: "1px 4px", borderRadius: "3px" }}>
          {node.kind}
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', Consolas, monospace", fontWeight: 600, color: "#f4f4f5", fontSize: "11px" }}>
          {node.label}
        </span>
      </div>
      <ExternalLink size={10} color="#71717a" />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#09090b",
    color: "#f4f4f5",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: "12px",
  },
  header: {
    padding: "10px 14px",
    backgroundColor: "#111113",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  title: {
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "#34d399",
    fontSize: "11px",
  },
  searchBar: {
    display: "flex",
    gap: "8px",
    padding: "10px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  inputWrapper: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    backgroundColor: "#111113",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "4px",
  },
  searchInput: {
    flex: 1,
    background: "none",
    border: "none",
    color: "#f4f4f5",
    fontSize: "11px",
    padding: "6px 8px",
    outline: "none",
  },
  queryBtn: {
    backgroundColor: "rgba(52, 211, 153, 0.15)",
    border: "1px solid rgba(52, 211, 153, 0.3)",
    borderRadius: "4px",
    color: "#34d399",
    padding: "0 10px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
  },
  graphStream: {
    flex: 1,
    overflowY: "auto",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  targetCard: {
    backgroundColor: "#111113",
    border: "1px solid rgba(52, 211, 153, 0.4)",
    borderRadius: "6px",
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  targetHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  targetKind: {
    fontSize: "9px",
    fontWeight: 700,
    color: "#34d399",
    backgroundColor: "rgba(52, 211, 153, 0.15)",
    padding: "2px 5px",
    borderRadius: "3px",
  },
  targetLabel: {
    fontSize: "14px",
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', Consolas, monospace",
    color: "#ffffff",
  },
  targetLoc: {
    fontSize: "10px",
    color: "#71717a",
    fontFamily: "monospace",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  relationSection: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  relationTitle: {
    fontSize: "9px",
    fontWeight: 700,
    color: "#71717a",
    letterSpacing: "0.06em",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  nodeList: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  emptyText: {
    fontSize: "11px",
    color: "#52525b",
    fontStyle: "italic",
    padding: "4px 0",
  },
  contextBox: {
    backgroundColor: "#111113",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "6px",
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "4px",
  },
  contextHeader: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "10px",
    fontWeight: 700,
    color: "#34d399",
  },
  contextText: {
    fontSize: "10px",
    fontFamily: "'JetBrains Mono', Consolas, monospace",
    color: "#a1a1aa",
    backgroundColor: "#09090b",
    padding: "6px 8px",
    borderRadius: "4px",
    lineHeight: 1.4,
  },
  copyBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    backgroundColor: "#18181b",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "4px",
    color: "#a1a1aa",
    padding: "5px 10px",
    fontSize: "11px",
    cursor: "pointer",
  },
};
