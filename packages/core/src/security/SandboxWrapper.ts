/**
 * @atlas/core — SandboxWrapper
 *
 * Platform-native OS kernel shell command sandbox wrapper matching Antigravity's
 * macOS `sandbox-exec` policy and Linux `bwrap` container runtime (Chapter 13).
 */

export interface SandboxPolicyConfig {
  repoPath: string;
  allowNetwork?: boolean;
  readOnlyPaths?: string[];
  writablePaths?: string[];
}

export class SandboxWrapper {
  /**
   * Wrap an AI-initiated shell command with platform-native sandbox execution policies.
   */
  static wrapCommand(rawCommand: string, config: SandboxPolicyConfig, platform: string = process.platform): string {
    const repoPath = config.repoPath.replace(/"/g, '\\"');

    if (platform === "darwin") {
      // macOS kernel sandbox-exec SBPL policy
      const sbplPolicy = `
(version 1)
(allow default)
(deny file-write* (subpath "/System"))
(deny file-write* (subpath "/usr"))
(deny file-write* (subpath "/bin"))
(deny file-write* (subpath "/sbin"))
(allow file-write* (subpath "${repoPath}"))
(allow file-write* (subpath "/tmp"))
      `.trim().replace(/\n/g, " ");

      return `sandbox-exec -p '${sbplPolicy}' ${rawCommand}`;
    }

    if (platform === "linux") {
      // Linux unshare / bwrap isolation wrapper
      return `bwrap --ro-bind / / --dev /dev --proc /proc --bind "${repoPath}" "${repoPath}" --tmpfs /tmp -- ${rawCommand}`;
    }

    // Windows / fallback return original command
    return rawCommand;
  }
}
