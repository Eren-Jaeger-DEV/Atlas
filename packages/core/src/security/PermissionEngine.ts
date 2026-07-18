/**
 * PermissionEngine
 *
 * Enforces security permission checks for extensions (`workspace.read`, `workspace.write`, etc).
 */

import type { ExtensionPermission } from "../types/extension.js";

export interface PermissionRequest {
  extensionId: string;
  extensionName: string;
  permissions: ExtensionPermission[];
  granted: boolean;
  timestamp: number;
}

export class PermissionEngine {
  private grantedPermissions: Map<string, Set<ExtensionPermission>> = new Map();

  public grantPermissions(extensionId: string, permissions: ExtensionPermission[]): void {
    if (!this.grantedPermissions.has(extensionId)) {
      this.grantedPermissions.set(extensionId, new Set());
    }
    const set = this.grantedPermissions.get(extensionId)!;
    permissions.forEach(p => set.add(p));
  }

  public revokePermissions(extensionId: string): void {
    this.grantedPermissions.delete(extensionId);
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
}
