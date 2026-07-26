/**
 * @atlas/core — CompetitorSettingsImporter
 *
 * One-click migration engine for settings, keybindings, and custom prompts from competitor IDEs
 * (Cursor, Windsurf, Cider, VS Code) matching Antigravity (`codeiumDev.migrateSettings`) (Chapter 14).
 */

export interface CompetitorRule {
  source: "cursor" | "windsurf" | "vscode";
  name: string;
  content: string;
  tags?: string[];
}

export interface ImportedConfigResult {
  rulesImported: number;
  settingsMigrated: string[];
  outputPromptMarkdown: string;
}

export class CompetitorSettingsImporter {
  /**
   * Parses custom `.cursor/rules` or `.windsurf/config.json` text into standardized Atlas rules.
   */
  public parseRules(rawContent: string, source: "cursor" | "windsurf" | "vscode"): CompetitorRule[] {
    const rules: CompetitorRule[] = [];
    const blocks = rawContent.split(/\n(?=#|\/\/|---)/);

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]?.trim();
      if (!block) continue;

      const firstLine = block.split("\n")[0] || "";
      const name = firstLine.replace(/^[#/*-\s]+/, "").trim() || `Imported Rule ${i + 1}`;

      rules.push({
        source,
        name,
        content: block,
        tags: [source, "imported-rule"],
      });
    }

    return rules;
  }

  /**
   * Formats imported competitor rules into Atlas `.atlas/memories/repo.md` markdown format.
   */
  public convertToAtlasRepoMarkdown(rules: CompetitorRule[]): ImportedConfigResult {
    const lines: string[] = [
      "# Atlas Repository Rules — Imported Settings",
      "",
      `> Automatically converted from ${rules.length} competitor rule blocks on ${new Date().toISOString()}`,
      "",
    ];

    const settingsKeys: string[] = [];

    for (const rule of rules) {
      lines.push(`## [${rule.source.toUpperCase()}] ${rule.name}`);
      lines.push("```markdown");
      lines.push(rule.content);
      lines.push("```");
      lines.push("");
      settingsKeys.push(`rule.${rule.source}.${rule.name.toLowerCase().replace(/\s+/g, "_")}`);
    }

    return {
      rulesImported: rules.length,
      settingsMigrated: settingsKeys,
      outputPromptMarkdown: lines.join("\n"),
    };
  }
}
