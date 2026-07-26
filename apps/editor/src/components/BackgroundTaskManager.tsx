import { useState, useEffect } from "react";

export function BackgroundTaskManager() {
  const [tasks, setTasks] = useState<Array<{ id: string; command: string; status: string; startedAt: number }>>([]);

  const refreshTasks = async () => {
    const api = (window as any).atlasAPI;
    if (api?.getBackgroundTasks) {
      try {
        const list = await api.getBackgroundTasks();
        if (list) setTasks(list);
      } catch (e) {}
    }
  };

  useEffect(() => {
    refreshTasks();
    const interval = setInterval(refreshTasks, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleKill = async (taskId: string) => {
    const api = (window as any).atlasAPI;
    if (api?.killBackgroundTask) {
      await api.killBackgroundTask(taskId);
      refreshTasks();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Background Processes</span>
        <button style={styles.refreshBtn} onClick={refreshTasks}>Refresh</button>
      </div>

      <div style={styles.taskList}>
        {tasks.length === 0 ? (
          <div style={styles.empty}>No background terminal tasks currently running.</div>
        ) : (
          tasks.map(t => (
            <div key={t.id} style={styles.taskCard}>
              <div style={styles.cardHeader}>
                <span style={styles.taskCmd}>{t.command}</span>
                <span style={styles.statusBadge}>{t.status}</span>
              </div>
              <div style={styles.cardActions}>
                <button style={styles.killBtn} onClick={() => handleKill(t.id)}>
                  Stop / Kill
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles: Record<string, any> = {
  container: { padding: "12px", color: "#e4e4e7", fontSize: "12px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
  title: { fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", color: "#38bdf8" },
  refreshBtn: { background: "rgba(255,255,255,0.06)", border: "none", color: "#a1a1aa", fontSize: "11px", padding: "3px 8px", borderRadius: "4px", cursor: "pointer" },
  taskList: { display: "flex", flexDirection: "column", gap: "8px" },
  empty: { color: "#71717a", fontSize: "12px", textAlign: "center", padding: "20px 0" },
  taskCard: { backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", padding: "10px" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" },
  taskCmd: { fontFamily: "var(--font-mono)", fontSize: "11.5px", color: "#e4e4e7" },
  statusBadge: { backgroundColor: "rgba(74,222,128,0.15)", color: "#4ade80", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 600 },
  cardActions: { display: "flex", justifyContent: "flex-end" },
  killBtn: { backgroundColor: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", cursor: "pointer" },
};
