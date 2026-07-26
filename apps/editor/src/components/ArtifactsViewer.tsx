import { useState, useEffect } from "react";

interface ArtifactsViewerProps {
  repoPath?: string;
  onClose?: () => void;
}

export function ArtifactsViewer({ repoPath, onClose }: ArtifactsViewerProps) {
  const [artifacts, setArtifacts] = useState<Array<{ name: string; content: string }>>([]);
  const [activeArtifact, setActiveArtifact] = useState<string>("implementation_plan.md");

  useEffect(() => {
    const loadArtifacts = async () => {
      const api = (window as any).atlasAPI;
      if (api?.loadArtifacts && repoPath) {
        try {
          const loaded = await api.loadArtifacts(repoPath);
          if (loaded && loaded.length > 0) {
            setArtifacts(loaded);
            setActiveArtifact(loaded[0].name);
          }
        } catch (e) {}
      }
    }
    loadArtifacts();
  }, [repoPath]);

  const currentContent = artifacts.find(a => a.name === activeArtifact)?.content || "# No artifacts generated yet.\n\nRun an agent task with Planning Mode enabled to generate implementation plans, task checklists, and walkthroughs.";

  return (
    <div style={styles.container} className="anim-scale-in">
      <div style={styles.header}>
        <div style={styles.title}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Artifacts Viewer
        </div>
        <button style={styles.closeBtn} onClick={onClose}>&times;</button>
      </div>

      <div style={styles.tabs}>
        {artifacts.length === 0 ? (
          <div style={styles.tab(true)}>No Artifacts</div>
        ) : (
          artifacts.map(a => (
            <div
              key={a.name}
              style={styles.tab(a.name === activeArtifact)}
              onClick={() => setActiveArtifact(a.name)}
            >
              {a.name}
            </div>
          ))
        )}
      </div>

      <div style={styles.content}>
        <pre style={styles.markdownPre}>{currentContent}</pre>
      </div>
    </div>
  );
}

const styles: Record<string, any> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#0f0f13",
    color: "#e4e4e7",
    fontSize: "13px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  title: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "#38bdf8",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#a1a1aa",
    fontSize: "18px",
    cursor: "pointer",
  },
  tabs: {
    display: "flex",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    overflowX: "auto",
  },
  tab: (active: boolean) => ({
    padding: "8px 14px",
    fontSize: "11.5px",
    color: active ? "#38bdf8" : "#a1a1aa",
    backgroundColor: active ? "rgba(56,189,248,0.08)" : "transparent",
    borderBottom: active ? "2px solid #38bdf8" : "2px solid transparent",
    cursor: "pointer",
    whiteSpace: "nowrap",
  }),
  content: {
    flex: 1,
    padding: "14px",
    overflowY: "auto",
  },
  markdownPre: {
    margin: 0,
    fontFamily: "var(--font-ui)",
    fontSize: "12.5px",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    color: "#e4e4e7",
  },
};
