/**
 * @atlas/sdk — Official Atlas Plugin SDK Entry Point
 */

import type { AtlasPlugin } from "./types.js";

export type {
  PluginPermission,
  PluginManifest,
  PluginContext,
  LanguageContribution,
  AtlasPlugin,
} from "./types.js";

export class AtlasSDK {
  public static readonly VERSION = "1.0.0";

  public static definePlugin(plugin: AtlasPlugin): AtlasPlugin {
    return plugin;
  }
}
