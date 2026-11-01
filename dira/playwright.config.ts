import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

// End-to-end tests against a production build with development stand-ins switched on
// (local accounts, mock AI, mock checkout). Run `npm run build` first.
const PORT = 3200;
const preinstalled = "/opt/pw-browsers/chromium";
const launchOptions = existsSync(preinstalled) ? { executablePath: preinstalled } : {};

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, launchOptions, acceptDownloads: true },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions, viewport: { width: 1366, height: 860 } }, testIgnore: /mobile\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    env: { UNSAFE_DEV_MODES: "1", RATE_LIMIT_MULTIPLIER: "50", LOCAL_AUTH_SECRET: "e2e-secret" },
  },
});
