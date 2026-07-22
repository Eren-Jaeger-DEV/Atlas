import { StorageProvider } from "./CloudSyncEngine.js";

export class BrowserStorageProvider implements StorageProvider {
  getItem(key: string): Promise<string | null> | string | null {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  }

  setItem(key: string, value: string): Promise<void> | void {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, value);
    }
  }

  removeItem(key: string): Promise<void> | void {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(key);
    }
  }
}
