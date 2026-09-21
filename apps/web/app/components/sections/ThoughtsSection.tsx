import { ArrowRight, ArrowUpRight } from "lucide-react";
import { readingTime } from "../../data/postHelpers";
import { postPath } from "../../data/postRoutes";
import { getSortedPosts, type Post } from "../../data/posts";
import { Inline } from "../RichText";
import { SectionShell } from "../SectionShell";

/**
 * "Things I Explore" — a compact listing of the latest essays/posts, pulled from the
 * `posts` array in `portfolio.json`. Shows the newest few as small cards in a
 * single row; "View more" links to the full archive.
 */
export interface ThoughtsData {
  /** How many recent posts to preview. Defaults to 3. */
  count?: number;
  /** Label for the "explore all" link. Defaults to "View more". */
  viewAllLabel?: string;
  /** Where "explore all" points. Defaults to /explore. */
  viewAllHref?: string;
}

/** The preview text for a card: the post's first paragraph. */
function previewText(post: Post): string {
  const firstParagraph = post.blocks.find((b) => b.type === "p");
  return firstParagraph && firstParagraph.type === "p" ? firstParagraph.text : post.description;
}

export function ThoughtsSection({ title, data }: { title: string; data: ThoughtsData }) {
  const count = data.count ?? 3;
  const posts = getSortedPosts();
  const previews = posts.slice(0, count);

  return (
    <SectionShell title={title}>
      <div className="grid gap-3 sm:grid-cols-3">
        {previews.map((post) => (
          <a
            key={post.slug}
            href={postPath("explore", post.slug)}
            className="group relative block overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 p-4 transition-all hover:-translate-y-0.5 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm"
          >
            {/* Meta row */}
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-medium text-gray-500 dark:text-gray-400">
              <span className="uppercase tracking-widest">{post.kicker}</span>
              <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-700" />
              <span>{readingTime(post)}</span>
            </div>

            {/* Title */}
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <span className="text-sm font-semibold leading-snug text-black dark:text-white">
                {post.title}
              </span>
              <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-black dark:group-hover:text-white" />
            </div>

            {/* Preview with faded bottom */}
            <div className="relative max-h-12 overflow-hidden text-xs leading-relaxed text-gray-600 dark:text-gray-400">
              <Inline text={previewText(post)} />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-white to-transparent dark:from-black" />
            </div>
          </a>
        ))}
      </div>

      <a
        href={data.viewAllHref ?? "/explore"}
        className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-black dark:text-white underline underline-offset-4 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        {data.viewAllLabel ?? "View more"} <ArrowRight className="h-3 w-3" />
      </a>
    </SectionShell>
  );
}
