import { describe, expect, test } from "bun:test";
import {
  CANONICAL_COLLECTION,
  COLLECTION_LABELS,
  canonicalPostPath,
  isPostCollection,
  POST_COLLECTIONS,
  type PostCollection,
  postPath,
} from "./postRoutes";
import { posts } from "./posts";

/**
 * These guard the URL contract for posts.
 *
 * A post is reachable under both collections, so the canonical path is what
 * stops the two from competing in search. `postHelpers`, `sitemap.ts`, the
 * `/[slug]` redirect shim and `proxy.ts` all derive from the helpers here, which
 * is why the invariants are asserted once, centrally.
 */

describe("POST_COLLECTIONS", () => {
  test("every collection has a label", () => {
    for (const collection of POST_COLLECTIONS) {
      expect(COLLECTION_LABELS[collection], `label for "${collection}"`).toBeTruthy();
    }
  });

  test("exposes no label for a collection that does not exist", () => {
    // Catches the reverse drift: a label left behind after a collection is removed.
    expect(Object.keys(COLLECTION_LABELS).sort()).toEqual([...POST_COLLECTIONS].sort());
  });

  test("the canonical collection is one of the real collections", () => {
    expect(POST_COLLECTIONS).toContain(CANONICAL_COLLECTION);
  });
});

describe("postPath", () => {
  test("builds a root-relative path for every collection and post", () => {
    for (const collection of POST_COLLECTIONS) {
      for (const post of posts) {
        expect(postPath(collection, post.slug)).toBe(`/${collection}/${post.slug}`);
      }
    }
  });

  test("produces exactly two path segments, with no double slash", () => {
    for (const collection of POST_COLLECTIONS) {
      const path = postPath(collection, "some-slug");
      expect(path.startsWith("/")).toBe(true);
      expect(path).not.toContain("//");
      expect(path.split("/").filter(Boolean)).toHaveLength(2);
    }
  });
});

describe("canonicalPostPath", () => {
  test("always resolves to the canonical collection, never the other one", () => {
    for (const post of posts) {
      expect(canonicalPostPath(post.slug)).toBe(postPath(CANONICAL_COLLECTION, post.slug));
    }
  });

  test("is stable for a slug regardless of where it was linked from", () => {
    // The point of the canonical path: two call sites, one answer.
    const fromBlogs = canonicalPostPath("consumer-design");
    const fromExplore = canonicalPostPath("consumer-design");
    expect(fromBlogs).toBe(fromExplore);
  });
});

describe("isPostCollection", () => {
  test("accepts every real collection", () => {
    for (const collection of POST_COLLECTIONS) {
      expect(isPostCollection(collection)).toBe(true);
    }
  });

  test("rejects anything else, including near-misses and path noise", () => {
    for (const value of ["", "blog", "explores", "Blogs", "/blogs", "thoughts", "..", "%2e%2e"]) {
      expect(isPostCollection(value), `isPostCollection(${JSON.stringify(value)})`).toBe(false);
    }
  });

  test("narrows the type, so a checked segment is usable as a collection", () => {
    const segment: string = "explore";
    if (isPostCollection(segment)) {
      // Compiles only because the guard narrowed `string` to PostCollection.
      const collection: PostCollection = segment;
      expect(postPath(collection, "x")).toBe("/explore/x");
    }
  });
});
