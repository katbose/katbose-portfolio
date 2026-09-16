import { expect, test, waitForHydration } from "./fixtures";

test.use({ viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true });

test("touch navigation is usable without starting WebGL", async ({ page }) => {
  await page.goto("/");
  await waitForHydration(page);
  await expect(page.getByRole("navigation")).toHaveCSS("opacity", "1");
  await expect(page.getByTestId("water-overlay").locator(".water-sheen")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByRole("button", { name: /show qr code/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
