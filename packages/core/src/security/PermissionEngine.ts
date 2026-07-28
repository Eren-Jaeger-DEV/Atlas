/**
 * PermissionEngine
 *
 * Enforces security permission checks for extensions (`workspace.read`, `workspace.write`, etc).
 * Features persistent state serialization and audit logging.
 */

import type { ExtensionPermission } from "../types/extension.js";

export interface PermissionRequest {
  extensionId: string;
  extensionName?: string;
  permissions: ExtensionPermission[];
  granted: boolean;
  timestamp: number;
}

export interface PermissionAuditRecord {
  extensionId: string;
  action: "GRANT" | "REVOKE";
  permissions: ExtensionPermission[];
  timestamp: number;
}

export class PermissionEngine {
  private grantedPermissions: Map<string, Set<ExtensionPermission>> = new Map();
  private auditLog: PermissionAuditRecord[] = [];

  public grantPermissions(extensionId: string, permissions: ExtensionPermission[]): void {
    if (!this.grantedPermissions.has(extensionId)) {
      this.grantedPermissions.set(extensionId, new Set());
    }
    const set = this.grantedPermissions.get(extensionId)!;
    permissions.forEach(p => set.add(p));

    this.auditLog.push({
      extensionId,
      action: "GRANT",
      permissions: [...permissions],
      timestamp: Date.now(),
    });
  }

  public revokePermissions(extensionId: string): void {
    const existing = this.grantedPermissions.get(extensionId);
    if (existing) {
      this.auditLog.push({
        extensionId,
        action: "REVOKE",
        permissions: Array.from(existing),
        timestamp: Date.now(),
      });
      this.grantedPermissions.delete(extensionId);
    }
  }

  public hasPermission(extensionId: string, permission: ExtensionPermission): boolean {
    const set = this.grantedPermissions.get(extensionId);
    return set ? set.has(permission) : false;
  }

  public checkOrThrow(extensionId: string, permission: ExtensionPermission): void {
    if (!this.hasPermission(extensionId, permission)) {
      throw new Error(`[PermissionEngine] Extension '${extensionId}' lacks required permission '${permission}'`);
    }
  }

  public getGrantedPermissions(extensionId: string): ExtensionPermission[] {
    const set = this.grantedPermissions.get(extensionId);
    return set ? Array.from(set) : [];
  }

  public getAuditLog(): PermissionAuditRecord[] {
    return [...this.auditLog];
  }

  private isReadOnlyFS = false;

  public setReadOnlyFS(readOnly: boolean): void {
    this.isReadOnlyFS = readOnly;
  }

  public isReadOnlyMode(): boolean {
    return this.isReadOnlyFS;
  }

  public checkResourceLimits(memoryUsageMb: number, cpuTimeMs: number): { allowed: boolean; violationReason?: string } {
    const MAX_MEMORY_MB = 1024;
    const MAX_CPU_MS = 30000;

    if (memoryUsageMb > MAX_MEMORY_MB) {
      return { allowed: false, violationReason: `Memory usage ${memoryUsageMb}MB exceeded limit of ${MAX_MEMORY_MB}MB` };
    }
    if (cpuTimeMs > MAX_CPU_MS) {
      return { allowed: false, violationReason: `CPU time ${cpuTimeMs}ms exceeded limit of ${MAX_CPU_MS}ms` };
    }
    return { allowed: true };
  }

  public exportState(): { permissions: Record<string, ExtensionPermission[]>; auditLog: PermissionAuditRecord[] } {
    const permissions: Record<string, ExtensionPermission[]> = {};
    for (const [id, set] of this.grantedPermissions.entries()) {
      permissions[id] = Array.from(set);
    }
    return {
      permissions,
      auditLog: [...this.auditLog],
    };
  }

  public importState(state: any): void {
    if (!state || typeof state !== "object") return;

    const permissions = state.permissions || state;
    if (permissions && typeof permissions === "object") {
      for (const [id, perms] of Object.entries(permissions)) {
        if (Array.isArray(perms)) {
          this.grantPermissions(id, perms as ExtensionPermission[]);
        }
      }
    }

    if (Array.isArray(state.auditLog)) {
      this.auditLog = [...state.auditLog];
    }
  }

  public async saveToFile(filePath: string): Promise<void> {
    const { writeFileSync, mkdirSync } = await import("node:fs");
    const { dirname } = await import("node:path");
    try {
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, JSON.stringify(this.exportState(), null, 2), "utf-8");
    } catch {
      // Non-fatal if filesystem is read-only
    }
  }

  public async loadFromFile(filePath: string): Promise<void> {
    const { existsSync, readFileSync } = await import("node:fs");
    try {
      if (existsSync(filePath)) {
        const raw = readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        this.importState(parsed);
      }
    } catch {
      // Ignore corrupted cache file
    }
  }
}
