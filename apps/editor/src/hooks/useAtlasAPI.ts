import { AtlasAPI } from "../types/atlas";

/**
 * React hook to safely access the Atlas API exposed via Electron Context Bridge.
 * The API is guaranteed to exist when running in the Electron renderer.
 */
export function useAtlasAPI(): AtlasAPI {
  return window.atlasAPI;
}
