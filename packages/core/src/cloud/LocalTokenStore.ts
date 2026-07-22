/**
 * LocalTokenStore
 *
 * Local credential and token storage for Atlas Studio.
 * NOTE: Uses safeStorage (OS Keychain) via IPC sync calls.
 * 
 * WARNING: The fallback provider is intentionally UNENCRYPTED.
 * It is only intended for use in environments where secure storage 
 * is completely unavailable (e.g., unit tests or local web browsers).
 * Do not store production secrets in the fallback provider.
 */

import { StorageProvider } from "./CloudSyncEngine.js";

export interface SecureStoreProvider {
  setSecureItem(key: string, value: string): Promise<void>;
  getSecureItem(key: string): Promise<string | null>;
  removeSecureItem(key: string): Promise<void>;
}

export class LocalTokenStore {
  private static storage: Map<string, string> = new Map();
  private static provider: SecureStoreProvider | null = null;
  private static fallbackProvider: StorageProvider | null = null;

  public static initialize(provider: SecureStoreProvider, fallbackProvider?: StorageProvider): void {
    this.provider = provider;
    if (fallbackProvider) {
      this.fallbackProvider = fallbackProvider;
    }
  }

  public static async setSecureItem(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
    try {
      if (this.provider) {
        await this.provider.setSecureItem(key, value);
      } else if (this.fallbackProvider) {
        // Fallback strictly in non-Electron environments like unit tests
        // WARNING: This stores the item in pure plaintext.
        await this.fallbackProvider.setItem(`atlas_unencrypted_fallback_${key}`, value);
      }
    } catch {
      // Ignore
    }
  }

  public static async getSecureItem(key: string): Promise<string | null> {
    let plain = this.storage.get(key);
    if (!plain) {
      try {
        if (this.provider) {
          plain = await this.provider.getSecureItem(key) || undefined;
        } else if (this.fallbackProvider) {
          const enc = await this.fallbackProvider.getItem(`atlas_unencrypted_fallback_${key}`);
          if (enc) plain = enc;
        }
      } catch {
        // Ignore
      }
    }
    return plain || null;
  }

  public static async removeSecureItem(key: string): Promise<void> {
    this.storage.delete(key);
    try {
      if (this.provider) {
        await this.provider.removeSecureItem(key);
      } else if (this.fallbackProvider) {
        await this.fallbackProvider.removeItem(`atlas_unencrypted_fallback_${key}`);
      }
    } catch {
      // Ignore
    }
  }
}

