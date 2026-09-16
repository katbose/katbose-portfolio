import { collectErrors, expect, test, waitForHydration } from "./fixtures";

// Retain the CSS fallback after hydration so an unpatched attribute mismatch
// cannot be hidden when the desktop shader replaces it.
test.use({ reducedMotion: "reduce", colorScheme: "dark" });

for (const scenario of [
  { name: "saved dark", saved: "dark", url: "/", expected: "dark" },
  { name: "saved light", saved: "light", url: "/", expected: "light" },
  { name: "system dark", saved: "system", url: "/", expected: "dark" },
  { name: "shared dark", saved: "light", url: "/?theme=dark", expected: "dark" },
]) {
  test(`navbar colors match before and after hydration with ${scenario.name}`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.addInitScript((saved) => localStorage.setItem("theme", saved), scenario.saved);
    let releaseScripts = () => {};
    const scriptsReady = new Promise<void>((resolve) => {
      releaseScripts = resolve;
    });
    await page.route("**/_next/static/chunks/*.js", async (route) => {
      await scriptsReady;
      await route.continue();
    });

    const sheen = page.getByTestId("water-overlay").locator(".water-sheen");
    const color = scenario.expected === "dark" ? "rgb(71, 85, 105)" : "rgb(37, 99, 235)";
    const opacity = scenario.expected === "dark" ? "0.22" : "0.45";
    try {
      // Development uses scripts that can delay DOMContentLoaded. Wait for
      // the response, then let assertions wait for the server markup itself.
      await page.goto(scenario.url, { waitUntil: "commit" });
      await expect(page.locator("html")).toHaveClass(scenario.expected);
      await expect(sheen).toHaveCSS("color", color);
      await expect(sheen).toHaveCSS("opacity", opacity);
    } finally {
      releaseScripts();
    }

    await waitForHydration(page);
    await expect(page.getByRole("navigation")).toHaveCSS("opacity", "1");
    await expect(sheen).toHaveCSS("color", color);
    await expect(sheen).toHaveCSS("opacity", opacity);
    await page.getByRole("button", { name: /toggle theme/i }).click();
    await expect(sheen).toHaveCSS(
      "color",
      scenario.expected === "dark" ? "rgb(37, 99, 235)" : "rgb(71, 85, 105)",
    );
    expect(errors).toEqual([]);
  });
}
