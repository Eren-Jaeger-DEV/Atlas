import React from "react";

interface VideoViewerProps {
  filePath: string;
}

export function VideoViewer({ filePath }: VideoViewerProps) {
  const src = `file://${filePath.replace(/\\/g, "/")}`;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      height: "100%",
      backgroundColor: "#09090b", // Editor background
      overflow: "auto"
    }}>
      <video 
        src={src} 
        controls
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
        }}
      />
    </div>
  );
}
