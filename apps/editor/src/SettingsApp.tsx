import React, { useState, useEffect } from "react";
import { SettingsPanel, EditorSettings, DEFAULT_SETTINGS } from "./components/SettingsPanel.js";
import "./global.css";

const api = () => (window as any).atlasAPI;

export function SettingsApp() {
  const [settings, setSettings] = useState<EditorSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const a = api();
    if (a?.getSettings) {
      a.getSettings().then((s: any) => {
        if (s) setSettings(s);
      });
    }

    if (a?.onSettingsUpdated) {
      return a.onSettingsUpdated((newSettings: any) => {
        setSettings(newSettings);
      });
    }
  }, []);

  const handleUpdateSettings = (newSettings: EditorSettings) => {
    setSettings(newSettings);
    api()?.updateSettings?.(newSettings);
  };

  return (
    <div style={{ height: "100vh", backgroundColor: "#000000", color: "#e4e4e7", display: "flex", flexDirection: "column" }}>
      <header style={{ 
        WebkitAppRegion: "drag", 
        padding: "16px 20px", 
        borderBottom: "1px solid #27272a", 
        backgroundColor: "#000000",
        fontWeight: "bold",
        fontSize: "14px",
        display: "flex",
        alignItems: "center"
      } as React.CSSProperties}>
        Settings - Atlas Studio
      </header>
      <div style={{ flex: 1, overflow: "auto" }}>
        <SettingsPanel settings={settings} onUpdateSettings={handleUpdateSettings} />
      </div>
    </div>
  );
}
