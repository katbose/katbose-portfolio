import { notFound, permanentRedirect } from "next/navigation";
import { canonicalPostPath } from "../data/postRoutes";
import { getPost, posts } from "../data/posts";

/**
 * Legacy post URLs.
 *
 * Posts used to live at `/<slug>`; they now live under a collection, at
 * `/blogs/<slug>` and `/explore/<slug>`. Those old URLs are already indexed and
 * shared, so this route stays behind purely to 308 them to the canonical
 * location rather than 404.
 *
 * Driven off the posts list instead of a redirect table in `next.config.ts`, so
 * adding a post cannot leave a stale redirect behind. A slug that was never a
 * post still 404s, which is what an unknown path should do.
 *
 * Static routes such as `/blogs` and `/explore` are matched ahead of this
 * dynamic segment, so they are unaffected.
 */
export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function LegacyPostRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!getPost(slug)) notFound();

  permanentRedirect(canonicalPostPath(slug));
}
