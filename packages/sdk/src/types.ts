/**
 * @atlas/sdk — Public Plugin Types & Manifest Schema
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
  description?: string;
  publisher?: string;
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
}

export interface PluginContext {
  pluginId: string;
  subscriptions: Array<() => void>;
  registerCommand: (id: string, label: string, handler: (...args: any[]) => any) => void;
  registerView: (id: string, title: string, renderFn: () => any) => void;
  registerPanel: (id: string, title: string, renderFn: () => any) => void;
  registerStatusBarItem: (id: string, text: string) => void;
  registerLanguage: (config: LanguageContribution) => void;
  registerFileViewer: (extensions: string[], renderFn: (filePath: string) => any) => void;
  requestPermission: (permission: PluginPermission) => Promise<boolean>;
}

export interface AtlasPlugin {
  manifest: PluginManifest;
  activate: (context: PluginContext) => void | Promise<void>;
  deactivate?: () => void | Promise<void>;
}
