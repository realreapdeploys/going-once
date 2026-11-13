import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5190",
    permissions: ["clipboard-read", "clipboard-write"],
  },
  // The e2e test pins the sale with ?date=YYYY-MM-DD, which is only honoured by the dev server.
  webServer: {
    command: `"${process.execPath}" node_modules/vite/bin/vite.js --port 5190 --strictPort --host 127.0.0.1`,
    url: "http://127.0.0.1:5190",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
