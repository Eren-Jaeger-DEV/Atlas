import React, { useState, useRef, useEffect } from "react";

interface WebPreviewPanelProps {
  initialUrl?: string;
  onClose?: () => void;
}

type ViewportMode = "desktop" | "tablet" | "mobile";

const VIEWPORT_SIZES: Record<ViewportMode, { width: string; height: string; label: string }> = {
  desktop: { width: "100%", height: "100%", label: "Desktop (100%)" },
  tablet: { width: "768px", height: "1024px", label: "Tablet (768px)" },
  mobile: { width: "375px", height: "812px", label: "Mobile (375px)" },
};

export const WebPreviewPanel: React.FC<WebPreviewPanelProps> = ({
  initialUrl = "http://localhost:5173",
  onClose,
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [key, setKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleRefresh = () => {
    setKey((prev) => prev + 1);
  };

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let target = inputUrl.trim();
    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      target = "http://" + target;
    }
    setUrl(target);
    setInputUrl(target);
  };

  useEffect(() => {
    const handleFileEvent = () => {
      // Auto-reload preview iframe when agent writes code edits
      handleRefresh();
    };
    window.addEventListener("atlas:file-changed", handleFileEvent);
    return () => window.removeEventListener("atlas:file-changed", handleFileEvent);
  }, []);

  const size = VIEWPORT_SIZES[viewport];

  return (
    <div style={styles.container}>
      {/* Top Controls Bar */}
      <div style={styles.toolbar}>
        {/* Navigation Controls */}
        <button onClick={handleRefresh} style={styles.iconBtn} title="Reload Preview">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M23 4v6h-6" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>

        {/* Address Bar */}
        <form onSubmit={handleNavigate} style={styles.urlForm}>
          <span style={styles.urlProtocol}>[WEB]</span>
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            style={styles.urlInput}
            placeholder="http://localhost:5173"
          />
        </form>

        {/* Viewport Preset Toggles */}
        <div style={styles.presetGroup}>
          {(["desktop", "tablet", "mobile"] as ViewportMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewport(mode)}
              style={{
                ...styles.presetBtn,
                backgroundColor: viewport === mode ? "rgba(56, 189, 248, 0.2)" : "transparent",
                color: viewport === mode ? "#38bdf8" : "#a1a1aa",
                borderColor: viewport === mode ? "rgba(56, 189, 248, 0.4)" : "#27272a",
              }}
            >
              {mode.toUpperCase()}
            </button>
          ))}
        </div>

        {onClose && (
          <button onClick={onClose} style={styles.iconBtn} title="Close Preview">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Preview Viewport Canvas */}
      <div style={styles.canvas}>
        <div
          style={{
            width: size.width,
            height: size.height,
            maxHeight: "100%",
            transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            boxShadow: viewport !== "desktop" ? "0 12px 36px rgba(0,0,0,0.6)" : "none",
            borderRadius: viewport !== "desktop" ? "8px" : "0",
            overflow: "hidden",
            backgroundColor: "#ffffff",
          }}
        >
          <iframe
            key={key}
            ref={iframeRef}
            src={url}
            title="Live Web Preview"
            style={styles.iframe}
            sandbox="allow-same-origin allow-scripts allow-forms allow-modals allow-popups"
          />
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100%",
    backgroundColor: "#09090b",
    color: "#e4e4e7",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "6px 12px",
    backgroundColor: "#18181b",
    borderBottom: "1px solid #27272a",
  },
  iconBtn: {
    background: "none",
    border: "none",
    color: "#a1a1aa",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  urlForm: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    backgroundColor: "#09090b",
    border: "1px solid #27272a",
    borderRadius: "6px",
    padding: "0 8px",
    gap: "6px",
  },
  urlProtocol: {
    fontSize: "10px",
    fontWeight: 700,
    color: "#38bdf8",
    fontFamily: "var(--font-mono)",
  },
  urlInput: {
    flex: 1,
    backgroundColor: "transparent",
    border: "none",
    color: "#fafafa",
    fontSize: "12px",
    fontFamily: "var(--font-mono)",
    padding: "6px 0",
    outline: "none",
  },
  presetGroup: {
    display: "flex",
    gap: "4px",
  },
  presetBtn: {
    border: "1px solid #27272a",
    borderRadius: "4px",
    fontSize: "10px",
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    padding: "3px 8px",
    cursor: "pointer",
  },
  canvas: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
    overflow: "auto",
    padding: "16px",
  },
  iframe: {
    width: "100%",
    height: "100%",
    border: "none",
  },
};
