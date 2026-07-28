/**
 * AutoUpdaterService
 *
 * Multi-channel auto-update manager for Atlas Studio.
 * Evaluates target release version against current version to detect update availability.
 */

import { ReleaseConfig, ReleaseChannel } from "./ReleaseConfig.js";

export interface UpdateInfo {
  version: string;
  channel: ReleaseChannel;
  releaseNotes: string;
  releaseDate: string;
  updateAvailable: boolean;
}

export class AutoUpdaterService {
  private currentChannel: ReleaseChannel = "stable";

  public setChannel(channel: ReleaseChannel): void {
    this.currentChannel = channel;
    ReleaseConfig.setChannel(channel);
  }

  public getChannel(): ReleaseChannel {
    return this.currentChannel;
  }

  public async checkForUpdates(latestVersionOverride?: string): Promise<UpdateInfo> {
    const meta = ReleaseConfig.getMetadata();
    const currentVer = meta.version;
    const latestVer = latestVersionOverride || process.env.ATLAS_LATEST_VERSION || currentVer;
    
    const isNewer = this.isVersionNewer(latestVer, currentVer);

    return {
      version: latestVer,
      channel: this.currentChannel,
      releaseNotes: isNewer 
        ? `Atlas Studio v${latestVer} is available! New features and security patches included.`
        : `Atlas Studio v${currentVer} (${this.currentChannel}) is up to date.`,
      releaseDate: new Date().toISOString().split("T")[0] || "2026-07-28",
      updateAvailable: isNewer,
    };
  }

  private isVersionNewer(latest: string, current: string): boolean {
    const parse = (v: string) => v.replace(/^v/, "").split(".").map(n => parseInt(n, 10) || 0);
    const [lMajor = 0, lMinor = 0, lPatch = 0] = parse(latest);
    const [cMajor = 0, cMinor = 0, cPatch = 0] = parse(current);
    
    if (lMajor !== cMajor) return lMajor > cMajor;
    if (lMinor !== cMinor) return lMinor > cMinor;
    return lPatch > cPatch;
  }
}
