/**
 * @atlas/sdk — Official Atlas Extension SDK Entry Point
 */

import type { AtlasExtension } from "./types.js";

export type {
  ExtensionPermission,
  ExtensionManifest,
  ExtensionContext,
  AtlasExtension,
} from "./types.js";

export class AtlasSDK {
  public static readonly VERSION = "0.1.0";

  public static defineExtension(ext: AtlasExtension): AtlasExtension {
    return ext;
  }
}
