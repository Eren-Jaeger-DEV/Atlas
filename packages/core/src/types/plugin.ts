/**
 * @atlas/core — Plugin Specification Types
 */

export type PluginPermission =
  | "workspace.read"
  | "workspace.write"
  | "workspace.execute"
  | "network.outbound"
  | "filesystem.unrestricted";

export interface LanguageContribution {
  id: string;
  extensions: string[];
  aliases?: string[];
  startLsp?: (repoPath: string) => Promise<any>;
  startDebugAdapter?: (target: string) => Promise<any>;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  publisher?: string;
  description?: string;
  icon?: string;
  main?: string;
  /** Controls when the plugin activates. Omitting this field defaults to ["onStartupFinished"]. */
  activationEvents?: Array<
    | "*"
    | "onStartupFinished"
    | `onLanguage:${string}`
    | `onCommand:${string}`
    | `onView:${string}`
  >;
  contributes?: {
    commands?: Array<{ id: string; title: string }>;
    languages?: Array<{ id: string; extensions: string[]; aliases?: string[] }>;
    views?: Array<{ id: string; title: string }>;
    statusBarItems?: Array<{ id: string; text: string }>;
  };
  permissions?: PluginPermission[];
  engines?: {
    atlas?: string;
  };
}

export interface AtlasPluginModule {
  activate: (context: any) => void | Promise<void>;
  deactivate?: () => void | Promise<void>;
}
