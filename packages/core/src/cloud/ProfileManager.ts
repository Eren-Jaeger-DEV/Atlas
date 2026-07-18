/**
 * ProfileManager
 *
 * Manages independent developer workspace profiles (Personal, Work, Open Source, Research).
 */

export interface WorkspaceProfile {
  id: string;
  name: string;
  description: string;
  icon: string;
  active: boolean;
}

const FALLBACK_PROFILE: WorkspaceProfile = {
  id: "personal",
  name: "Personal",
  description: "Default personal projects profile",
  icon: "user",
  active: true,
};

export class ProfileManager {
  private profiles: WorkspaceProfile[] = [
    FALLBACK_PROFILE,
    { id: "work", name: "Work", description: "Enterprise work environment", icon: "briefcase", active: false },
    { id: "opensource", name: "Open Source", description: "Public OSS development profile", icon: "github", active: false },
    { id: "research", name: "Research", description: "AI & ML experiment sandbox", icon: "brain", active: false },
  ];

  public getProfiles(): WorkspaceProfile[] {
    return this.profiles;
  }

  public getActiveProfile(): WorkspaceProfile {
    const found = this.profiles.find(p => p.active);
    return found ? found : FALLBACK_PROFILE;
  }

  public switchProfile(id: string): WorkspaceProfile {
    this.profiles.forEach(p => {
      p.active = p.id === id;
    });
    return this.getActiveProfile();
  }
}
