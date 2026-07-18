/**
 * @atlas/sdk — Public Extension Types & Manifest Schema
 */

import type { ExtensionPermission, ExtensionManifest } from "@atlas/core";

export type { ExtensionPermission, ExtensionManifest };

export interface ExtensionContext {
  extensionId: string;
  subscriptions: Array<() => void>;
  registerCommand: (id: string, label: string, handler: (...args: any[]) => any) => void;
  registerView: (id: string, title: string, renderFn: () => any) => void;
  registerPanel: (id: string, title: string, renderFn: () => any) => void;
  registerStatusBarItem: (id: string, text: string) => void;
}

export interface AtlasExtension {
  manifest: ExtensionManifest;
  activate: (context: ExtensionContext) => void | Promise<void>;
  deactivate?: () => void | Promise<void>;
}
