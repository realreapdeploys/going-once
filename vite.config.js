import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    assetsInlineLimit: 4096,
  },
  server: {
    port: 5183,
  },
  preview: {
    port: 5184,
  },
});
