/**
 * SettingsService
 *
 * 3-tier hierarchical settings engine (Default -> User -> Workspace).
 */

import { EventBus } from "../events/EventBus.js";

export interface SettingsSchema {
  theme: string;
  fontSize: number;
  tabSize: number;
  wordWrap: "on" | "off";
  formatOnSave: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  aiModel: string;
}

export const DEFAULT_SETTINGS_SCHEMA: SettingsSchema = {
  theme: "dark",
  fontSize: 13,
  tabSize: 2,
  wordWrap: "on",
  formatOnSave: false,
  minimap: true,
  lineNumbers: true,
  aiModel: "gemini-2.0-flash",
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
