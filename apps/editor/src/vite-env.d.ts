/// <reference types="vite/client" />
import { AtlasAPI } from "./types/atlas";

declare module "*.png" {
  const src: string;
  export default src;
}

declare global {
  interface Window {
    atlasAPI: AtlasAPI;
    monaco: any;
  }
}
