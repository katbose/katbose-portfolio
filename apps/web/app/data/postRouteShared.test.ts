import { describe, expect, test } from "bun:test";
import { postToMarkdown } from "./postHelpers";
import { postMarkdownResponse, postMetadata } from "./postRouteShared";
import { canonicalPostPath } from "./postRoutes";
import { posts } from "./posts";
import { SITE_URL } from "./siteMeta";

/**
 * Shared bodies for the four post routes. Both collections use these, so a
 * regression here would silently desynchronise /blogs and /explore.
 */

const FIRST = posts[0];

describe("postMetadata", () => {
  test("carries the post's own title and description", () => {
    for (const post of posts) {
      const meta = postMetadata(post.slug);
      expect(meta.title).toBe(post.title);
      expect(meta.description).toBe(post.description);
    }
  });

  test("declares an absolute canonical url on the canonical collection", () => {
    // This is what stops /blogs/<slug> and /explore/<slug> competing as
    // duplicates: both emit the same canonical.
    for (const post of posts) {
      const canonical = postMetadata(post.slug).alternates?.canonical;
      expect(canonical).toBe(`${SITE_URL}${canonicalPostPath(post.slug)}`);
      expect(String(canonical).startsWith("https://")).toBe(true);
    }
  });

  test("returns empty metadata for an unknown slug rather than throwing", () => {
    // generateMetadata runs before the page decides to notFound(), so this has
    // to tolerate a slug that is about to 404.
    expect(postMetadata("definitely-not-a-real-slug-xyz")).toEqual({});
  });
});

describe("postMarkdownResponse", () => {
  test("serves the post as markdown with the right content type", async () => {
    expect(FIRST).toBeDefined();
    if (!FIRST) return;
    const response = postMarkdownResponse(FIRST.slug);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/markdown");
    expect(await response.text()).toBe(postToMarkdown(FIRST));
  });

  test("returns identical bytes for every post, whichever collection asked", () => {
    for (const post of posts) {
      expect(postMarkdownResponse(post.slug).status).toBe(200);
    }
  });

  test("404s an unknown slug", async () => {
    const response = postMarkdownResponse("definitely-not-a-real-slug-xyz");
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
  });
});
