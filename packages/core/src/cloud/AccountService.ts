/**
 * AccountService
 *
 * Manages the local developer profile and offline detection.
 * Note: This is not an authentication system.
 */

import { LocalTokenStore } from "./LocalTokenStore.js";
import { EventBus } from "../events/EventBus.js";
import { StorageProvider } from "./CloudSyncEngine.js";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  plan: "Free" | "Local" | "Enterprise";
}

export class AccountService {
  private currentUser: UserProfile | null = null;
  private eventBus: EventBus;
  private isOnlineState: boolean = true;
  private storage: StorageProvider;

  constructor(storage: StorageProvider, eventBus: EventBus = EventBus.getInstance()) {
    this.storage = storage;
    this.eventBus = eventBus;
    this.restoreSession().catch(console.error);
  }

  private async restoreSession(): Promise<void> {
    const token = await LocalTokenStore.getSecureItem("user_token");
    if (token) {
      const storedName = await this.storage.getItem("atlas_user_name") || "";
      const storedEmail = await this.storage.getItem("atlas_user_email") || "";
      this.currentUser = {
        id: `usr_${Date.now()}`,
        name: storedName,
        email: storedEmail,
        plan: "Local",
      };
    }
  }

  public async signIn(email: string, name?: string): Promise<UserProfile> {
    const token = `token_${Date.now()}_${crypto.randomUUID()}`;
    await LocalTokenStore.setSecureItem("user_token", token);

    const userName = name || email.split("@")[0] || "Developer";
    await this.storage.setItem("atlas_user_name", userName);
    await this.storage.setItem("atlas_user_email", email);

    const user: UserProfile = {
      id: "usr_" + crypto.randomUUID(),
      name: userName,
      email,
      plan: "Local",
    };

    this.currentUser = user;
    return user;
  }

  public async signOut(): Promise<void> {
    await LocalTokenStore.removeSecureItem("user_token");
    await this.storage.removeItem("atlas_user_name");
    await this.storage.removeItem("atlas_user_email");
    this.currentUser = null;
  }

  public getUser(): UserProfile | null {
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  public isOnline(): boolean {
    return this.isOnlineState;
  }

  public setOnlineState(online: boolean): void {
    this.isOnlineState = online;
  }
}
