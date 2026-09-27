import { ArrowUpRight } from "lucide-react";
import { readingTime } from "../data/postHelpers";
import { COLLECTION_LABELS, type PostCollection, postPath } from "../data/postRoutes";
import { getSortedPosts, type Post } from "../data/posts";
import { ArchiveShell } from "./ArchiveShell";
import { MediaArchiveCard } from "./MediaArchiveCard";

/**
 * The shared chrome for a post archive, with two listing layouts.
 *
 * `/explore` and `/blogs` were previously the same component with only a
 * different kicker, down to an identical hardcoded `<h1>`, so the two pages were
 * indistinguishable. The layouts here mirror how the homepage already tells the
 * two apart: "Things I Explore" is text-forward (`ThoughtsSection`), "My Blogs"
 * leads with cover art (`BlogsSection`).
 *
 * Both currently draw from the same post pool — there is no blog-vs-explore
 * discriminator on `Post` yet.
 */
export type ArchiveVariant = "list" | "media";

/**
 * Meta row shared by both layouts: kicker • reading time.
 *
 * Carries no margin of its own — the list layout spaces children explicitly,
 * the media layout uses a flex `gap`, and a baked-in `mb` would double up there.
 */
function PostMeta({ post }: { post: Post }) {
  return (
    <div className="flex items-center gap-3 text-xs font-medium text-gray-500 dark:text-gray-400">
      <span className="uppercase tracking-widest">{post.kicker}</span>
      <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-700" />
      <span>{readingTime(post)}</span>
    </div>
  );
}

/** Text-forward rows: no imagery, description carries the weight. */
function ListLayout({ posts, collection }: { posts: Post[]; collection: PostCollection }) {
  return (
    <div className="grid gap-4">
      {posts.map((post) => (
        <a
          key={post.slug}
          href={postPath(collection, post.slug)}
          className="group block rounded-xl border border-gray-200 dark:border-gray-700 p-6 transition-all hover:-translate-y-0.5 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm"
        >
          <div className="mb-2">
            <PostMeta post={post} />
          </div>
          <div className="mb-2 flex items-start justify-between gap-3">
            <span className="text-lg font-semibold text-black dark:text-white">{post.title}</span>
            <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-black dark:group-hover:text-white" />
          </div>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {post.description}
          </p>
        </a>
      ))}
    </div>
  );
}

/**
 * One post per row: cover on the left, text on the right.
 *
 * Deliberately the same shape as `PodcastSection`'s episode cards — a 16:9
 * thumbnail at a fixed `sm:w-64`, stacking to full width on mobile, with the
 * copy vertically centred beside it. Reusing those proportions keeps the blog
 * archive and the homepage podcast list visually consistent.
 */
function MediaLayout({ posts, collection }: { posts: Post[]; collection: PostCollection }) {
  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <MediaArchiveCard
          key={post.slug}
          href={postPath(collection, post.slug)}
          image={post.coverImage ?? "/blog-cover-placeholder.svg"}
          imageAlt={post.coverAlt ?? ""}
          title={post.title}
          description={post.description}
          meta={<PostMeta post={post} />}
          action="Read blog"
        />
      ))}
    </div>
  );
}

export function PostArchive({
  collection,
  label,
  heading,
  variant = "list",
}: {
  /** Which collection this archive lists, and therefore where its posts link. */
  collection: PostCollection;
  /** Small uppercase kicker above the title. */
  label: string;
  /** The page's own `<h1>`. Distinct per archive, not shared. */
  heading: string;
  /** Which listing layout to render. */
  variant?: ArchiveVariant;
}) {
  const posts = getSortedPosts();

  return (
    <ArchiveShell label={label} heading={heading} breadcrumb={COLLECTION_LABELS[collection]}>
      {variant === "media" ? (
        <MediaLayout posts={posts} collection={collection} />
      ) : (
        <ListLayout posts={posts} collection={collection} />
      )}
    </ArchiveShell>
  );
}
