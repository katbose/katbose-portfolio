import { collectErrors, expect, sortedPosts, test } from "./fixtures";

const firstPost = sortedPosts[0];

test.describe("essay routes", () => {
  test("every post has a reachable page showing its title and kicker", async ({ page }) => {
    expect(sortedPosts.length).toBeGreaterThan(0);
    for (const post of sortedPosts) {
      const response = await page.goto(`/${post.slug}`);
      expect(response?.status(), `GET /${post.slug}`).toBe(200);
      await expect(page.locator("h1").first()).toHaveText(post.title);
      await expect(page.getByText(post.kicker, { exact: true }).first()).toBeAttached();
    }
  });

  test("a post page shows reading time and a back link to the portfolio", async ({ page }) => {
    expect(firstPost).toBeDefined();
    if (!firstPost) return;
    await page.goto(`/${firstPost.slug}`);
    await expect(page.getByText(/\d+ min read/).first()).toBeAttached();

    const back = page.getByRole("link", { name: /back to portfolio/i });
    await expect(back).toBeAttached();
    await back.click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("an unknown slug returns 404", async ({ page }) => {
    const response = await page.goto("/definitely-not-a-real-slug-xyz");
    expect(response?.status()).toBe(404);
  });

  test("a post page produces no uncaught exceptions", async ({ page }) => {
    expect(firstPost).toBeDefined();
    if (!firstPost) return;
    const errors = collectErrors(page);
    await page.goto(`/${firstPost.slug}`, { waitUntil: "load" });
    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);
  });
});

test.describe("markdown negotiation via the proxy", () => {
  test("?format=markdown serves raw markdown for every real post", async ({ request }) => {
    for (const post of sortedPosts) {
      const response = await request.get(`/${post.slug}?format=markdown`);
      expect(response.status(), `GET /${post.slug}?format=markdown`).toBe(200);

      const body = await response.text();
      expect(body.startsWith(`# ${post.title}`), `markdown for /${post.slug}`).toBe(true);
      expect(response.headers()["content-type"]).toContain("markdown");
    }
  });

  test("the /markdown route handler serves the same content directly", async ({ request }) => {
    expect(firstPost).toBeDefined();
    if (!firstPost) return;
    const viaProxy = await (await request.get(`/${firstPost.slug}?format=markdown`)).text();
    const viaRoute = await (await request.get(`/${firstPost.slug}/markdown`)).text();
    expect(viaProxy).toBe(viaRoute);
  });

  test("?format=markdown on a non-post path passes through to the page", async ({ request }) => {
    const response = await request.get("/thoughts?format=markdown");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/html");
  });

  test("the homepage is unaffected by the format parameter", async ({ request }) => {
    const response = await request.get("/?format=markdown");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/html");
  });
});

test.describe("site plumbing", () => {
  test("robots.txt and sitemap.xml are served", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain("Sitemap");

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    const xml = await sitemap.text();
    for (const post of sortedPosts) {
      expect(xml).toContain(`/${post.slug}`);
    }
  });

  test("the thoughts listing links to every post", async ({ page }) => {
    await page.goto("/thoughts");
    for (const post of sortedPosts) {
      await expect(page.locator(`a[href="/${post.slug}"]`).first()).toBeAttached();
    }
  });
});
