import { postMarkdownResponse } from "../../../data/postRouteShared";
import { posts } from "../../../data/posts";

/** Pre-render the markdown endpoint for every post at build time. */
export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

/**
 * Serves a post as raw markdown. Reached at /explore/<slug>/markdown, or via
 * /explore/<slug>?format=markdown (rewritten by proxy.ts) — the agent-friendly
 * version of the post.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return postMarkdownResponse(slug);
}
