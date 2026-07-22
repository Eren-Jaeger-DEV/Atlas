/**
 * LocalTokenStore
 *
 * Local credential and token storage for Atlas Studio.
 * NOTE: Uses safeStorage (OS Keychain) via IPC sync calls.
 */

export class LocalTokenStore {
  private static storage: Map<string, string> = new Map();

  public static setSecureItem(key: string, value: string): void {
    this.storage.set(key, value);
    try {
      const api = (globalThis as any).window?.atlasAPI;
      if (api?.setSecureKeySync) {
        api.setSecureKeySync(key, value);
      } else {
        // Fallback strictly in non-Electron environments like unit tests
        localStorage.setItem(`atlas_sec_${key}`, btoa(value));
      }
    } catch {
      // Ignore
    }
  }

  public static getSecureItem(key: string): string | null {
    let plain = this.storage.get(key);
    if (!plain) {
      try {
        const api = (globalThis as any).window?.atlasAPI;
        if (api?.getSecureKeySync) {
          plain = api.getSecureKeySync(key) || undefined;
        } else {
          const enc = localStorage.getItem(`atlas_sec_${key}`);
          if (enc) plain = atob(enc);
        }
      } catch {
        // Ignore
      }
    }
    return plain || null;
  }

  public static removeSecureItem(key: string): void {
    this.storage.delete(key);
    try {
      const api = (globalThis as any).window?.atlasAPI;
      if (api?.removeSecureKeySync) {
        api.removeSecureKeySync(key);
      } else {
        localStorage.removeItem(`atlas_sec_${key}`);
      }
    } catch {
      // Ignore
    }
  }
}
