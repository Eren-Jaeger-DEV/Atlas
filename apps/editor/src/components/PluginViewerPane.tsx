import React, { useEffect, useState } from "react";
import DOMPurify from "dompurify";

interface PluginViewerPaneProps {
  filePath: string;
}

export const PluginViewerPane: React.FC<PluginViewerPaneProps> = ({ filePath }) => {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const api = (window as any).atlasAPI;

    if (api && api.getFileViewer) {
      api.getFileViewer(filePath)
        .then((res: any) => {
          if (!isMounted) return;
          if (res && res.supported && res.html) {
            setHtmlContent(res.html);
            setError(null);
          } else if (res && res.error) {
            setError(res.error);
          } else {
            setError("No registered viewer for file.");
          }
        })
        .catch((err: any) => {
          if (isMounted) setError(err.message);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    } else {
      setLoading(false);
      setError("Viewer API unavailable.");
    }

    return () => {
      isMounted = false;
    };
  }, [filePath]);

  if (loading) {
    return (
      <div style={{ padding: 24, color: "#a1a1aa", fontFamily: "sans-serif" }}>
        Rendering preview...
      </div>
    );
  }

  if (error || !htmlContent) {
    return (
      <div style={{ padding: 24, color: "#ef4444", fontFamily: "sans-serif" }}>
        {error || "Unable to render file preview."}
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", overflow: "auto", background: "#09090b", color: "#f4f4f5", padding: "32px 48px", boxSizing: "border-box" }}>
      <div
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }}
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          lineHeight: 1.6,
          maxWidth: 900,
          margin: "0 auto"
        }}
      />
    </div>
  );
};
