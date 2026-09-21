import type { Metadata } from "next";
import { postToMarkdown } from "./postHelpers";
import { canonicalPostPath } from "./postRoutes";
import { getPost } from "./posts";
import { SITE_URL } from "./siteMeta";

/**
 * Shared bodies for the four post routes: a page and a markdown endpoint under
 * each of `/blogs/[slug]` and `/explore/[slug]`. Keeping them here means the two
 * collections cannot drift in metadata or content negotiation.
 */

/**
 * Title, description, and — the part that matters — an explicit canonical URL.
 *
 * The same post answers at both `/blogs/<slug>` and `/explore/<slug>`, so
 * without this the two would compete as duplicates in search. Both point at
 * `canonicalPostPath`.
 */
export function postMetadata(slug: string): Metadata {
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `${SITE_URL}${canonicalPostPath(post.slug)}` },
  };
}

/** A post as a raw markdown file, or 404 when the slug is not a post. */
export function postMarkdownResponse(slug: string): Response {
  const post = getPost(slug);
  if (!post) return new Response("Not found", { status: 404 });
  return new Response(postToMarkdown(post), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
