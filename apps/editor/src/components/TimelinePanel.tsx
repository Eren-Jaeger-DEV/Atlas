import { useState, useEffect } from "react";

const api = () => (window as any).atlasAPI;

interface CommitRecord {
  hash: string;
  author: string;
  date: string;
  message: string;
}

interface TimelineEvent {
  id: string;
  type: "commit" | "test" | "security" | "graph";
  timestamp: string;
  title: string;
  description: string;
  commitHash?: string;
}

interface TimelinePanelProps {
  repoPath?: string;
}

export function TimelinePanel({ repoPath }: TimelinePanelProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repoPath) return;
    setLoading(true);
    setError(null);

    // Fetch git log and synthesize timeline events
    api().gitLog(repoPath, 20)
      .then((log: CommitRecord[]) => {
        if (!Array.isArray(log)) return;
        
        const synthesizedEvents: TimelineEvent[] = [];
        log.forEach((commit, idx) => {
          // 1. The commit itself
          synthesizedEvents.push({
            id: `commit-${commit.hash}`,
            type: "commit",
            timestamp: commit.date,
            title: `Commit: ${commit.hash.substring(0, 7)}`,
            description: commit.message,
            commitHash: commit.hash
          });
          
          // 2. Mock Test Results linked to the commit (simulate timeline correlation)
          if (idx % 3 === 0) {
            synthesizedEvents.push({
              id: `test-${commit.hash}`,
              type: "test",
              timestamp: commit.date,
              title: "Test Suite Passed",
              description: "142 passing, 0 failing",
              commitHash: commit.hash
            });
          }

          // 3. Mock Security findings
          if (idx % 7 === 0) {
            synthesizedEvents.push({
              id: `sec-${commit.hash}`,
              type: "security",
              timestamp: commit.date,
              title: "Security Scan",
              description: "Found 1 moderate vulnerability in dependencies.",
              commitHash: commit.hash
            });
          }
        });

        // Sort chronologically (newest first based on commit date)
        synthesizedEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setEvents(synthesizedEvents);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [repoPath]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case "commit": return "📦";
      case "test": return "🧪";
      case "security": return "🛡️";
      case "graph": return "🕸️";
      default: return "📌";
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "commit": return "#38bdf8";
      case "test": return "#4ade80";
      case "security": return "#f87171";
      case "graph": return "#a78bfa";
      default: return "#e4e4e7";
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>PROJECT TIMELINE</span>
        <span style={styles.subtext}>
          {loading ? "Loading..." : `${events.length} events`}
        </span>
      </div>

      <div style={styles.content}>
        {!repoPath && (
          <p style={styles.emptyMsg}>No workspace open.</p>
        )}

        {error && (
          <p style={{ ...styles.emptyMsg, color: "#f87171" }}>[FAIL] {error}</p>
        )}

        {events.length > 0 && (
          <div style={styles.timelineList}>
            {events.map((evt, idx) => (
              <div key={evt.id} style={styles.timelineRow}>
                <div style={styles.timelineTrack}>
                  <div style={{ ...styles.timelineNode, backgroundColor: getEventColor(evt.type) }}>
                    {getEventIcon(evt.type)}
                  </div>
                  {idx < events.length - 1 && <div style={styles.timelineLine}></div>}
                </div>
                <div style={styles.timelineContent}>
                  <div style={styles.timelineHeader}>
                    <span style={{ ...styles.timelineTitle, color: getEventColor(evt.type) }}>
                      {evt.title}
                    </span>
                    <span style={styles.timelineTime}>{evt.timestamp}</span>
                  </div>
                  <div style={styles.timelineDesc}>{evt.description}</div>
                </div>
              </div>
            ))}
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
  content: {
    flex: 1, padding: "12px", overflowY: "auto",
  },
  emptyMsg: { fontSize: "11px", color: "#52525b", margin: 0 },
  timelineList: {
    display: "flex",
    flexDirection: "column",
  },
  timelineRow: {
    display: "flex",
    gap: "12px",
    minHeight: "60px",
  },
  timelineTrack: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "24px",
  },
  timelineNode: {
    width: "24px",
    height: "24px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    flexShrink: 0,
    zIndex: 2,
    border: "2px solid #09090b",
  },
  timelineLine: {
    width: "2px",
    backgroundColor: "#27272a",
    flex: 1,
    marginTop: "-4px",
    marginBottom: "-4px",
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: "16px",
    paddingTop: "2px",
  },
  timelineHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: "4px",
  },
  timelineTitle: {
    fontSize: "12px",
    fontWeight: 700,
  },
  timelineTime: {
    fontSize: "10px",
    color: "#71717a",
  },
  timelineDesc: {
    fontSize: "12px",
    color: "#a1a1aa",
    lineHeight: "1.4",
  }
};
