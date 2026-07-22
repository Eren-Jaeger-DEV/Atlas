import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { SettingsApp } from "./SettingsApp.js";
import { LocalTokenStore } from "@atlas/core";

// Initialize Secure Storage Dependency Injection
LocalTokenStore.initialize({
  setSecureItem: async (k: string, v: string) => { if (window.atlasAPI?.setSecureKey) await window.atlasAPI.setSecureKey(k, v); },
  getSecureItem: async (k: string) => window.atlasAPI?.getSecureKey ? await window.atlasAPI.getSecureKey(k) || null : null,
  removeSecureItem: async (k: string) => { if (window.atlasAPI?.removeSecureKey) await window.atlasAPI.removeSecureKey(k); }
});

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

const urlParams = new URLSearchParams(window.location.search);
const isSettingsWindow = urlParams.get("window") === "settings";

createRoot(root).render(
  <StrictMode>
    {isSettingsWindow ? <SettingsApp /> : <App />}
  </StrictMode>
);
