import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { SettingsApp } from "./SettingsApp.js";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

const urlParams = new URLSearchParams(window.location.search);
const isSettingsWindow = urlParams.get("window") === "settings";

createRoot(root).render(
  <StrictMode>
    {isSettingsWindow ? <SettingsApp /> : <App />}
  </StrictMode>
);
