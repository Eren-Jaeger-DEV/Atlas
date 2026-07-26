/**
 * @atlas/core — AtlasIgnore
 *
 * Pattern matching engine for `.atlasignore` (and `.cursorignore` / `.agyignore` parity).
 * Shields sensitive credential files, private keys, and excluded patterns from AI agent inspection.
 */

export class AtlasIgnore {
  private patterns: string[] = [];

  constructor(ignoreFileContent?: string) {
    if (ignoreFileContent) {
      this.loadRules(ignoreFileContent);
    }
  }

  /**
   * Parse `.atlasignore` content line by line.
   */
  public loadRules(content: string): void {
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      this.patterns.push(trimmed);
    }
  }

  /**
   * Check if a relative or absolute file path matches any `.atlasignore` rule.
   */
  public isIgnored(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, "/").toLowerCase();

    // Default built-in safety rules (always active)
    const builtInProtections = [
      ".env",
      ".env.local",
      "id_rsa",
      "id_ed25519",
      "*.pem",
      "credentials",
      "secrets.json",
      ".atlas/keys"
    ];

    for (const pattern of [...builtInProtections, ...this.patterns]) {
      if (this.matchPattern(normalized, pattern.toLowerCase())) {
        return true;
      }
    }

    return false;
  }

  private matchPattern(path: string, pattern: string): boolean {
    if (pattern.startsWith("*.")) {
      const ext = pattern.slice(1);
      return path.endsWith(ext);
    }
    if (pattern.endsWith("/")) {
      const dir = pattern.slice(0, -1);
      return path.includes(`/${dir}/`) || path.startsWith(`${dir}/`) || path === dir;
    }
    return path.includes(pattern);
  }
}
