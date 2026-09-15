import type { Page } from "@playwright/test";
import { expect, test, waitForHydration } from "./fixtures";

/**
 * Visual baselines for the server-first refactor.
 *
 * WHY THIS SUITE EXISTS
 * ---------------------
 * The refactor's whole premise is "same pixels, less JavaScript". Every other
 * test in this directory checks behaviour — headings exist, links point
 * somewhere, modes swap — and all of them would still pass if a section lost its
 * spacing, a gradient inverted, or dark mode stopped applying to one card. These
 * screenshots are the only thing that makes "nothing changed visually" a claim
 * rather than an assertion of good intent.
 *
 * HOW THESE STAY DETERMINISTIC
 * ----------------------------
 * Four sources of nondeterminism, handled deliberately:
 *
 *   - The clock. Masked via `data-testid="local-time"`.
 *   - WebGL. The water shaders paint a new frame forever, so every `<canvas>` is
 *     masked. Their *layout* is still covered, since the mask occupies the same
 *     box.
 *   - CSS animation. `animations: "disabled"` in the Playwright config settles
 *     the marquee and the reveal transitions at their end state.
 *   - Third-party images. Already blocked by the shared fixture, so remote logos
 *     and the contributions graph fail the same way on every run.
 *
 * RUNNING THEM
 *   bun run test:visual                  # compare against committed baselines
 *   bun run test:visual -- --update-snapshots
 *
 * Baselines are platform-specific. See the note in `playwright.config.ts`.
 */

/** Regions whose pixels legitimately differ between runs. */
function unstableRegions(page: Page) {
  return [
    page.getByTestId("local-time"),
    // Every water shader surface. Masked as a group so adding or removing an
    // instance does not silently stop masking one.
    page.locator("canvas"),
  ];
}

/**
 * Settle the page: hydrated, fonts loaded, reveal transitions finished, and
 * count-up animations at their final values.
 *
 * The count-up statistics are driven by requestAnimationFrame rather than CSS,
 * so `animations: "disabled"` does not finish them — they need real time.
 */
async function settle(page: Page): Promise<void> {
  await waitForHydration(page);
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(2500);
}

/** Scroll the whole page so every lazy/reveal-gated section has been triggered. */
async function scrollThrough(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
}

async function setTheme(page: Page, theme: "light" | "dark"): Promise<void> {
  await page.goto(`/?theme=${theme}`);
  await settle(page);
  await expect
    .poll(async () => page.evaluate(() => document.documentElement.classList.contains("dark")), {
      timeout: 5000,
    })
    .toBe(theme === "dark");
}

test.describe("human mode", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`full page in ${theme} mode`, async ({ page }) => {
      await setTheme(page, theme);
      await scrollThrough(page);

      await expect(page).toHaveScreenshot(`human-${theme}.png`, {
        fullPage: true,
        mask: unstableRegions(page),
      });
    });
  }

  test("hero is pixel-stable", async ({ page }) => {
    // Tighter than the full-page shot: the hero is the first thing anyone sees,
    // and a full-page diff can absorb a small regression here inside its budget.
    await setTheme(page, "light");

    // Clipped at the page level rather than shot from a locator: the hero
    // renders as a fragment with no wrapping element of its own, and `clip` is
    // only accepted for page screenshots.
    await expect(page).toHaveScreenshot("hero-light.png", {
      mask: unstableRegions(page),
      clip: { x: 0, y: 0, width: 900, height: 700 },
    });
  });
});

test.describe("agent mode", () => {
  test("markdown view renders identically", async ({ page }) => {
    await setTheme(page, "light");
    await page.getByRole("switch").click();
    await expect(page.locator("main pre")).toHaveCount(1);
    await page.waitForTimeout(600);

    await expect(page).toHaveScreenshot("agent-light.png", {
      fullPage: true,
      mask: unstableRegions(page),
    });
  });
});

test.describe("interactive states", () => {
  test("tech stack expanded into category groups", async ({ page }) => {
    await setTheme(page, "light");

    const toggle = page.getByRole("button", { name: /view full stack/i });
    await toggle.scrollIntoViewIfNeeded();
    await toggle.click();
    // The marquee is swapped for the grouped list via AnimatePresence; wait for
    // the exit/enter pair to finish before shooting.
    await page.waitForTimeout(1200);

    await expect(page).toHaveScreenshot("techstack-expanded.png", {
      fullPage: true,
      mask: unstableRegions(page),
    });
  });

  test("QR dialog", async ({ page }) => {
    await setTheme(page, "light");
    await page.getByRole("button", { name: /show qr code/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.waitForTimeout(400);

    await expect(page.getByRole("dialog")).toHaveScreenshot("qr-dialog.png");
  });
});
