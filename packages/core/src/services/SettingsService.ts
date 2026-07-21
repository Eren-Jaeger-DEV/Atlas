/**
 * SettingsService
 *
 * 3-tier hierarchical settings engine (Default -> User -> Workspace).
 */

import { EventBus } from "../events/EventBus.js";

export interface SettingsSchema {
  theme: string;
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: "on" | "off";
  formatOnSave: boolean;
  autoSave: "off" | "afterDelay" | "onFocusChange";
  minimap: boolean;
  lineNumbers: boolean;
  terminalShell: "cmd" | "powershell" | "bash";
  aiModel: string;
  gitBlameEnabled: boolean;
  gitDiffGuttersEnabled: boolean;
}

export const DEFAULT_SETTINGS_SCHEMA: SettingsSchema = {
  theme: "obsidian",
  fontSize: 14,
  fontFamily: "'JetBrains Mono', Consolas, monospace",
  tabSize: 2,
  wordWrap: "on",
  formatOnSave: false,
  autoSave: "off",
  minimap: true,
  lineNumbers: true,
  terminalShell: "cmd",
  aiModel: "gemini-2.0-flash",
  gitBlameEnabled: true,
  gitDiffGuttersEnabled: true,
};

export class SettingsService {
  private defaultSettings: SettingsSchema = { ...DEFAULT_SETTINGS_SCHEMA };
  private userSettings: Partial<SettingsSchema> = {};
  private workspaceSettings: Partial<SettingsSchema> = {};
  private eventBus: EventBus;

  constructor(eventBus: EventBus = EventBus.getInstance()) {
    this.eventBus = eventBus;
  }

  public setUserSettings(settings: Partial<SettingsSchema>): void {
    this.userSettings = { ...this.userSettings, ...settings };
    this.notifySettingsChanged();
  }

  public setWorkspaceSettings(settings: Partial<SettingsSchema>): void {
    this.workspaceSettings = { ...settings };
    this.notifySettingsChanged();
  }

  public getSettings(): SettingsSchema {
    return {
      ...this.defaultSettings,
      ...this.userSettings,
      ...this.workspaceSettings,
    };
  }

  public get<K extends keyof SettingsSchema>(key: K): SettingsSchema[K] {
    if (this.workspaceSettings[key] !== undefined) return this.workspaceSettings[key]!;
    if (this.userSettings[key] !== undefined) return this.userSettings[key]!;
    return this.defaultSettings[key];
  }

  private notifySettingsChanged(): void {
    this.eventBus.emit("SettingsChanged", this.getSettings());
  }
}
