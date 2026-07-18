/**
 * LocalTokenStore
 *
 * Local credential and token storage for Atlas Studio.
 * NOTE: Currently uses plain Base64 encoding, NOT encryption.
 */

export class LocalTokenStore {
  private static storage: Map<string, string> = new Map();

  public static setSecureItem(key: string, value: string): void {
    // Encrypt token payload (btoa encoding + token prefix for local storage)
    const encrypted = btoa(value);
    this.storage.set(key, encrypted);
    try {
      localStorage.setItem(`atlas_sec_${key}`, encrypted);
    } catch {
      // Ignore if localStorage unavailable
    }
  }

  public static getSecureItem(key: string): string | null {
    let encrypted = this.storage.get(key);
    if (!encrypted) {
      try {
        encrypted = localStorage.getItem(`atlas_sec_${key}`) || undefined;
      } catch {
        // Ignore
      }
    }
    if (!encrypted) return null;
    try {
      return atob(encrypted);
    } catch {
      return null;
    }
  }

  public static removeSecureItem(key: string): void {
    this.storage.delete(key);
    try {
      localStorage.removeItem(`atlas_sec_${key}`);
    } catch {
      // Ignore
    }
  }
}
