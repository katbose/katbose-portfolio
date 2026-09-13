import { expect, portfolio, test, waitForHydration } from "./fixtures";

/**
 * Coverage for the behaviour that depends on the animation library.
 *
 * Added when `framer-motion` 12 was replaced by `motion` 13: the import path
 * changed for every animated component, and a silently broken animation library
 * would still typecheck and still build. These assert the observable results —
 * elements settling to their final state, disclosure toggles working, and the
 * scroll-triggered counter reaching its target — rather than intermediate frames,
 * which would be inherently flaky.
 */

const projectSection = portfolio.sections.find((s) => s.type === "project") as
  | { type: "project"; title: string; data: { stats?: { value: string; label: string }[] } }
  | undefined;

test.describe("scroll reveal", () => {
  test("revealed sections settle to full opacity and no transform", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    // Reveal starts at opacity 0 / y 32 / blur, then animates in when in view.
    const heading = page.locator("main h2").first();
    await heading.scrollIntoViewIfNeeded();

    await expect
      .poll(
        async () => {
          const wrapper = page.locator("main div.w-full").first();
          return wrapper.evaluate((el) => {
            const s = getComputedStyle(el);
            return { opacity: Number(s.opacity), filter: s.filter };
          });
        },
        { timeout: 10_000 },
      )
      .toMatchObject({ opacity: 1 });
  });

  test("every section heading becomes visible after scrolling the page", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);

    const last = page.locator("main h2").last();
    await expect(last).toBeVisible();
  });
});

test.describe("tech stack disclosure", () => {
  test("expands from the marquee into category groups and collapses back", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    // The same button relabels itself between "View Full Stack" and "Show Less",
    // so a name-based locator goes stale after each click. Re-query by the label
    // that should be showing, and read aria-expanded off it.
    const collapsed = page.getByRole("button", { name: /view full stack/i });
    await collapsed.scrollIntoViewIfNeeded();
    await expect(collapsed).toHaveAttribute("aria-expanded", "false");

    await collapsed.click();

    const expanded = page.getByRole("button", { name: /show less/i });
    await expect(expanded).toBeVisible();
    await expect(expanded).toHaveAttribute("aria-expanded", "true");

    await expanded.click();
    await expect(page.getByRole("button", { name: /view full stack/i })).toBeVisible();
  });
});

test.describe("count-up statistics", () => {
  test("each project stat reaches its configured final value", async ({ page }) => {
    test.skip(!projectSection?.data.stats?.length, "no project stats configured");
    await page.goto("/");
    await waitForHydration(page);

    const stats = projectSection?.data.stats ?? [];
    const firstStat = stats[0];
    if (!firstStat) return;

    // CountUp uses useInView({ once: true }), so it renders "0" until scrolled
    // into view. Bring the stat grid on screen before asserting final values.
    const anchor = page.getByText(firstStat.label, { exact: false }).first();
    await anchor.scrollIntoViewIfNeeded();

    for (const stat of stats) {
      // Animates 0 -> the numeric part, preserving any prefix/suffix ("80.7K", "85%").
      await expect
        .poll(async () => await page.getByText(stat.value, { exact: false }).count(), {
          timeout: 10_000,
        })
        .toBeGreaterThan(0);
    }
  });
});

test.describe("reduced motion", () => {
  test("the page is fully usable with prefers-reduced-motion: reduce", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await waitForHydration(page);

    // Content must still be present and the mode switch must still work.
    await expect(page.locator("main h2").first()).toBeAttached();
    const modeToggle = page.getByRole("switch");
    await modeToggle.click();
    await expect(modeToggle).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("main pre")).toHaveCount(1);
  });
});
