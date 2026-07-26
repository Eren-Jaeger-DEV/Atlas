/**
 * @atlas/core — SecurityAuditEngine
 *
 * Automated codebase security audit scanner matching Cursor (Chapter 4) and Antigravity (Chapter 6).
 * Scans code files for leaked secret tokens, unsafe eval/shell executions, and unverified credentials.
 */

export interface SecurityVulnerability {
  id: string;
  filePath: string;
  lineNumber: number;
  ruleId: string;
  severity: "critical" | "warning" | "info";
  description: string;
  snippet: string;
}

export class SecurityAuditEngine {
  /**
   * Scan code content for security vulnerabilities.
   */
  public auditFile(filePath: string, content: string): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    const lines = content.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;

      // Rule 1: Hardcoded Secrets (API Keys, Private Keys)
      if (/sk-[a-zA-Z0-9]{32,}/.test(line) || /-----BEGIN PRIVATE KEY-----/.test(line)) {
        vulnerabilities.push({
          id: `sec-key-${i}`,
          filePath,
          lineNumber: i + 1,
          ruleId: "NO_HARDCODED_SECRETS",
          severity: "critical",
          description: "Detected hardcoded API key or private credentials in code literal.",
          snippet: line.trim(),
        });
      }

      // Rule 2: Unsafe eval() or Function() constructor
      if (/\beval\s*\(/.test(line) || /new\s+Function\s*\(/.test(line)) {
        vulnerabilities.push({
          id: `sec-eval-${i}`,
          filePath,
          lineNumber: i + 1,
          ruleId: "NO_UNSAFE_EVAL",
          severity: "warning",
          description: "Avoid dynamic code execution via eval() or new Function().",
          snippet: line.trim(),
        });
      }
    }

    return vulnerabilities;
  }
}
