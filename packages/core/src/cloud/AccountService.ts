/**
 * AccountService
 *
 * Manages the local developer profile and offline detection.
 * Note: This is not an authentication system.
 */

import { LocalTokenStore } from "./LocalTokenStore.js";
import { EventBus } from "../events/EventBus.js";

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

  constructor(eventBus: EventBus = EventBus.getInstance()) {
    this.eventBus = eventBus;
    this.restoreSession();
  }

  private restoreSession(): void {
    const token = LocalTokenStore.getSecureItem("user_token");
    if (token) {
      const storedName = localStorage.getItem("atlas_user_name") || "Developer";
      const storedEmail = localStorage.getItem("atlas_user_email") || "developer@local";
      this.currentUser = {
        id: `usr_${Date.now()}`,
        name: storedName,
        email: storedEmail,
        plan: "Local",
      };
    }
  }

  public async signIn(email: string, name?: string): Promise<UserProfile> {
    const token = `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    LocalTokenStore.setSecureItem("user_token", token);

    const userName = name || email.split("@")[0] || "Developer";
    localStorage.setItem("atlas_user_name", userName);
    localStorage.setItem("atlas_user_email", email);

    const user: UserProfile = {
      id: "usr_" + Math.random().toString(36).substring(2, 9),
      name: userName,
      email,
      plan: "Local",
    };

    this.currentUser = user;
    return user;
  }

  public signOut(): void {
    LocalTokenStore.removeSecureItem("user_token");
    localStorage.removeItem("atlas_user_name");
    localStorage.removeItem("atlas_user_email");
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
