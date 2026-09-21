import { type NextRequest, NextResponse } from "next/server";
import { canonicalPostPath, isPostCollection, postPath } from "./app/data/postRoutes";
import { posts } from "./app/data/posts";

const POST_SLUGS = new Set(posts.map((p) => p.slug));

/**
 * `?format=markdown` serves a post as a raw markdown file (for AI agents and
 * sharing) by rewriting to the post's markdown route handler. Every other
 * request passes through untouched.
 *
 * Three shapes are accepted:
 *   /blogs/<slug>   -> /blogs/<slug>/markdown
 *   /explore/<slug> -> /explore/<slug>/markdown
 *   /<slug>         -> the canonical collection's markdown route
 *
 * The bare `/<slug>` form is the legacy post URL. It is rewritten rather than
 * redirected so the markdown still comes back on the requested URL, matching
 * what already-shared links promise.
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.searchParams.get("format") === "markdown") {
    const segments = request.nextUrl.pathname.replace(/^\/+|\/+$/g, "").split("/");

    if (segments.length === 2) {
      const [collection, slug] = segments;
      if (isPostCollection(collection) && POST_SLUGS.has(slug)) {
        return NextResponse.rewrite(new URL(`${postPath(collection, slug)}/markdown`, request.url));
      }
    }

    if (segments.length === 1 && POST_SLUGS.has(segments[0])) {
      return NextResponse.rewrite(
        new URL(`${canonicalPostPath(segments[0])}/markdown`, request.url),
      );
    }
  }
  return NextResponse.next();
}

export const config = {
  /** Skip Next internals and static assets; run on everything else. */
  matcher: "/((?!_next/|api/|.*\\..*).*)",
};
