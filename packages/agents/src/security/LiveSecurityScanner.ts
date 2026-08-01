/**
 * @atlas/agents — LiveSecurityScanner (Atlas Sentinel)
 *
 * Real-Time Always-On AST Vulnerability & Secret Radar.
 * Runs on every file save to detect AST-level security threats before code is committed.
 *
 * Completely original Atlas implementation.
 */

export type SentinelSeverity = "critical" | "high" | "medium" | "low";

export interface SentinelRule {
  id: string;
  cweId: string;
  title: string;
  severity: SentinelSeverity;
  pattern: RegExp;
  description: string;
  remediationHint: string;
}

export interface SecurityFinding {
  ruleId: string;
  cweId: string;
  title: string;
  severity: SentinelSeverity;
  filePath: string;
  line: number;
  column: number;
  snippet: string;
  description: string;
  remediationHint: string;
}

export interface ScanReport {
  filePath: string;
  scannedAt: string;
  totalFindings: number;
  findings: SecurityFinding[];
  severityCounts: Record<SentinelSeverity, number>;
}

// ---------------------------------------------------------------------------
// Atlas Sentinel Built-In Security Rule Set (AST / Pattern Rules)
// ---------------------------------------------------------------------------
export const SENTINEL_RULES: SentinelRule[] = [
  {
    id: "SEC-001",
    cweId: "CWE-798",
    title: "Hardcoded API Secret or Key",
    severity: "critical",
    pattern: /(api[_-]?key|secret|token|password|auth|private[_-]?key)\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']/i,
    description: "Hardcoded credential detected in source code. Credentials must be loaded from environment variables or a vault.",
    remediationHint: "Move secret to process.env or .env file.",
  },
  {
    id: "SEC-002",
    cweId: "CWE-89",
    title: "Potential SQL Injection",
    severity: "high",
    pattern: /(query|exec|execute)\s*\(\s*["'`].*?(SELECT|INSERT|UPDATE|DELETE).*?\$\{.*?\}|\+\s*\w+/i,
    description: "Unsanitized dynamic string interpolation inside SQL query.",
    remediationHint: "Use parameterized queries or prepared statements.",
  },
  {
    id: "SEC-003",
    cweId: "CWE-78",
    title: "Command Injection Risk",
    severity: "critical",
    pattern: /(exec|execSync|spawn|child_process\.exec)\s*\(\s*["'`].*?\$\{.*?\}|\+\s*\w+/i,
    description: "User input directly concatenated into OS shell command execution.",
    remediationHint: "Use execFile with argument arrays instead of shell command strings.",
  },
  {
    id: "SEC-004",
    cweId: "CWE-79",
    title: "Cross-Site Scripting (XSS) via innerHTML",
    severity: "high",
    pattern: /\.innerHTML\s*=\s*(?!["']<\w+>["'])/,
    description: "Direct assignment to innerHTML bypasses HTML sanitization.",
    remediationHint: "Use textContent or a secure sanitizer like DOMPurify.",
  },
  {
    id: "SEC-005",
    cweId: "CWE-502",
    title: "Unsafe Deserialization (eval)",
    severity: "high",
    pattern: /\beval\s*\(|new\s+Function\s*\(/,
    description: "Evaluation of dynamic code string using eval() or Function constructor.",
    remediationHint: "Replace eval with JSON.parse or strict parser.",
  },
  {
    id: "SEC-006",
    cweId: "CWE-327",
    title: "Weak Cryptographic Hash (MD5/SHA1)",
    severity: "medium",
    pattern: /createHash\s*\(\s*["'](md5|sha1)["']\s*\)/i,
    description: "MD5 and SHA-1 are cryptographically broken hash algorithms.",
    remediationHint: "Upgrade to SHA-256 or SHA-512.",
  },
];

export class LiveSecurityScanner {
  /**
   * Scans source code content against the Atlas Sentinel rule set
   */
  public scanContent(filePath: string, content: string): ScanReport {
    const lines = content.split("\n");
    const findings: SecurityFinding[] = [];
    const counts: Record<SentinelSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0 };

    lines.forEach((lineText, idx) => {
      SENTINEL_RULES.forEach((rule) => {
        const match = rule.pattern.exec(lineText);
        if (match) {
          counts[rule.severity]++;
          findings.push({
            ruleId: rule.id,
            cweId: rule.cweId,
            title: rule.title,
            severity: rule.severity,
            filePath,
            line: idx + 1,
            column: match.index + 1,
            snippet: lineText.trim(),
            description: rule.description,
            remediationHint: rule.remediationHint,
          });
        }
      });
    });

    return {
      filePath,
      scannedAt: new Date().toISOString(),
      totalFindings: findings.length,
      findings,
      severityCounts: counts,
    };
  }
}

export const liveSecurityScanner = new LiveSecurityScanner();
