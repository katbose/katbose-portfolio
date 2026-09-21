import { collectErrors, expect, sortedPosts, test } from "./fixtures";

const firstPost = sortedPosts[0];

/**
 * Posts live under a collection: /blogs/<slug> and /explore/<slug>. Both serve
 * the same pool, so these run against each prefix. "explore" is the canonical
 * collection — see app/data/postRoutes.ts.
 */
const COLLECTIONS = ["blogs", "explore"] as const;
const CANONICAL_COLLECTION = "explore";

test.describe("essay routes", () => {
  test("every post has a reachable page under both collections", async ({ page }) => {
    expect(sortedPosts.length).toBeGreaterThan(0);
    for (const collection of COLLECTIONS) {
      for (const post of sortedPosts) {
        const path = `/${collection}/${post.slug}`;
        const response = await page.goto(path);
        expect(response?.status(), `GET ${path}`).toBe(200);
        await expect(page.locator("h1").first()).toHaveText(post.title);
        await expect(page.getByText(post.kicker, { exact: true }).first()).toBeAttached();
      }
    }
  });

  test("a post page shows reading time and a breadcrumb trail home", async ({ page }) => {
    expect(firstPost).toBeDefined();
    if (!firstPost) return;
    await page.goto(`/explore/${firstPost.slug}`);
    await expect(page.getByText(/\d+ min read/).first()).toBeAttached();

    // The old top-of-page "Back to portfolio" link is replaced by breadcrumbs.
    const trail = page.getByRole("navigation", { name: /breadcrumb/i });
    await expect(trail).toBeAttached();
    await expect(trail.getByRole("link", { name: "Explore" })).toBeAttached();
    // The post itself is the current page, so it is not a link.
    await expect(trail.getByText(firstPost.title, { exact: true })).toBeAttached();

    await trail.getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("a post page declares the canonical collection", async ({ page }) => {
    expect(firstPost).toBeDefined();
    if (!firstPost) return;
    // Reached via /blogs, the canonical still points at the /explore copy, so the
    // duplicate URLs do not compete.
    await page.goto(`/blogs/${firstPost.slug}`);
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute(
      "href",
      new RegExp(`/${CANONICAL_COLLECTION}/${firstPost.slug}$`),
    );
  });

  test("a legacy /<slug> URL permanently redirects to the canonical post", async ({ page }) => {
    expect(firstPost).toBeDefined();
    if (!firstPost) return;
    await page.goto(`/${firstPost.slug}`);
    await expect(page).toHaveURL(new RegExp(`/${CANONICAL_COLLECTION}/${firstPost.slug}$`));
    await expect(page.locator("h1").first()).toHaveText(firstPost.title);
  });

  test("an unknown slug returns 404", async ({ page }) => {
    const response = await page.goto("/definitely-not-a-real-slug-xyz");
    expect(response?.status()).toBe(404);
  });

  test("an unknown slug under a collection returns 404", async ({ page }) => {
    const response = await page.goto("/explore/definitely-not-a-real-slug-xyz");
    expect(response?.status()).toBe(404);
  });

  test("a post page produces no uncaught exceptions", async ({ page }) => {
    expect(firstPost).toBeDefined();
    if (!firstPost) return;
    const errors = collectErrors(page);
    await page.goto(`/explore/${firstPost.slug}`, { waitUntil: "load" });
    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);
  });
});

test.describe("markdown negotiation via the proxy", () => {
  test("?format=markdown serves raw markdown under both collections", async ({ request }) => {
    for (const collection of COLLECTIONS) {
      for (const post of sortedPosts) {
        const path = `/${collection}/${post.slug}?format=markdown`;
        const response = await request.get(path);
        expect(response.status(), `GET ${path}`).toBe(200);

        const body = await response.text();
        expect(body.startsWith(`# ${post.title}`), `markdown for ${path}`).toBe(true);
        expect(response.headers()["content-type"]).toContain("markdown");
      }
    }
  });

  test("?format=markdown still works on the legacy /<slug> URL", async ({ request }) => {
    expect(firstPost).toBeDefined();
    if (!firstPost) return;
    // Rewritten, not redirected, so already-shared links keep returning markdown
    // on the URL that was shared.
    const response = await request.get(`/${firstPost.slug}?format=markdown`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("markdown");
    expect((await response.text()).startsWith(`# ${firstPost.title}`)).toBe(true);
  });

  test("the /markdown route handler serves the same content directly", async ({ request }) => {
    expect(firstPost).toBeDefined();
    if (!firstPost) return;
    const viaProxy = await (await request.get(`/explore/${firstPost.slug}?format=markdown`)).text();
    const viaRoute = await (await request.get(`/explore/${firstPost.slug}/markdown`)).text();
    expect(viaProxy).toBe(viaRoute);
  });

  test("?format=markdown on a non-post path passes through to the page", async ({ request }) => {
    const response = await request.get("/explore?format=markdown");
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
      // Only the canonical URL is submitted, not both collections.
      expect(xml).toContain(`/${CANONICAL_COLLECTION}/${post.slug}`);
    }
  });

  test("each listing links to every post under its own prefix", async ({ page }) => {
    for (const collection of COLLECTIONS) {
      await page.goto(`/${collection}`);
      for (const post of sortedPosts) {
        await expect(page.locator(`a[href="/${collection}/${post.slug}"]`).first()).toBeAttached();
      }
    }
  });
});
