import { describe, it, expect } from "vitest";
import { AccountService, CloudSyncEngine, ProfileManager, SecurityStore, EventBus } from "../src/index.js";

describe("Cloud Sync, Accounts & Team Collaboration — Phase 8", () => {
  it("should encrypt and store tokens via SecurityStore", () => {
    SecurityStore.setSecureItem("test_token", "secret-payload-123");
    const retrieved = SecurityStore.getSecureItem("test_token");
    expect(retrieved).toBe("secret-payload-123");

    SecurityStore.removeSecureItem("test_token");
    expect(SecurityStore.getSecureItem("test_token")).toBeNull();
  });

  it("should handle user sign-in and session state in AccountService", async () => {
    const bus = new EventBus();
    const service = new AccountService(bus);

    const user = await service.signIn("test@atlas.dev");
    expect(service.isAuthenticated()).toBe(true);
    expect(user.email).toBe("test@atlas.dev");

    service.signOut();
    expect(service.isAuthenticated()).toBe(false);
  });

  it("should manage workspace profiles via ProfileManager", () => {
    const profiles = new ProfileManager();
    expect(profiles.getProfiles().length).toBe(4);
    expect(profiles.getActiveProfile().id).toBe("personal");

    const active = profiles.switchProfile("work");
    expect(active.id).toBe("work");
    expect(profiles.getActiveProfile().name).toBe("Work");
  });

  it("should push and pull sync payloads via CloudSyncEngine", async () => {
    const bus = new EventBus();
    const sync = new CloudSyncEngine(bus);

    expect(sync.isSyncEnabled()).toBe(true);

    const res = await sync.pushSync({
      settings: { fontSize: 15 },
      extensions: ["atlas.git-lens"],
      theme: "dark",
      timestamp: Date.now(),
    });
    expect(res).toBe(true);

    const pulled = await sync.pullSync();
    expect(pulled).not.toBeNull();
    expect(pulled?.theme).toBe("dark");
  });
});
