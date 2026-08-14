import { defineConfig, devices } from "@playwright/test";

// Exactly two flows are worth E2E coverage here (CONVENTIONS.md §7):
// add-place-and-vote (M1) and invite redemption. Specs live in e2e/.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    // Not `next dev`: dev mode's on-demand per-route compilation triggers
    // Fast Refresh (component remount) on first visit to each route, which
    // tears down and re-establishes realtime subscriptions mid-test —
    // diagnosed by watching a subscription reach SUBSCRIBED and then get
    // torn down again by another rebuild before the event it was waiting
    // for arrived. A production build doesn't have this churn, and it's
    // what real users actually run.
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
