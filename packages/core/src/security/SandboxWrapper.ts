/**
 * @atlas/core — SandboxWrapper
 *
 * Platform-native OS kernel shell command sandbox wrapper matching Antigravity's
 * macOS `sandbox-exec` policy and Linux `bwrap` container runtime (Chapter 13).
 */

function getExecSync(): ((cmd: string, opts?: any) => any) | null {
  try {
    const cp = require("node:child_process");
    return cp.execSync || null;
  } catch {
    return null;
  }
}

export interface SandboxPolicyConfig {
  repoPath: string;
  allowNetwork?: boolean;
  readOnlyPaths?: string[];
  writablePaths?: string[];
}

export class SandboxWrapper {
  private static cachedAvailability: boolean | null = null;

  /**
   * Checks if platform-native sandboxing tool (bwrap on Linux, sandbox-exec on macOS) is installed.
   */
  static isSandboxAvailable(platform: string = process.platform): boolean {
    if (SandboxWrapper.cachedAvailability !== null) {
      return SandboxWrapper.cachedAvailability;
    }

    try {
      const execSync = getExecSync();
      if (!execSync) {
        SandboxWrapper.cachedAvailability = false;
        return false;
      }

      if (platform === "linux") {
        execSync("which bwrap", { stdio: "ignore" });
        SandboxWrapper.cachedAvailability = true;
      } else if (platform === "darwin") {
        execSync("which sandbox-exec", { stdio: "ignore" });
        SandboxWrapper.cachedAvailability = true;
      } else {
        SandboxWrapper.cachedAvailability = false;
      }
    } catch {
      SandboxWrapper.cachedAvailability = false;
    }

    return SandboxWrapper.cachedAvailability;
  }

  /**
   * Wrap an AI-initiated shell command with platform-native sandbox execution policies.
   * If sandbox tooling is unavailable on the host system, falls back safely to the raw command
   * with a diagnostic log warning.
   */
  static wrapCommand(rawCommand: string, config: SandboxPolicyConfig, platform: string = process.platform): string {
    const repoPath = config.repoPath.replace(/"/g, '\\"');

    const available = SandboxWrapper.isSandboxAvailable(platform);

    if (platform === "darwin" && available) {
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

    if (platform === "linux" && available) {
      // Linux unshare / bwrap isolation wrapper
      return `bwrap --ro-bind / / --dev /dev --proc /proc --bind "${repoPath}" "${repoPath}" --tmpfs /tmp -- ${rawCommand}`;
    }

    if (platform === "linux" || platform === "darwin") {
      console.warn(`[SandboxWrapper] [WARN] Platform sandbox tooling (bwrap/sandbox-exec) is missing on ${platform}. Command running unsandboxed.`);
    }

    // Windows / fallback return original command
    return rawCommand;
  }
}
