import { ArrowUpRight } from "lucide-react";
import { getSortedPosts } from "../../data/posts";
import { OWNER_IMAGE, OWNER_NAME } from "../../data/siteMeta";
import { OptimizedImage as Image } from "../OptimizedImage";
import { SectionShell } from "../SectionShell";

export interface BlogsData {
  /** How many recent posts to show, up to 5. Unfilled slots show Coming soon. */
  count?: number;
  /** Label for the trailing tile. Defaults to "View Blogs". */
  viewAllLabel?: string;
  /** Where the trailing tile points. Defaults to /blogs. */
  viewAllHref?: string;
}

export function BlogsSection({ title, data }: { title: string; data: BlogsData }) {
  const posts = getSortedPosts().slice(0, Math.min(data.count ?? 5, 5));
  const slots = Array.from({ length: 5 }, (_, index) => posts[index]);

  return (
    <SectionShell title={title}>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
        <div className="grid auto-rows-fr grid-cols-2 sm:grid-cols-3 gap-2">
          {slots.map((post, index) =>
            post ? (
              <a
                key={post.slug}
                href={`/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-zinc-900"
              >
                <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-zinc-800">
                  <Image
                    src={post.coverImage ?? "/blog-cover-placeholder.svg"}
                    alt={post.coverAlt ?? ""}
                    fill
                    sizes="(max-width: 640px) 50vw, 210px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="flex-1 px-2.5 pb-2.5 pt-1">
                  <span className="line-clamp-2 text-xs font-medium leading-snug text-gray-700 group-hover:text-black dark:text-gray-300 dark:group-hover:text-white">
                    {post.title}
                  </span>
                </div>
              </a>
            ) : (
              <div
                key={`coming-soon-${index}`}
                className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-zinc-900"
              >
                <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-zinc-800">
                  <Image
                    src="/blog-cover-placeholder.svg"
                    alt=""
                    fill
                    sizes="(max-width: 640px) 50vw, 210px"
                    className="object-cover"
                  />
                </div>
                <span className="flex-1 px-2.5 pb-2.5 pt-1 text-xs font-medium leading-snug text-gray-500 dark:text-gray-400">
                  Coming soon
                </span>
              </div>
            ),
          )}

          {/* Trailing tile — links to the full archive */}
          <a
            href={data.viewAllHref ?? "/blogs"}
            className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 text-center transition-colors hover:border-gray-300 hover:bg-white dark:border-gray-700 dark:bg-zinc-900 dark:hover:border-gray-600 dark:hover:bg-zinc-800"
          >
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-1 ring-gray-200 transition-transform group-hover:scale-105 dark:ring-gray-700">
              <Image
                src={OWNER_IMAGE}
                alt={OWNER_NAME}
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 group-hover:text-black dark:text-gray-300 dark:group-hover:text-white">
              {data.viewAllLabel ?? "View Blogs"}
              <ArrowUpRight className="h-3.5 w-3.5 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-gray-400" />
            </span>
          </a>
        </div>
      </div>
    </SectionShell>
  );
}
