/**
 * @atlas/core — WorkspaceTrustPolicy
 *
 * Workspace security trust engine matching Cursor (`.workspace-trusted`) (Chapter 13)
 * and VS Code (`workspaceTrust`) (Chapter 7).
 * Restricts command execution, auto-run NL rules, and shields `.env` credentials in untrusted folders.
 */

import path from "node:path";

export type TrustStatus = "TRUSTED" | "UNTRUSTED" | "PENDING_CONFIRMATION";

export class WorkspaceTrustPolicy {
  private trustStatus: TrustStatus = "PENDING_CONFIRMATION";
  private workspacePath: string;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
  }

  /**
   * Set workspace trust decision.
   */
  public setTrustStatus(status: TrustStatus): void {
    this.trustStatus = status;
  }

  /**
   * Get current trust decision.
   */
  public getTrustStatus(): TrustStatus {
    return this.trustStatus;
  }

  /**
   * Returns true if command execution is allowed in the current workspace.
   */
  public isCommandExecutionAllowed(): boolean {
    return this.trustStatus === "TRUSTED";
  }

  /**
   * Check if a file should be shielded due to untrusted workspace status or sensitivity.
   */
  public isFileShielded(filePath: string): boolean {
    const filename = path.basename(filePath.replace(/\\/g, "/"));
    const isSensitive =
      filename.startsWith(".env") ||
      filename.includes("id_rsa") ||
      filename.includes("credentials") ||
      filename.endsWith(".pem");

    if (isSensitive) return true;
    if (this.trustStatus === "UNTRUSTED") return true;

    return false;
  }
}
