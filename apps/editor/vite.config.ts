import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "node:path";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    nodePolyfills(),
    {
      name: "remove-crossorigin",
      transformIndexHtml(html) {
        return html.replace(/crossorigin/g, "");
      },
    },
  ],
  resolve: {
    alias: {
      "@atlas/core": path.resolve(__dirname, "../../packages/core/src"),
      "@atlas/graph": path.resolve(__dirname, "../../packages/graph/src"),
      "@atlas/agents": path.resolve(__dirname, "../../packages/agents/src"),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: "dist",
    modulePreload: false,
    minify: false,
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"),
    },
  },
});
