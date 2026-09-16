import { expect, test, waitForHydration } from "./fixtures";

test("reduced motion keeps the content and controls usable without animated shaders", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await waitForHydration(page);
  const illustration = page.getByTestId("water-image").first();
  await illustration.scrollIntoViewIfNeeded();
  await expect(illustration).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByRole("button", { name: /view full stack/i }).scrollIntoViewIfNeeded();
  await expect(page.locator(".animate-infinite-scroll")).toHaveCSS("animation-name", "none");

  await page.getByRole("switch").click();
  await expect(page.locator("main pre")).toBeVisible();
  await page.getByRole("switch").click();
  await expect(page.locator("main pre")).toHaveCount(0);
  await expect(page.locator("h1")).toBeVisible();
});

test("reduced motion switches themes without starting a view transition", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?theme=light");
  await waitForHydration(page);
  await page.evaluate(() => {
    const original = document.startViewTransition.bind(document);
    document.startViewTransition = (...args) => {
      document.documentElement.dataset.themeTransitionStarted = "true";
      return original(...args);
    };
  });

  await page.getByRole("button", { name: /toggle theme/i }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator("html")).not.toHaveAttribute("data-theme-transition-started");
  await page.getByRole("button", { name: /toggle theme/i }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(page.locator("html")).not.toHaveAttribute("data-theme-transition-started");
});
