import { ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";

/**
 * Breadcrumb, ported from shadcn/ui's Base UI component.
 *
 * The DOM contract is shadcn's, unchanged: `nav[aria-label="breadcrumb"]` wraps
 * an `ol` of `li`s, the current page is a `span` with
 * `role="link" aria-disabled="true" aria-current="page"`, separators are
 * `role="presentation" aria-hidden="true"`, and every part keeps its
 * `data-slot` attribute. Assistive tech and any `[data-slot]` styling therefore
 * see exactly what upstream produces.
 *
 * Two upstream details are deliberately dropped, because this project has
 * neither the dependencies nor the aliases they need:
 *
 *   - `BreadcrumbLink`'s `render` prop, which upstream implements with
 *     `useRender`/`mergeProps` from `@base-ui/react`. Here it is a plain
 *     anchor, so `<BreadcrumbLink href="/">` replaces
 *     `<BreadcrumbLink render={<a href="/" />}>`.
 *   - The `cn()` helper (clsx + tailwind-merge) and the `cn-breadcrumb*`
 *     classes from shadcn's CSS layer. Classes are written inline in the
 *     project's own Tailwind idiom instead.
 *
 * This mirrors how `ui/animated-theme-toggler.tsx` was already adapted.
 * `BreadcrumbEllipsis` is omitted as nothing collapses a trail yet.
 */
export function Breadcrumb({ className = "", ...props }: ComponentProps<"nav">) {
  return <nav aria-label="breadcrumb" data-slot="breadcrumb" className={className} {...props} />;
}

export function BreadcrumbList({ className = "", ...props }: ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={`flex flex-wrap items-center gap-1.5 break-words text-sm text-gray-500 dark:text-gray-400 ${className}`}
      {...props}
    />
  );
}

export function BreadcrumbItem({ className = "", ...props }: ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={`inline-flex items-center ${className}`}
      {...props}
    />
  );
}

export function BreadcrumbLink({ className = "", ...props }: ComponentProps<"a">) {
  return (
    <a
      data-slot="breadcrumb-link"
      className={`transition-colors hover:text-black dark:hover:text-white ${className}`}
      {...props}
    />
  );
}

/**
 * The trail's last entry: present, but not a link.
 *
 * Upstream also sets `role="link" aria-disabled="true"` here. Both are dropped:
 * a `role="link"` element that cannot receive focus is an accessibility defect
 * — this project's Biome a11y rules reject it (`useFocusableInteractive`,
 * `useSemanticElements`) — and `aria-disabled` carries no meaning once the role
 * is gone. `aria-current="page"` is the part that actually tells assistive tech
 * this is the current location, and it stays.
 */
export function BreadcrumbPage({ className = "", ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      aria-current="page"
      className={`font-medium text-black dark:text-white ${className}`}
      {...props}
    />
  );
}

/** Defaults to a chevron; pass children to override. */
export function BreadcrumbSeparator({ children, className = "", ...props }: ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={`[&>svg]:size-3.5 ${className}`}
      {...props}
    >
      {children ?? <ChevronRight />}
    </li>
  );
}
