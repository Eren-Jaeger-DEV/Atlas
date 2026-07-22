import { parse } from "jsonc-parser";
import { StorageProvider } from "@atlas/core";

export interface VSCodeTheme {
  name?: string;
  type?: "dark" | "light";
  colors?: Record<string, string>;
  tokenColors?: Array<{
    scope: string | string[];
    settings: {
      foreground?: string;
      background?: string;
      fontStyle?: string;
    };
  }>;
}

export class ThemeManager {
  private static instance: ThemeManager;
  public currentTheme: string = "atlas-dark";
  private storage: StorageProvider | null = null;

  private constructor() {}

  public static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }
  
  public setStorageProvider(storage: StorageProvider) {
    this.storage = storage;
  }

  public applyTheme(themeData: VSCodeTheme) {
    const isLight = themeData.type === "light";
    const colors = themeData.colors || {};

    // Map standard VS Code colors to our UI CSS variables
    const bgBase = colors["editor.background"] || (isLight ? "#ffffff" : "#0d0d10");
    const bgPanel = colors["sideBar.background"] || (isLight ? "#f3f4f6" : "#141417");
    const bgHeader = colors["titleBar.activeBackground"] || (isLight ? "#e5e7eb" : "#18181b");
    const border = colors["widget.border"] || colors["sideBar.border"] || (isLight ? "#d1d5db" : "#27272a");
    const textMain = colors["editor.foreground"] || (isLight ? "#111827" : "#fafafa");
    const textMuted = colors["descriptionForeground"] || (isLight ? "#6b7280" : "#a1a1aa");
    const accent = colors["textLink.foreground"] || colors["button.background"] || "#38bdf8";
    const hoverBg = isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)";

    const root = document.documentElement;
    root.style.setProperty("--bg-base", bgBase);
    root.style.setProperty("--bg-panel", bgPanel);
    root.style.setProperty("--bg-header", bgHeader);
    root.style.setProperty("--border-color", border);
    root.style.setProperty("--text-main", textMain);
    root.style.setProperty("--text-muted", textMuted);
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--hover-bg", hoverBg);

    // Convert token colors for Monaco
    const monacoRules: any[] = [];
    if (themeData.tokenColors) {
      for (const token of themeData.tokenColors) {
        const scopes = Array.isArray(token.scope) ? token.scope : [token.scope];
        for (const scope of scopes) {
          if (!scope) continue;
          let monacoToken = scope.split(".")[0]; 
          if (scope.includes("keyword")) monacoToken = "keyword";
          if (scope.includes("string")) monacoToken = "string";
          if (scope.includes("comment")) monacoToken = "comment";
          if (scope.includes("function")) monacoToken = "type";
          if (scope.includes("variable")) monacoToken = "identifier";
          if (scope.includes("number")) monacoToken = "number";

          monacoRules.push({
            token: monacoToken,
            foreground: token.settings.foreground?.replace("#", ""),
            fontStyle: token.settings.fontStyle
          });
        }
      }
    }

    const monacoTheme: any = {
      base: isLight ? "vs" : "vs-dark",
      inherit: true,
      rules: monacoRules,
      colors: {
        "editor.background": bgBase,
        "editor.foreground": textMain,
        "editorLineNumber.foreground": textMuted,
        ...colors
      }
    };

    const monaco = (window as any).monaco;
    if (monaco) {
      monaco.editor.defineTheme("custom-imported-theme", monacoTheme);
      monaco.editor.setTheme("custom-imported-theme");
    }
  }

  public async setLightMode() {
    this.applyTheme({
      type: "light",
      colors: {
        "editor.background": "#ffffff",
        "sideBar.background": "#f3f4f6",
        "titleBar.activeBackground": "#e5e7eb",
        "widget.border": "#d1d5db",
        "editor.foreground": "#111827",
        "descriptionForeground": "#6b7280",
        "button.background": "#0ea5e9",
        "dropdown.background": "#ffffff",
      }
    });
    this.currentTheme = "atlas-light";
    if (this.storage) await this.storage.setItem("atlas-theme", "atlas-light");
  }

  public async setCustomTheme(colors?: Record<string, string>) {
    if (!colors) return;
    this.applyTheme({
      type: "dark",
      colors: {
        "editor.background": colors["--bg-base"] || "#0d0d10",
        "sideBar.background": colors["--bg-panel"] || "#141417",
        "titleBar.activeBackground": colors["--bg-header"] || "#18181b",
        "widget.border": colors["--border-color"] || "#27272a",
        "editor.foreground": colors["--text-main"] || "#fafafa",
        "descriptionForeground": colors["--text-muted"] || "#a1a1aa",
        "button.background": colors["--accent"] || "#38bdf8",
        "dropdown.background": "#09090b",
      }
    });
    this.currentTheme = "custom";
    if (this.storage) await this.storage.setItem("atlas-theme", "custom");
  }

  public async setDarkMode() {
    this.applyTheme({
      type: "dark",
      colors: {
        "editor.background": "#0d0d10",
        "sideBar.background": "#141417",
        "titleBar.activeBackground": "#18181b",
        "widget.border": "#27272a",
        "editor.foreground": "#fafafa",
        "descriptionForeground": "#a1a1aa",
        "button.background": "#38bdf8",
        "dropdown.background": "#09090b",
      }
    });
    this.currentTheme = "atlas-dark";
    if (this.storage) await this.storage.setItem("atlas-theme", "atlas-dark");
  }

  public async loadSavedTheme() {
    if (!this.storage) return this.setDarkMode();
    const saved = await this.storage.getItem("atlas-theme");
    if (saved === "atlas-light") {
      this.setLightMode();
    } else if (saved === "custom") {
      const customData = await this.storage.getItem("atlas-custom-theme");
      if (customData) {
        try {
          this.applyTheme(parse(customData));
          this.currentTheme = "custom";
        } catch (e) {
          this.setDarkMode();
        }
      } else {
        this.setDarkMode();
      }
    } else {
      this.setDarkMode();
    }
  }

  public async importVsCodeTheme(jsonString: string) {
    try {
      const parsed = parse(jsonString);
      if (!parsed) throw new Error("Parsed theme is empty");
      this.applyTheme(parsed);
      this.currentTheme = "custom";
      if (this.storage) {
        await this.storage.setItem("atlas-theme", "custom");
        await this.storage.setItem("atlas-custom-theme", JSON.stringify(parsed));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid theme JSON file";
      console.error("Failed to parse theme JSON:", message);
      throw new Error("Invalid theme JSON file.");
    }
  }
}

