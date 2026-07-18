import { useState } from "react";

interface ExtensionCardData {
  id: string;
  name: string;
  version: string;
  publisher: string;
  description: string;
  installed: boolean;
  permissions: string[];
}

export function ExtensionGallery() {
  const [search, setSearch] = useState("");
  const [extensions, setExtensions] = useState<ExtensionCardData[]>([
    {
      id: "atlas.git-lens",
      name: "Atlas GitLens",
      version: "1.0.0",
      publisher: "Atlas Team",
      description: "Blame annotations and rich commit history inspector.",
      installed: true,
      permissions: ["workspace.read", "terminal.execute"],
    },
    {
      id: "atlas.prettier",
      name: "Prettier Code Formatter",
      version: "2.4.0",
      publisher: "Prettier Org",
      description: "Opinionated code formatter for JS, TS, HTML, JSON, CSS.",
      installed: false,
      permissions: ["workspace.write"],
    },
    {
      id: "atlas.docker-tools",
      name: "Docker & Container Tools",
      version: "0.8.2",
      publisher: "Container Devs",
      description: "Inspect local container logs and manage Docker compose.",
      installed: false,
      permissions: ["terminal.execute"],
    },
  ]);

  const toggleInstall = (id: string) => {
    setExtensions(prev =>
      prev.map(ext => (ext.id === id ? { ...ext, installed: !ext.installed } : ext))
    );
  };

  const filtered = extensions.filter(
    ext =>
      ext.name.toLowerCase().includes(search.toLowerCase()) ||
      ext.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>EXTENSIONS MARKETPLACE</span>
        <span style={styles.subtext}>{extensions.length} Available</span>
      </div>

      <div style={styles.searchBox}>
        <input
          style={styles.searchInput}
          placeholder="Search extensions in marketplace..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div style={styles.list}>
        {filtered.map(ext => (
          <div key={ext.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <p style={styles.extName}>{ext.name}</p>
                <p style={styles.extMeta}>
                  v{ext.version} by <span style={{ color: "#38bdf8" }}>{ext.publisher}</span>
                </p>
              </div>

              <button
                style={{
                  ...styles.actionBtn,
                  ...(ext.installed ? styles.installedBtn : styles.installBtn),
                }}
                onClick={() => toggleInstall(ext.id)}
              >
                {ext.installed ? "Uninstall" : "Install"}
              </button>
            </div>

            <p style={styles.extDesc}>{ext.description}</p>

            <div style={styles.permList}>
              {ext.permissions.map(p => (
                <span key={p} style={styles.permBadge}>
                  {p}
                </span>
              ))}
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
    backgroundColor: "#0d0d10",
    color: "#fafafa",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    backgroundColor: "#09090b",
    borderBottom: "1px solid #27272a",
  },
  title: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.8px",
  },
  subtext: {
    fontSize: "11px",
    color: "#71717a",
  },
  searchBox: {
    padding: "10px 12px",
    borderBottom: "1px solid #27272a",
  },
  searchInput: {
    width: "100%",
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    color: "#fafafa",
    borderRadius: "6px",
    padding: "6px 10px",
    fontSize: "12px",
    outline: "none",
  },
  list: {
    flex: 1,
    padding: "12px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  card: {
    backgroundColor: "#141417",
    border: "1px solid #27272a",
    borderRadius: "6px",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  extName: {
    fontSize: "13px",
    fontWeight: 700,
    margin: "0 0 2px",
    color: "#fafafa",
  },
  extMeta: {
    fontSize: "10px",
    color: "#71717a",
    margin: 0,
  },
  extDesc: {
    fontSize: "11px",
    color: "#a1a1aa",
    margin: 0,
    lineHeight: "1.4",
  },
  actionBtn: {
    border: "none",
    borderRadius: "4px",
    padding: "4px 10px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
  },
  installBtn: {
    backgroundColor: "#fafafa",
    color: "#09090b",
  },
  installedBtn: {
    backgroundColor: "#27272a",
    color: "#f87171",
  },
  permList: {
    display: "flex",
    gap: "4px",
    flexWrap: "wrap",
    marginTop: "4px",
  },
  permBadge: {
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    color: "#71717a",
    fontSize: "9px",
    padding: "1px 5px",
    borderRadius: "3px",
    fontFamily: "monospace",
  },
};
