import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright runs the characterization suite against a production build, not the
 * dev server: dev mode adds React double-renders and the error overlay, which
 * would pollute the "no console errors" assertion and make it meaningless.
 *
 * `bun run start` therefore needs `bun run build` to have run first. The
 * Turborepo task graph expresses that dependency (`test:e2e` dependsOn `build`).
 */

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 7000);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error("PLAYWRIGHT_PORT must be an integer between 1 and 65535");
}
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
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      // Freezes CSS animations and transitions at their end state, which is what
      // makes the marquee, the reveal transitions, and the theme fade
      // screenshottable at all.
      animations: "disabled",
      caret: "hide",
      // Font antialiasing differs by a pixel or two between runs even on the
      // same machine. Small enough to ignore noise, tight enough that a real
      // layout or colour change still fails.
      maxDiffPixelRatio: 0.01,
    },
  },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  /**
   * Behaviour tests and visual tests are separate projects on purpose.
   *
   * Screenshot baselines are tied to the platform that produced them — font
   * rasterisation on Windows does not match Linux, so baselines committed from a
   * dev machine would fail on a Linux CI runner and teach everyone to ignore the
   * suite. Until baselines are generated in a container, `visual.spec.ts` runs
   * locally (`bun run test:visual`) and CI runs the behaviour suite only.
   *
   * The mobile project is deliberately scoped to the visual spec as well. The
   * behaviour suite makes desktop-shaped assumptions in places — the navbar
   * "Menu" label is hidden below `sm`, for one — so running all of it at phone
   * width would report layout intent as failure.
   */
  projects: [
    {
      name: "chromium",
      testIgnore: /visual\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "visual-desktop",
      testMatch: /visual\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "visual-mobile",
      testMatch: /visual\.spec\.ts/,
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: `bunx --no-install next start -p ${PORT}`,
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
