import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// base relative : l'app peut être servie depuis backend/pb_public (racine PocketBase)
export default defineConfig({
  base: "./",
  plugins: [svelte()],
  server: {
    port: 5173,
    proxy: {
      // en dev, l'app tape le backend PocketBase directement ; ce proxy évite CORS
      "/api": "http://127.0.0.1:8090",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
