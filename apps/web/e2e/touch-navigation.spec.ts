import { collectErrors, expect, test, waitForHydration } from "./fixtures";

test.use({ viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true });

test("touch navigation renders the desktop water shader and remains usable", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/?theme=light");
  await waitForHydration(page);
  await expect(page.getByRole("navigation")).toHaveCSS("opacity", "1");
  await expect(page.getByTestId("water-overlay").locator("[data-paper-shader]")).toBeVisible();
  await expect(page.getByTestId("water-overlay").locator("canvas")).toBeVisible();
  await expect(page.locator(".nav-edge-shine")).toHaveCSS("animation-name", "nav-edge-shine");
  await page.getByRole("button", { name: /toggle theme/i }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByTestId("water-overlay").locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: /show qr code/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(errors).toEqual([]);
});
