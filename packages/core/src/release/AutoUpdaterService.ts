/**
 * AutoUpdaterService
 *
 * Multi-channel auto-update manager for Atlas Studio.
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

  public async checkForUpdates(): Promise<UpdateInfo> {
    const meta = ReleaseConfig.getMetadata();
    return {
      version: meta.version,
      channel: this.currentChannel,
      releaseNotes: `Atlas Studio v${meta.version} (${this.currentChannel})\n- Phase 9 Release Engineering Architecture\n- Performance budget validation\n- Automated security SBOM generation`,
      releaseDate: new Date().toISOString().split("T")[0] || "2026-07-18",
      updateAvailable: false,
    };
  }
}
