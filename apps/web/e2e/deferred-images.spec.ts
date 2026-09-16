import { expect, test, waitForHydration } from "./fixtures";

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test("illustration source loads only near its section", async ({ page }) => {
  await page.goto("/");
  await waitForHydration(page);
  const illustration = page.getByTestId("water-image").first();
  await expect(illustration).not.toHaveAttribute("src");
  await illustration.scrollIntoViewIfNeeded();
  await expect(illustration).toHaveAttribute("src", /\/_next\/image\?/);
  await expect
    .poll(() =>
      illustration.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
    )
    .toBe(true);
});
