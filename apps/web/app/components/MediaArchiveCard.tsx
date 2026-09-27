import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { OptimizedImage as Image } from "./OptimizedImage";

/** Shared image-and-text rows for the blog and project archives. */
export function MediaArchiveCard({
  href,
  image,
  imageAlt = "",
  title,
  description,
  meta,
  action,
}: {
  href: string;
  image: string;
  imageAlt?: string;
  title: string;
  description: string;
  meta: ReactNode;
  action: string;
}) {
  const external = href.startsWith("https://");
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="group flex flex-col sm:h-44 sm:flex-row overflow-hidden rounded-xl border border-gray-200 transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:hover:border-gray-600"
    >
      <div className="relative aspect-video w-full sm:w-64 shrink-0 overflow-hidden">
        <Image
          src={image}
          alt={imageAlt}
          fill
          sizes="(max-width: 640px) 100vw, 256px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-1.5 p-4 sm:p-5">
        {meta}
        <span className="line-clamp-2 text-sm font-semibold leading-snug text-black dark:text-white">
          {title}
        </span>
        <span className="line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          {description}
        </span>
        <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-gray-500 transition-colors group-hover:text-black dark:text-gray-400 dark:group-hover:text-white">
          {action}
          <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </a>
  );
}
