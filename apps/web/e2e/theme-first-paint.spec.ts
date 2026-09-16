import { expect, test, waitForHydration } from "./fixtures";

for (const theme of ["light", "dark"] as const) {
  test(`shared ${theme} theme applies before hydration`, async ({ page }) => {
    await page.addInitScript(
      (saved) => localStorage.setItem("theme", saved),
      theme === "dark" ? "light" : "dark",
    );
    // Block hydration; the initial HTML scripts must choose the shared theme.
    await page.route("**/_next/static/chunks/*.js", (route) => route.abort());
    await page.goto(`/?theme=${theme}`);
    await expect(page.locator("html")).toHaveClass(theme);
    await expect(page.locator("h1")).toBeVisible();
  });
}

test("theme query follows same-document browser history", async ({ page }) => {
  await page.goto("/?theme=light");
  await waitForHydration(page);
  await page.evaluate(() => history.pushState(null, "", "?theme=dark"));
  await page.evaluate(() => history.pushState(null, "", "?theme=light"));
  await page.goBack();
  await expect(page.locator("html")).toHaveClass("dark");
  await page.goForward();
  await expect(page.locator("html")).toHaveClass("light");
});
