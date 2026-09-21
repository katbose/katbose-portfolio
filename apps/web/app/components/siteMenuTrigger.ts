/**
 * Styling for the floating Menu button.
 *
 * Shared because the button exists twice: once as the static placeholder in the
 * initial bundle, and once as Base UI's real `Trigger` after the menu chunk
 * loads. They must be pixel-identical or the swap would be visible.
 *
 * A plain module rather than a client component, so importing the class string
 * does not pull the menu implementation into a route's bundle.
 */
export const SITE_MENU_TRIGGER_CLASS =
  "inline-flex h-9 items-center gap-1.5 rounded-full border border-gray-200 bg-white/70 px-2.5 text-xs font-medium text-gray-500 shadow-sm backdrop-blur-md transition-colors hover:text-black dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-gray-400 dark:hover:text-white sm:px-3";

/** Accessible name, shared for the same reason. */
export const SITE_MENU_TRIGGER_LABEL = "Site menu";
