// STUB - This component is a visual mockup. It does not integrate with atlasAPI to read or write real conflict markers.
import { useState } from "react";

interface MergeConflictBlock {
  id: number;
  currentChange: string;
  incomingChange: string;
  resolved: boolean;
  chosen?: "current" | "incoming" | "both";
}

interface MergeConflictEditorProps {
  filePath: string;
  conflictBlocks?: MergeConflictBlock[];
  onComplete: () => void;
}

export function MergeConflictEditor({
  filePath,
  conflictBlocks = [],
  onComplete,
}: MergeConflictEditorProps) {
  const [blocks, setBlocks] = useState<MergeConflictBlock[]>(conflictBlocks);

  const resolveBlock = (id: number, choice: "current" | "incoming" | "both") => {
    setBlocks(prev =>
      prev.map(b => (b.id === id ? { ...b, resolved: true, chosen: choice } : b))
    );
  };

  const unresolvedCount = blocks.filter(b => !b.resolved).length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <span style={styles.title}>3-WAY MERGE CONFLICT RESOLVER</span>
          <span style={styles.filePath}>{filePath}</span>
        </div>
        <div style={styles.rightGroup}>
          <span style={styles.statusBadge}>
            {unresolvedCount === 0 ? "[PASS] All Resolved" : `${unresolvedCount} Conflict(s)`}
          </span>
          <button
            style={{ ...styles.completeBtn, opacity: unresolvedCount === 0 ? 1 : 0.6 }}
            disabled={unresolvedCount > 0}
            onClick={onComplete}
          >
            Mark Conflict Resolved
          </button>
        </div>
      </div>

      <div style={styles.body}>
        {blocks.map((block, idx) => (
          <div key={block.id} style={styles.conflictCard}>
            <div style={styles.cardHeader}>
              <span style={styles.conflictLabel}>Conflict #{idx + 1}</span>
              <div style={styles.actionRow}>
                <button
                  style={{
                    ...styles.actionBtn,
                    backgroundColor: block.chosen === "current" ? "#1e3a8a" : "#18181b",
                    color: "#60a5fa",
                  }}
                  onClick={() => resolveBlock(block.id, "current")}
                >
                  Accept Current (Ours)
                </button>
                <button
                  style={{
                    ...styles.actionBtn,
                    backgroundColor: block.chosen === "incoming" ? "#14532d" : "#18181b",
                    color: "#4ade80",
                  }}
                  onClick={() => resolveBlock(block.id, "incoming")}
                >
                  Accept Incoming (Theirs)
                </button>
                <button
                  style={{
                    ...styles.actionBtn,
                    backgroundColor: block.chosen === "both" ? "#3f3f46" : "#18181b",
                    color: "#fafafa",
                  }}
                  onClick={() => resolveBlock(block.id, "both")}
                >
                  Accept Both
                </button>
              </div>
            </div>

            <div style={styles.diffSplit}>
              <div style={styles.diffPane}>
                <p style={styles.paneHdr}>CURRENT CHANGE (OURS)</p>
                <pre style={styles.codeText}>{block.currentChange}</pre>
              </div>

              <div style={styles.diffPane}>
                <p style={styles.paneHdr}>INCOMING CHANGE (THEIRS)</p>
                <pre style={styles.codeText}>{block.incomingChange}</pre>
              </div>
            </div>
          </div>
        ))}
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
    padding: "10px 16px",
    backgroundColor: "#141417",
    borderBottom: "1px solid #27272a",
  },
  title: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.8px",
    color: "#f87171",
    marginRight: "10px",
  },
  filePath: {
    fontSize: "12px",
    color: "#71717a",
  },
  rightGroup: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  statusBadge: {
    fontSize: "11px",
    color: "#4ade80",
    backgroundColor: "rgba(74, 222, 128, 0.1)",
    padding: "3px 8px",
    borderRadius: "4px",
  },
  completeBtn: {
    backgroundColor: "#fafafa",
    color: "#09090b",
    border: "none",
    borderRadius: "4px",
    padding: "6px 14px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  body: {
    flex: 1,
    padding: "16px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  conflictCard: {
    backgroundColor: "#141417",
    border: "1px solid #27272a",
    borderRadius: "8px",
    padding: "14px",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px",
  },
  conflictLabel: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#fafafa",
  },
  actionRow: {
    display: "flex",
    gap: "8px",
  },
  actionBtn: {
    border: "1px solid #27272a",
    borderRadius: "4px",
    padding: "4px 10px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
  },
  diffSplit: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  diffPane: {
    backgroundColor: "#09090b",
    border: "1px solid #27272a",
    borderRadius: "6px",
    padding: "10px",
  },
  paneHdr: {
    fontSize: "10px",
    fontWeight: 700,
    color: "#71717a",
    margin: "0 0 6px",
  },
  codeText: {
    margin: 0,
    fontFamily: "'JetBrains Mono', Consolas, monospace",
    fontSize: "12px",
    color: "#e4e4e7",
  },
};
