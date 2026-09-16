import { expect, hero, test, waitForHydration } from "./fixtures";

/**
 * The live clock, and everything downstream of it.
 *
 * WHY THESE TESTS EXIST
 * ---------------------
 * The clock is the most expensive thing on the page relative to its size. Page
 * state ticks once a second, which re-executes the whole homepage component and
 * rebuilds the complete agent-mode markdown string on every tick.
 *
 * The fix is to isolate the clock into its own island so only it re-renders. But
 * "only the clock re-renders" is not directly observable from a browser test, and
 * asserting on DOM equality would prove nothing. So these tests pin the things a
 * reader would actually notice if the isolation went wrong:
 *
 *   - the clock keeps advancing
 *   - a disclosure someone opened stays open while it advances
 *   - the copied markdown still matches what is on screen, exactly
 *
 * The re-render count itself is a profiling question, not an assertion. The
 * JavaScript saving is measured by `scripts/bundle-report.ts`.
 */

/**
 * `HH:MM:SS`, matching the 24-hour format the hero renders.
 *
 * Bounded with digit lookarounds rather than `\b`. In the rendered DOM the hero
 * collapses to `…•18:44:40IST` with no separator between the time and the
 * timezone label, and `\b` does not match between `0` and `I` — both are word
 * characters — so a `\b`-anchored pattern silently fails to match the real page.
 */
const CLOCK = /(?<!\d)([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?!\d)/;

test.describe("live clock", () => {
  test("renders the configured timezone label beside the time", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    expect(hero).toBeDefined();
    if (!hero) return;

    const main = page.locator("main");
    await expect(main).toContainText(CLOCK);
    await expect(main).toContainText(hero.data.timezone.label);
  });

  test("advances while the page sits idle", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    const clock = page.locator("main").getByText(CLOCK).first();
    const first = (await clock.textContent()) ?? "";
    expect(first).toMatch(CLOCK);

    // Poll rather than sleeping a fixed interval: the assertion is "it changes",
    // and polling reports that as soon as it is true instead of always costing a
    // second of wall clock.
    await expect
      .poll(async () => (await clock.textContent()) ?? "", { timeout: 5000 })
      .not.toBe(first);
  });

  test("does not collapse an open disclosure when it ticks", async ({ page }) => {
    // The regression this guards against: hoisting clock state above the
    // sections, or remounting them on each tick, would silently reset every
    // disclosure roughly once a second.
    await page.goto("/");
    await waitForHydration(page);

    const viewMore = page.getByRole("button", { name: /view more/i }).first();
    await viewMore.scrollIntoViewIfNeeded();
    await expect(viewMore).toHaveAttribute("aria-expanded", "false");
    await viewMore.click();

    const viewLess = page.getByRole("button", { name: /view less/i }).first();
    await expect(viewLess).toBeVisible();

    const clock = page.locator("main").getByText(CLOCK).first();
    const before = (await clock.textContent()) ?? "";

    // Wait for at least two ticks, so this cannot pass by landing inside a
    // single second.
    await expect
      .poll(async () => (await clock.textContent()) ?? "", { timeout: 5000 })
      .not.toBe(before);
    await page.waitForTimeout(1100);

    await expect(viewLess).toBeVisible();
    await expect(viewLess).toHaveAttribute("aria-expanded", "true");
  });
});

test.describe("agent mode markdown", () => {
  test("copies exactly what is rendered on screen", async ({ page, context }) => {
    // Chromium blocks clipboard reads without this, and the whole point of the
    // test is to compare against the real clipboard rather than trusting the
    // handler's input.
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/");
    await waitForHydration(page);
    await page.getByRole("switch").click();

    const pre = page.locator("main pre");
    await expect(pre).toHaveCount(1);

    const rendered = (await pre.textContent()) ?? "";
    expect(rendered.length).toBeGreaterThan(500);

    // Agent mode is a stable snapshot. A clock tick must not change its text.
    await page.waitForTimeout(1100);
    expect(await pre.textContent()).toBe(rendered);

    await page.getByRole("button", { name: /copy markdown/i }).click();
    await expect(page.getByRole("button", { name: /copied/i })).toBeVisible();

    const copied = await page.evaluate(() => navigator.clipboard.readText());

    /**
     * Normalise only line endings. Chromium's clipboard on Windows rewrites every `\n` as
     *    `\r\n` — writing "a\nb" and reading it straight back returns "a\r\nb".
     *    Comparing raw would make every single line differ and produce a diff
     *    where both sides look identical.
     *
     * What survives normalisation is the part that matters: the full markdown
     * body and timestamp, byte for byte.
     */
    const normalise = (md: string) => md.replace(/\r\n/g, "\n");

    expect(normalise(copied)).toBe(normalise(rendered));

    // And the time itself is still a real time, not a leftover placeholder.
    expect(copied).toMatch(CLOCK);
  });

  test("resets the copy confirmation so the button stays reusable", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/");
    await waitForHydration(page);
    await page.getByRole("switch").click();

    const copy = page.getByRole("button", { name: /copy markdown/i });
    await copy.click();
    await expect(page.getByRole("button", { name: /copied/i })).toBeVisible();

    // The handler restores the label after a timeout. If that regressed, the
    // button would read "Copied!" forever and give no feedback on a second copy.
    await expect(copy).toBeVisible({ timeout: 5000 });
  });

  test("offers manual copying when clipboard access is denied", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator.clipboard, "writeText", {
        value: async () => {
          throw new Error("Clipboard denied");
        },
      });
    });
    await page.goto("/");
    await waitForHydration(page);
    await page.getByRole("switch").click();
    await page.getByRole("button", { name: /copy markdown/i }).click();
    await expect(page.getByRole("status")).toContainText("copy it manually");
    await expect(page.locator("main pre")).toBeVisible();
    await expect(page.getByRole("button", { name: /copied/i })).toHaveCount(0);
  });
});
