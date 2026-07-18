/**
 * SecurityAuditService
 *
 * Generates a real Software Bill of Materials (SBOM) by reading workspace
 * package.json files. Runs only in the main process via IPC.
 */

export interface SbomEntry {
  name: string;
  version: string;
  license: string;
  path: string;
}

export interface SbomReport {
  format: "SPDX-2.3";
  name: string;
  packages: SbomEntry[];
  generatedAt: string;
}

/**
 * Generate SBOM from a pre-scanned list of package manifests.
 * The main process IPC handler passes the real package.json contents.
 */
export class SecurityAuditService {
  public static generateSbom(
    manifests: Array<{ path: string; content: Record<string, unknown> }>
  ): SbomReport {
    const packages: SbomEntry[] = manifests.map(m => ({
      name: String(m.content["name"] ?? "unknown"),
      version: String(m.content["version"] ?? "0.0.0"),
      license: String(m.content["license"] ?? "UNLICENSED"),
      path: m.path,
    }));

    return {
      format: "SPDX-2.3",
      name: "Atlas Studio Platform",
      packages,
      generatedAt: new Date().toISOString(),
    };
  }
}
