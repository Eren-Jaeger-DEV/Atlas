import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
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
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"),
    },
  },
});
