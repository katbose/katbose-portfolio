/**
 * Where a post lives.
 *
 * Both homepage sections and both archives list the same post pool, so every
 * post is reachable under either prefix: `/blogs/<slug>` and `/explore/<slug>`.
 * `Post` has no blog-vs-explore field yet, which is why the two collections
 * currently serve identical content.
 *
 * Because one post answers at two URLs, `CANONICAL_COLLECTION` picks which of
 * them is authoritative: every post page emits a canonical link pointing there,
 * the sitemap lists only that URL, and the legacy `/<slug>` route permanently
 * redirects to it. That keeps the duplicate URLs from competing in search.
 *
 * When posts gain a collection field, this module is the only place that has to
 * change — nothing else builds a post path by hand.
 */

export const POST_COLLECTIONS = ["blogs", "explore"] as const;

export type PostCollection = (typeof POST_COLLECTIONS)[number];

/** How each collection is named in breadcrumbs and archive headings. */
export const COLLECTION_LABELS: Record<PostCollection, string> = {
  blogs: "Blogs",
  explore: "Explore",
};

/**
 * The prefix a post's canonical URL uses.
 *
 * "explore" because every post is currently an essay and `/explore` is the
 * essays archive. Flip this and the canonical tags, sitemap, and legacy
 * redirects all follow.
 */
export const CANONICAL_COLLECTION: PostCollection = "explore";

/** Root-relative path to a post inside a collection. */
export function postPath(collection: PostCollection, slug: string): string {
  return `/${collection}/${slug}`;
}

/** Root-relative canonical path for a post, wherever it was linked from. */
export function canonicalPostPath(slug: string): string {
  return postPath(CANONICAL_COLLECTION, slug);
}

/** Narrows an arbitrary path segment to a known collection. */
export function isPostCollection(value: string): value is PostCollection {
  return (POST_COLLECTIONS as readonly string[]).includes(value);
}
