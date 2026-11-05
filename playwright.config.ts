import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end workflows. Requires the database to be running (npm run db:local).
 * The global setup re-seeds the demo data so every run starts from the same state.
 * DEMO_MODE must be true for the one-click demo sign-in used by these flows.
 */
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    viewport: { width: 1280, height: 860 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 860 } } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm run dev", url: "http://localhost:3000/api/health", reuseExistingServer: true, timeout: 180_000, env: { DEMO_MODE: "true" } },
});
