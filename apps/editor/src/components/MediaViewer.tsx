import React from "react";

interface MediaViewerProps {
  filePath: string;
}

export function MediaViewer({ filePath }: MediaViewerProps) {
  // Using file:// protocol which is common in desktop apps to load local assets
  const src = `file://${filePath.replace(/\\/g, "/")}`;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      height: "100%",
      backgroundColor: "#09090b", // Editor background
      overflow: "auto",
      padding: "20px"
    }}>
      <img 
        src={src} 
        alt={filePath}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
        }}
      />
    </div>
  );
}
