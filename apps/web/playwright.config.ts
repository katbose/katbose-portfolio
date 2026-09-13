import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright runs the characterization suite against a production build, not the
 * dev server: dev mode adds React double-renders and the error overlay, which
 * would pollute the "no console errors" assertion and make it meaningless.
 *
 * `bun run start` therefore needs `bun run build` to have run first. The
 * Turborepo task graph expresses that dependency (`test:e2e` dependsOn `build`).
 */

const PORT = 7000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Only .spec.ts here, so `bun test` (which owns *.test.ts) never collides.
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bun run start",
    url: BASE_URL,
    // Never reuse a server this run did not start. `next start` can survive the
    // terminal that launched it on Windows, and reusing such an orphan means
    // testing a stale build: its HTML references chunk hashes that a later
    // rebuild has already deleted, so hydration silently never completes and
    // the failures look like application bugs. Owning the server means a busy
    // port fails loudly instead.
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
