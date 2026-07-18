/**
 * AccountService
 *
 * Manages user accounts, authentication session, device tokens, and offline detection.
 */

import { SecurityStore } from "./SecurityStore.js";
import { EventBus } from "../events/EventBus.js";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  plan: "Free" | "Pro" | "Enterprise";
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
    const token = SecurityStore.getSecureItem("user_token");
    if (token) {
      this.currentUser = {
        id: "usr_atlas_001",
        name: "Eren Jaeger",
        email: "eren@atlas.dev",
        plan: "Pro",
      };
    }
  }

  public async signIn(email: string, password?: string): Promise<UserProfile> {
    const token = `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    SecurityStore.setSecureItem("user_token", token);

    const userName = email.split("@")[0] || "User";

    const user: UserProfile = {
      id: "usr_" + Math.random().toString(36).substring(2, 9),
      name: userName,
      email,
      plan: "Pro",
    };

    this.currentUser = user;
    return user;
  }

  public signOut(): void {
    SecurityStore.removeSecureItem("user_token");
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
