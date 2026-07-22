/**
 * CloudSyncEngine
 *
 * Persists and restores settings, themes, keybindings, and extension lists
 * to a local sync file in the app user-data directory.
 *
 * NOTE: Remote cloud sync (multi-device, server-backed) is a future feature.
 * This implementation provides real local persistence so settings survive
 * app restarts and workspace switches.
 */

import { EventBus } from "../events/EventBus.js";

export interface SyncPayload {
  settings: Record<string, unknown>;
  extensions: string[];
  theme: string;
  timestamp: number;
}

export interface StorageProvider {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

export class CloudSyncEngine {
  private syncEnabled: boolean = true;
  private lastSyncTime: number = 0;
  private eventBus: EventBus;
  private storage: StorageProvider;
  private readonly storageKey = "atlas_local_sync_payload";

  constructor(storage: StorageProvider, eventBus: EventBus = EventBus.getInstance()) {
    this.storage = storage;
    this.eventBus = eventBus;
  }

  public isSyncEnabled(): boolean {
    return this.syncEnabled;
  }

  public setSyncEnabled(enabled: boolean): void {
    this.syncEnabled = enabled;
  }

  public getLastSyncTime(): number {
    return this.lastSyncTime;
  }

  /**
   * Persist settings to storage provider.
   */
  public async pushSync(payload: SyncPayload): Promise<boolean> {
    if (!this.syncEnabled) return false;
    try {
      const data: SyncPayload = { ...payload, timestamp: Date.now() };
      await this.storage.setItem(this.storageKey, JSON.stringify(data));
      this.lastSyncTime = data.timestamp;
      this.eventBus.emit("SettingsChanged", payload.settings as any);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Restore settings from storage provider. Returns null if nothing has been synced yet.
   */
  public async pullSync(): Promise<SyncPayload | null> {
    if (!this.syncEnabled) return null;
    try {
      const raw = await this.storage.getItem(this.storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SyncPayload;
      this.lastSyncTime = parsed.timestamp ?? 0;
      return parsed;
    } catch {
      return null;
    }
  }

  public async clearSync(): Promise<void> {
    await this.storage.removeItem(this.storageKey);
    this.lastSyncTime = 0;
  }
}
