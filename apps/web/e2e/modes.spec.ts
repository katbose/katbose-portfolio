import { expect, hero, isDark, test, waitForHydration } from "./fixtures";

test.describe("human / agent mode", () => {
  test("defaults to human mode with the rendered sections", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    const toggle = page.getByRole("switch");
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await expect(page.locator("main h2").first()).toBeAttached();
    await expect(page.locator("main pre")).toHaveCount(0);
  });

  test("switching to agent mode swaps the sections for markdown", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    const toggle = page.getByRole("switch");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");

    const pre = page.locator("main pre");
    await expect(pre).toHaveCount(1);

    // The markdown view is generated from the same data as the visual sections.
    // Per-section mapping is asserted in the generateMarkdown unit tests; here we
    // only check the structural invariants a reader would notice.
    const markdown = (await pre.textContent()) ?? "";
    expect(hero).toBeDefined();
    if (hero) {
      expect(markdown).toContain(`# ${hero.data.name}`);
      expect(markdown).toContain("## About");
    }
    expect(markdown).toContain("**Links:**");
    expect(markdown.length).toBeGreaterThan(500);
  });

  test("agent mode exposes a copy button and returns to human mode", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    const toggle = page.getByRole("switch");

    await toggle.click();
    await expect(page.getByRole("button", { name: /copy markdown/i })).toBeVisible();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await expect(page.locator("main pre")).toHaveCount(0);
    await expect(page.locator("main h2").first()).toBeAttached();
  });
});

test.describe("theme toggle", () => {
  test("flips the dark class on the document root", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    const button = page.getByRole("button", { name: /toggle theme/i });
    const before = await isDark(page);

    await button.click();
    await expect.poll(async () => await isDark(page), { timeout: 5000 }).toBe(!before);

    await button.click();
    await expect.poll(async () => await isDark(page), { timeout: 5000 }).toBe(before);
  });

  test("honours the ?theme= query parameter", async ({ page }) => {
    await page.goto("/?theme=dark");
    await waitForHydration(page);
    await expect.poll(async () => await isDark(page), { timeout: 5000 }).toBe(true);

    await page.goto("/?theme=light");
    await waitForHydration(page);
    await expect.poll(async () => await isDark(page), { timeout: 5000 }).toBe(false);
  });
});

test.describe("QR dialog", () => {
  test("opens, exposes a dialog role, and closes on Escape", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    await page.getByRole("button", { name: /show qr code/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });
});
