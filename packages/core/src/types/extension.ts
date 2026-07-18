/**
 * @atlas/core — Extension Specification Types
 */

export type ExtensionPermission =
  | "workspace.read"
  | "workspace.write"
  | "terminal.execute"
  | "network.fetch"
  | "commands.execute";

export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  publisher: string;
  description?: string;
  icon?: string;
  main: string;
  permissions: ExtensionPermission[];
  engines?: {
    atlas?: string;
  };
}
