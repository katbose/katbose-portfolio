import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { readingTime } from "../data/postHelpers";
import { COLLECTION_LABELS, type PostCollection, postPath } from "../data/postRoutes";
import { getSortedPosts, type Post } from "../data/posts";
import { OptimizedImage as Image } from "./OptimizedImage";
import { SiteMenu } from "./SiteMenu.client";
import { ThemeToggle } from "./ThemeToggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";

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
        <a
          key={post.slug}
          href={postPath(collection, post.slug)}
          // Fixed row height on desktop. Without it the cover is a stretched flex
          // item, so its height tracks the text column and `aspect-video` is
          // ignored — a 2-line description rendered a 152px cover next to a
          // 172px one, and object-cover scaled each thumbnail differently.
          className="group flex flex-col sm:h-44 sm:flex-row overflow-hidden rounded-xl border border-gray-200 transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:hover:border-gray-600"
        >
          {/* Cover — fixed sm:w-64 so the copy keeps the full remaining width.
              Deriving the width from the row height instead would give a true
              16:9 well but costs the text column ~53px, which is not worth it.
              At this width the well is ~1.47:1, so object-cover trims the sides
              of 16:9 artwork slightly. No background fill, so the card stays as
              light as the /explore rows. */}
          <div className="relative aspect-video w-full sm:w-64 shrink-0 overflow-hidden">
            <Image
              src={post.coverImage ?? "/blog-cover-placeholder.svg"}
              alt={post.coverAlt ?? ""}
              fill
              sizes="(max-width: 640px) 100vw, 256px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>

          {/* Copy */}
          <div className="flex min-w-0 flex-col justify-center gap-1.5 p-4 sm:p-5">
            <PostMeta post={post} />
            {/* Clamped so a long title or description cannot outgrow the fixed
                row height and reintroduce uneven covers. */}
            <span className="line-clamp-2 text-sm font-semibold leading-snug text-black dark:text-white">
              {post.title}
            </span>
            <span className="line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              {post.description}
            </span>
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-gray-500 transition-colors group-hover:text-black dark:text-gray-400 dark:group-hover:text-white">
              Read blog
              <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </div>
        </a>
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
    <div className="relative flex min-h-screen flex-col items-center bg-white dark:bg-black px-3 pt-16 text-black dark:text-white selection:bg-black dark:selection:bg-white selection:text-white dark:selection:text-black pb-32 sm:px-4 sm:pt-24 sm:pb-40 overflow-x-hidden transition-colors duration-300">
      {/* Theme Toggle in Top Right */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Menu sits top left on mobile and bottom right on desktop. */}
      <div className="fixed top-6 left-4 z-40 flex sm:top-auto sm:bottom-6 sm:left-auto sm:right-6">
        <SiteMenu />
      </div>

      {/* max-w-2xl matches the portfolio's own column, so the media rows keep the
          same proportions as the homepage podcast cards they're modelled on. */}
      <main className="flex w-full max-w-2xl flex-col text-left">
        {/* Replaces the old "← Back to portfolio" link: the trail already leads
            home, and the bottom island nav still offers the one-tap route. */}
        <Breadcrumb className="mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{COLLECTION_LABELS[collection]}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <span className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
          {label}
        </span>
        <h1 className="mb-12 text-3xl font-bold tracking-tight sm:text-4xl">{heading}</h1>

        {variant === "media" ? (
          <MediaLayout posts={posts} collection={collection} />
        ) : (
          <ListLayout posts={posts} collection={collection} />
        )}
      </main>

      {/* Bottom island nav, matching the portfolio */}
      <nav className="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full border border-gray-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-900/80 px-5 py-3 shadow-sm backdrop-blur-md transition-all hover:bg-white/90 dark:hover:bg-zinc-900">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-300 transition-colors hover:text-black dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Portfolio
        </a>
      </nav>
    </div>
  );
}
