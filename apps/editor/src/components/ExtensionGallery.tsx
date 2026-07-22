import { useState, useEffect } from "react";

const api = () => (window as any).atlasAPI;

interface ExtensionManifest {
  id?: string;
  dirName?: string;
  name?: string;
  version?: string;
  publisher?: string;
  description?: string;
  permissions?: string[];
}

export function ExtensionGallery() {
  const [extensions, setExtensions] = useState<ExtensionManifest[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const loadExtensions = () => {
    setLoading(true);
    const a = api();
    if (!a?.listExtensions) {
      setExtensions([]);
      setLoading(false);
      return;
    }
    a.listExtensions()
      .then((list: ExtensionManifest[]) => {
        setExtensions(Array.isArray(list) ? list : []);
      })
      .catch(() => setExtensions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadExtensions();
  }, []);

  const handleInstall = async () => {
    try {
      const a = api();
      if (!a?.selectDirectory || !a?.installExtension) return;
      const dir = await a.selectDirectory();
      if (dir) {
        setLoading(true);
        await a.installExtension(dir);
        loadExtensions();
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const filtered = extensions.filter(ext => {
    const q = search.toLowerCase();
    return (
      (ext.name ?? "").toLowerCase().includes(q) ||
      (ext.description ?? "").toLowerCase().includes(q) ||
      (ext.id ?? ext.dirName ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.title}>EXTENSIONS MARKETPLACE</span>
          <span style={styles.subtext}>
            {loading ? "Scanning..." : `${extensions.length} Installed`}
          </span>
        </div>
        <button style={styles.installBtn} onClick={handleInstall} title="Install Local Extension...">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
        </button>
      </div>

      <div style={styles.searchBox}>
        <input
          style={styles.searchInput}
          placeholder="Filter installed extensions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div style={styles.list}>
        {!loading && extensions.length === 0 && (
          <div style={styles.emptyState}>
            <p style={styles.emptyTitle}>No Extensions Installed</p>
            <p style={styles.emptyDesc}>
              Install extensions by placing a folder containing a{" "}
              <code style={styles.code}>manifest.json</code> into the Atlas
              extensions directory. Marketplace integration is coming in a
              future release.
            </p>
            <p style={styles.emptyPath}>
              Extensions dir:{" "}
              <code style={styles.code}>%APPDATA%\atlas\extensions\</code>
            </p>
          </div>
        )}

        {filtered.map((ext, idx) => (
          <div key={ext.id ?? ext.dirName ?? idx} style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <p style={styles.extName}>{ext.name ?? ext.dirName ?? "Unknown Extension"}</p>
                <p style={styles.extMeta}>
                  v{ext.version ?? "?.?.?"} by{" "}
                  <span style={{ color: "#38bdf8" }}>{ext.publisher ?? "Unknown"}</span>
                </p>
              </div>
              <span style={styles.installedBadge}>[INSTALLED]</span>
            </div>

            {ext.description && (
              <p style={styles.extDesc}>{ext.description}</p>
            )}

            {Array.isArray(ext.permissions) && ext.permissions.length > 0 && (
              <div style={styles.permList}>
                {ext.permissions.map(p => (
                  <span key={p} style={styles.permBadge}>{p}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex", flexDirection: "column", height: "100%",
    backgroundColor: "#0d0d10", color: "#fafafa",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "8px 12px", backgroundColor: "#09090b", borderBottom: "1px solid #27272a",
  },
  headerLeft: { display: "flex", flexDirection: "column", gap: "2px" },
  title: { fontSize: "11px", fontWeight: 700, letterSpacing: "0.8px" },
  subtext: { fontSize: "11px", color: "#71717a" },
  installBtn: {
    backgroundColor: "transparent", border: "none", color: "#a1a1aa",
    cursor: "pointer", padding: "4px", borderRadius: "4px",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  searchBox: { padding: "10px 12px", borderBottom: "1px solid #27272a" },
  searchInput: {
    width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a",
    color: "#fafafa", borderRadius: "6px", padding: "6px 10px", fontSize: "12px", outline: "none",
    boxSizing: "border-box",
  },
  list: {
    flex: 1, padding: "12px", overflowY: "auto",
    display: "flex", flexDirection: "column", gap: "10px",
  },
  emptyState: {
    backgroundColor: "#141417", border: "1px solid #27272a",
    borderRadius: "8px", padding: "20px", display: "flex", flexDirection: "column", gap: "8px",
  },
  emptyTitle: { fontSize: "13px", fontWeight: 700, margin: 0, color: "#a1a1aa" },
  emptyDesc: { fontSize: "11px", color: "#71717a", margin: 0, lineHeight: "1.6" },
  emptyPath: { fontSize: "10px", color: "#52525b", margin: 0 },
  code: { fontFamily: "monospace", color: "#38bdf8", fontSize: "10px" },
  card: {
    backgroundColor: "#141417", border: "1px solid #27272a",
    borderRadius: "6px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px",
  },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  extName: { fontSize: "13px", fontWeight: 700, margin: "0 0 2px", color: "#fafafa" },
  extMeta: { fontSize: "10px", color: "#71717a", margin: 0 },
  installedBadge: {
    fontSize: "9px", fontWeight: 700, color: "#4ade80",
    backgroundColor: "rgba(74,222,128,0.08)", padding: "2px 6px",
    borderRadius: "3px", whiteSpace: "nowrap",
  },
  extDesc: { fontSize: "11px", color: "#a1a1aa", margin: 0, lineHeight: "1.4" },
  permList: { display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "2px" },
  permBadge: {
    backgroundColor: "#18181b", border: "1px solid #27272a", color: "#71717a",
    fontSize: "9px", padding: "1px 5px", borderRadius: "3px", fontFamily: "monospace",
  },
};
