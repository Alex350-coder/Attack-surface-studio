import { defineConfig, devices } from "@playwright/test";

/**
 * Critical-flow E2E config (Claude.md §13). Runs against a real `next dev` server, which in
 * turn talks to the real backend — see `e2e/README.md` for the full stack this suite requires.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"]],
  // next dev --webpack (the Turbopack workaround, see next.config.ts) compiles each route on
  // its first visit; in this sandboxed environment that first-compile cost has been observed
  // well past Playwright's 5s assertion default, so both budgets are raised generously.
  timeout: 120_000,
  expect: { timeout: 45_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : {
        // `next dev`'s Turbopack default hits the same workspace-root inference bug documented in
      // next.config.ts (this sandboxed/OneDrive path environment) -- `--webpack` sidesteps it,
      // matching the client's own "build" script.
      command: "pnpm exec next dev --webpack",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
