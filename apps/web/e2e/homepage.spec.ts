import { collectErrors, expect, hero, portfolio, sectionTitles, test } from "./fixtures";

test.describe("homepage", () => {
  test("loads and renders the hero name as the page h1", async ({ page }) => {
    await page.goto("/");
    expect(hero).toBeDefined();
    if (!hero) return;
    await expect(page.locator("h1").first()).toHaveText(hero.data.name);
  });

  test("renders the document title and meta description from the data file", async ({ page }) => {
    await page.goto("/");
    expect(hero).toBeDefined();
    if (!hero) return;
    await expect(page).toHaveTitle(new RegExp(escapeRegExp(hero.data.name)));

    const description = await page.locator('meta[name="description"]').getAttribute("content");
    expect(description).toBeTruthy();
    expect(description).not.toContain("**");
    expect(description).not.toContain("](");
  });

  test("renders every hero intro paragraph", async ({ page }) => {
    await page.goto("/");
    expect(hero).toBeDefined();
    if (!hero) return;
    for (const paragraph of hero.data.intro) {
      // Strip inline markdown; the DOM shows rendered text, not the source.
      const plain = paragraph
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/\*\*/g, "")
        .trim();
      const firstWords = plain.split(/\s+/).slice(0, 6).join(" ");
      await expect(page.getByText(firstWords, { exact: false }).first()).toBeAttached();
    }
  });

  test("renders the local time in the hero", async ({ page }) => {
    await page.goto("/");
    expect(hero).toBeDefined();
    if (!hero) return;
    await expect(page.getByText(hero.data.timezone.label, { exact: true }).first()).toBeAttached();
    await expect(page.getByText(/\d{2}:\d{2}:\d{2}/).first()).toBeAttached();
  });

  test("renders all section headings in the order given by portfolio.json", async ({ page }) => {
    await page.goto("/");
    expect(sectionTitles.length).toBeGreaterThan(0);

    const headings = await page.locator("main h2").allTextContents();
    const trimmed = headings.map((h) => h.trim());

    // Every configured section title must appear...
    for (const title of sectionTitles) {
      expect(trimmed).toContain(title);
    }
    // ...and in the same relative order as the data file.
    const positions = sectionTitles.map((t) => trimmed.indexOf(t));
    const sorted = [...positions].sort((a, b) => a - b);
    expect(positions).toEqual(sorted);
  });

  test("renders a link for every configured social", async ({ page }) => {
    await page.goto("/");
    for (const social of portfolio.socials) {
      await expect(page.locator(`a[href="${social.href}"]`).first()).toBeAttached();
    }
  });

  test("the navbar calendar link points at meta.calendarUrl, not an email", async ({ page }) => {
    await page.goto("/");
    const calendar = page.getByRole("link", { name: "Calendar" });
    await expect(calendar).toBeAttached();
    await expect(calendar).toHaveAttribute("href", portfolio.meta.calendarUrl);
    // Guards the bug where the calendar icon was wired to a mailto: address.
    expect(portfolio.meta.calendarUrl.startsWith("mailto:")).toBe(false);
  });

  test("produces no uncaught exceptions or unexpected console errors", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/", { waitUntil: "load" });
    await page.waitForTimeout(1500);
    expect(errors).toEqual([]);
  });
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
