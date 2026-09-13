import { describe, expect, test } from "bun:test";
import { getPost, getSortedPosts, posts } from "./posts";

/**
 * Characterization tests for post lookup.
 *
 * Every expectation is derived from `portfolio.json` at runtime — no post
 * title, slug, or date is hardcoded. Content can be rewritten freely without
 * touching this file; only a change in lookup *behaviour* should fail here.
 */

describe("posts - shape", () => {
  test("at least one post is defined", () => {
    expect(posts.length).toBeGreaterThan(0);
  });

  test("every post carries the fields the routes depend on", () => {
    for (const post of posts) {
      expect(typeof post.slug).toBe("string");
      expect(post.slug.length).toBeGreaterThan(0);
      expect(typeof post.kicker).toBe("string");
      expect(typeof post.title).toBe("string");
      expect(post.title.length).toBeGreaterThan(0);
      expect(typeof post.description).toBe("string");
      expect(Array.isArray(post.blocks)).toBe(true);
      expect(post.blocks.length).toBeGreaterThan(0);
    }
  });

  test("every slug is lowercase-kebab-case, so it is URL-safe", () => {
    for (const post of posts) {
      expect(post.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  test("slugs are unique, so routing is unambiguous", () => {
    const slugs = posts.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test("every date is a valid YYYY-MM-DD value", () => {
    for (const post of posts) {
      expect(post.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(post.date))).toBe(false);
    }
  });

  test("every block is a known variant with its required payload", () => {
    for (const post of posts) {
      for (const block of post.blocks) {
        expect(["p", "h2", "list"]).toContain(block.type);
        if (block.type === "list") {
          expect(Array.isArray(block.items)).toBe(true);
          expect(block.items.length).toBeGreaterThan(0);
        } else {
          expect(typeof block.text).toBe("string");
          expect(block.text.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe("getPost", () => {
  test("resolves every real slug to the matching post", () => {
    for (const post of posts) {
      expect(getPost(post.slug)).toEqual(post);
    }
  });

  test("returns undefined for an unknown slug", () => {
    expect(getPost("definitely-not-a-real-slug-xyz")).toBeUndefined();
  });

  test("is case-sensitive, matching the lowercase routing contract", () => {
    const first = posts[0];
    expect(first).toBeDefined();
    if (first && first.slug !== first.slug.toUpperCase()) {
      expect(getPost(first.slug.toUpperCase())).toBeUndefined();
    }
  });
});

describe("getSortedPosts", () => {
  test("returns newest first", () => {
    const sorted = getSortedPosts();
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      expect(prev).toBeDefined();
      expect(curr).toBeDefined();
      if (prev && curr) {
        expect(prev.date >= curr.date).toBe(true);
      }
    }
  });

  test("returns every post exactly once", () => {
    const sorted = getSortedPosts();
    expect(sorted.length).toBe(posts.length);
    expect(new Set(sorted.map((p) => p.slug))).toEqual(new Set(posts.map((p) => p.slug)));
  });

  test("does not mutate the source array", () => {
    const before = posts.map((p) => p.slug);
    getSortedPosts();
    expect(posts.map((p) => p.slug)).toEqual(before);
  });
});
