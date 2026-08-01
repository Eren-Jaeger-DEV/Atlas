import React, { useState, useEffect } from "react";
import { GitCompare, Filter, ChevronDown, ChevronRight, Layers, FileCode, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { atlasPrism, type PrismDiffResult, type PrismDiffHunk, type PrismChangeCategory } from "@atlas/graph";

interface AtlasPrismDiffPanelProps {
  filePath: string;
  oldContent: string;
  newContent: string;
  onClose?: () => void;
}

const CATEGORY_COLORS: Record<PrismChangeCategory, { bg: string; border: string; text: string; label: string }> = {
  function_signature:    { bg: "rgba(239, 68, 68, 0.12)",  border: "rgba(239, 68, 68, 0.3)",  text: "#f87171", label: "FUNCTION SIG" },
  logic_modification:    { bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.3)", text: "#fbbf24", label: "LOGIC CHANGE" },
  type_definition:       { bg: "rgba(168, 85, 247, 0.12)", border: "rgba(168, 85, 247, 0.3)", text: "#c084fc", label: "TYPE DEFINITION" },
  import_reorder:        { bg: "rgba(59, 130, 246, 0.12)", border: "rgba(59, 130, 246, 0.3)", text: "#60a5fa", label: "IMPORT MOD" },
  block_movement:        { bg: "rgba(14, 165, 233, 0.12)", border: "rgba(14, 165, 233, 0.3)", text: "#38bdf8", label: "MOVED BLOCK" },
  whitespace_formatting: { bg: "rgba(113, 113, 122, 0.12)",border: "rgba(113, 113, 122, 0.2)",text: "#71717a", label: "FORMATTING ONLY" },
};

export function AtlasPrismDiffPanel({ filePath, oldContent, newContent }: AtlasPrismDiffPanelProps) {
  const [diffResult, setDiffResult] = useState<PrismDiffResult | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [hideWhitespace, setHideWhitespace] = useState<boolean>(true);
  const [expandedHunks, setExpandedHunks] = useState<Set<string>>(new Set());

  useEffect(() => {
    const res = atlasPrism.analyzeDiff(filePath, oldContent, newContent);
    setDiffResult(res);
  }, [filePath, oldContent, newContent]);

  if (!diffResult) return null;

  const toggleHunk = (id: string) => {
    setExpandedHunks((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredHunks = diffResult.structuralHunks.filter((hunk) => {
    if (hideWhitespace && hunk.category === "whitespace_formatting") return false;
    if (filterCategory === "all") return true;
    return hunk.category === filterCategory;
  });

  return (
    <div style={styles.container}>
      {/* Header Bar */}
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <GitCompare size={16} color="#c084fc" />
          <span style={styles.title}>ATLAS PRISM — STRUCTURAL AST DIFF</span>
        </div>
        <span style={styles.filePath}>{filePath}</span>
      </div>

      {/* Stats Summary */}
      <div style={styles.statsBar}>
        <div style={styles.statChip}>
          <FileCode size={12} color="#f87171" />
          <span>{diffResult.changeStats.functionsChanged} Functions Changed</span>
        </div>
        <div style={styles.statChip}>
          <Layers size={12} color="#fbbf24" />
          <span>{diffResult.changeStats.logicChanges} Logic Blocks</span>
        </div>
        <div style={styles.statChip}>
          <CheckCircle2 size={12} color="#60a5fa" />
          <span>{diffResult.changeStats.importsChanged} Import Mods</span>
        </div>
        <div style={styles.statChip}>
          <span>{diffResult.changeStats.formattingOnlyLines} Formatting Lines</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        <Filter size={12} color="#9ca3af" />
        <select
          style={styles.select}
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="all">All Change Types</option>
          <option value="function_signature">Function Signatures</option>
          <option value="logic_modification">Logic Modifications</option>
          <option value="import_reorder">Imports</option>
          <option value="whitespace_formatting">Formatting/Whitespace</option>
        </select>

        <button
          style={{
            ...styles.toggleBtn,
            backgroundColor: hideWhitespace ? "rgba(192, 132, 252, 0.15)" : "transparent",
            color: hideWhitespace ? "#c084fc" : "#71717a",
          }}
          onClick={() => setHideWhitespace(!hideWhitespace)}
        >
          {hideWhitespace ? <EyeOff size={12} /> : <Eye size={12} />}
          <span>{hideWhitespace ? "Hiding Whitespace" : "Showing Whitespace"}</span>
        </button>
      </div>

      {/* Hunks Stream */}
      <div style={styles.hunksContainer}>
        {filteredHunks.length === 0 ? (
          <div style={styles.emptyState}>No structural changes matching the active filter</div>
        ) : (
          filteredHunks.map((hunk) => {
            const cat = CATEGORY_COLORS[hunk.category];
            const isExpanded = expandedHunks.has(hunk.id);

            return (
              <div key={hunk.id} style={{ ...styles.hunkCard, borderColor: cat.border }}>
                <div style={styles.hunkHeader} onClick={() => toggleHunk(hunk.id)}>
                  <button style={styles.expandBtn}>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                  <span style={{ ...styles.categoryBadge, backgroundColor: cat.bg, color: cat.text, borderColor: cat.border }}>
                    {cat.label}
                  </span>
                  <span style={styles.hunkSummary}>{hunk.summary}</span>
                  <span style={styles.lineNumbers}>
                    L{hunk.oldLineStart} → L{hunk.newLineStart}
                  </span>
                </div>

                {isExpanded && (
                  <div style={styles.hunkBody}>
                    <div style={styles.diffLineOld}>
                      <span style={styles.linePrefix}>-</span>
                      <code>{hunk.oldText}</code>
                    </div>
                    <div style={styles.diffLineNew}>
                      <span style={styles.linePrefix}>+</span>
                      <code>{hunk.newText}</code>
                    </div>
                  </div>
                )}
              </div>
            );
          })
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
    color: "#f4f4f5",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: "12px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    backgroundColor: "#111113",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  title: {
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "#c084fc",
    fontSize: "11px",
  },
  filePath: {
    fontFamily: "'JetBrains Mono', Consolas, monospace",
    color: "#71717a",
    fontSize: "11px",
  },
  statsBar: {
    display: "flex",
    gap: "8px",
    padding: "8px 14px",
    backgroundColor: "#0d0d10",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  statChip: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "3px 8px",
    backgroundColor: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "4px",
    fontSize: "11px",
    color: "#a1a1aa",
  },
  filterBar: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  select: {
    backgroundColor: "#111113",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "4px",
    color: "#d4d4d8",
    padding: "4px 8px",
    fontSize: "11px",
    outline: "none",
  },
  toggleBtn: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    border: "1px solid rgba(192, 132, 252, 0.2)",
    borderRadius: "4px",
    padding: "4px 8px",
    fontSize: "11px",
    cursor: "pointer",
  },
  hunksContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  emptyState: {
    padding: "24px",
    textAlign: "center",
    color: "#52525b",
  },
  hunkCard: {
    backgroundColor: "#111113",
    border: "1px solid",
    borderRadius: "6px",
    overflow: "hidden",
  },
  hunkHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 10px",
    cursor: "pointer",
  },
  expandBtn: {
    background: "none",
    border: "none",
    color: "#a1a1aa",
    padding: 0,
    cursor: "pointer",
    display: "flex",
  },
  categoryBadge: {
    fontSize: "9px",
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: "3px",
    border: "1px solid",
    letterSpacing: "0.05em",
  },
  hunkSummary: {
    flex: 1,
    fontWeight: 500,
    color: "#e4e4e7",
  },
  lineNumbers: {
    fontFamily: "monospace",
    color: "#71717a",
    fontSize: "10px",
  },
  hunkBody: {
    borderTop: "1px solid rgba(255,255,255,0.04)",
    padding: "8px 12px",
    fontFamily: "'JetBrains Mono', Consolas, monospace",
    fontSize: "11px",
    backgroundColor: "#0d0d10",
  },
  diffLineOld: {
    display: "flex",
    gap: "8px",
    color: "#f87171",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    padding: "2px 6px",
    borderRadius: "2px",
    marginBottom: "4px",
  },
  diffLineNew: {
    display: "flex",
    gap: "8px",
    color: "#34d399",
    backgroundColor: "rgba(52, 211, 153, 0.08)",
    padding: "2px 6px",
    borderRadius: "2px",
  },
  linePrefix: {
    fontWeight: 700,
    userSelect: "none",
  },
};
