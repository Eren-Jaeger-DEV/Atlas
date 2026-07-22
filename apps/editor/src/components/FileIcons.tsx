interface FileIconProps {
  fileName: string;
  isDirectory?: boolean;
  isOpen?: boolean;
}

export function FileIcon({ fileName, isDirectory, isOpen }: FileIconProps) {
  if (isDirectory) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", marginRight: "6px" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted, #71717a)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted, #a1a1aa)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      </span>
    );
  }

  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  switch (ext) {
    case "ts":
    case "tsx":
      return (
        <span style={{ display: "inline-flex", alignItems: "center", color: "#3178c6", fontSize: "11px", fontWeight: 600, marginRight: "6px", fontFamily: "sans-serif" }}>
          TS
        </span>
      );
    case "js":
    case "jsx":
      return (
        <span style={{ display: "inline-flex", alignItems: "center", color: "#f7df1e", fontSize: "11px", fontWeight: 600, marginRight: "6px", fontFamily: "sans-serif" }}>
          JS
        </span>
      );
    case "json":
      return (
        <span style={{ display: "inline-flex", alignItems: "center", color: "#f59e0b", fontSize: "12px", fontWeight: 600, marginRight: "6px", fontFamily: "monospace" }}>
          {"{}"}
        </span>
      );
    case "md":
      return (
        <span style={{ display: "inline-flex", alignItems: "center", color: "var(--accent, #38bdf8)", fontSize: "11px", fontWeight: 600, marginRight: "6px", fontFamily: "sans-serif" }}>
          MD
        </span>
      );
    case "py":
      return (
        <span style={{ display: "inline-flex", alignItems: "center", color: "#3b82f6", fontSize: "11px", fontWeight: 600, marginRight: "6px", fontFamily: "sans-serif" }}>
          PY
        </span>
      );
    case "css":
    case "scss":
      return (
        <span style={{ display: "inline-flex", alignItems: "center", color: "#ec4899", fontSize: "12px", fontWeight: 600, marginRight: "6px", fontFamily: "sans-serif" }}>
          #
        </span>
      );
    case "html":
      return (
        <span style={{ display: "inline-flex", alignItems: "center", color: "#ea580c", fontSize: "11px", fontWeight: 600, marginRight: "6px", fontFamily: "monospace" }}>
          &lt;&gt;
        </span>
      );
    default:
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted, #71717a)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}>
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <polyline points="13 2 13 9 20 9" />
        </svg>
      );
  }
}
