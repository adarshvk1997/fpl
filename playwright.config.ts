import { defineConfig, devices } from "@playwright/test";

// IMPORTANT: this app is single-user and has no separate test database — the
// tests below run against your real Supabase project. They're deliberately
// scoped to be safe to run anytime:
//   - Onboarding tests only exercise *validation* paths (bad team ID, wrong
//     player count) that fail before any database write or AI call happens.
//   - Settings tests back up and restore the app_settings row so your real
//     configuration survives a test run.
// What's intentionally NOT covered here: completing onboarding and letting
// it kick off a real Claude generation. Automating that would either incur
// real Anthropic API cost on every test run, or require mocking the AI
// call — more infrastructure than a personal app warrants. That path was
// verified manually instead (see the QA notes in git history / README).
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // tests share one app_settings row — run sequentially
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
