import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against the demo store (see README → Local development):
 *   npm run seed:demo
 *   npm run build && npm run test:e2e
 * They place real orders and briefly hide a product, so never point them at
 * the production project.
 * Set E2E_BASE_URL to test an already-running server instead.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /storefront\.spec\.ts/ },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npx next start -p 3100",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
