/**
 * ReleaseConfig
 *
 * Release channels, build metadata, and packaging descriptors for Atlas Studio.
 */

export type ReleaseChannel = "nightly" | "preview" | "beta" | "stable";

export interface BuildMetadata {
  version: string;
  channel: ReleaseChannel;
  buildNumber: number;
  commitHash: string;
  buildTimestamp: number;
  platform: "win32" | "darwin" | "linux";
  arch: "x64" | "arm64";
}

export class ReleaseConfig {
  private static activeMetadata: BuildMetadata = {
    version: "0.1.0",
    channel: "stable",
    buildNumber: 1042,
    commitHash: "e8a7706",
    buildTimestamp: Date.now(),
    platform: typeof process !== "undefined" && process.platform ? (process.platform as any) : "win32",
    arch: typeof process !== "undefined" && process.arch ? (process.arch as any) : "x64",
  };

  public static getMetadata(): BuildMetadata {
    return this.activeMetadata;
  }

  public static setChannel(channel: ReleaseChannel): void {
    this.activeMetadata.channel = channel;
  }
}
