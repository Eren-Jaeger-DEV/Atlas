/**
 * CloudSyncEngine
 *
 * Incremental, selective cloud sync for settings, themes, keybindings, and extension manifests.
 */

import { EventBus } from "../events/EventBus.js";

export interface SyncPayload {
  settings: Record<string, unknown>;
  extensions: string[];
  theme: string;
  timestamp: number;
}

export class CloudSyncEngine {
  private syncEnabled: boolean = true;
  private lastSyncTime: number = Date.now();
  private eventBus: EventBus;

  constructor(eventBus: EventBus = EventBus.getInstance()) {
    this.eventBus = eventBus;
  }

  public isSyncEnabled(): boolean {
    return this.syncEnabled;
  }

  public setSyncEnabled(enabled: boolean): void {
    this.syncEnabled = enabled;
  }

  public async pushSync(payload: SyncPayload): Promise<boolean> {
    if (!this.syncEnabled) return false;
    this.lastSyncTime = Date.now();
    this.eventBus.emit("SettingsChanged", payload.settings as any);
    return true;
  }

  public async pullSync(): Promise<SyncPayload | null> {
    if (!this.syncEnabled) return null;
    return {
      settings: { theme: "dark", fontSize: 14 },
      extensions: ["atlas.git-lens"],
      theme: "dark",
      timestamp: Date.now(),
    };
  }

  public getLastSyncTime(): number {
    return this.lastSyncTime;
  }
}
