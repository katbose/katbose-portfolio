import { test as base, type ConsoleMessage, type Page } from "@playwright/test";
import { portfolio } from "../app/data/portfolio";
import { sortPosts } from "../app/data/posts";

/**
 * All specs import `test` from here rather than from @playwright/test, so every
 * page gets the third-party request blocker below.
 *
 * The homepage references ~104 icon URLs on cdn.simpleicons.org plus a GitHub
 * contributions API call and several remote company logos — every one of them
 * supplied by `portfolio.json`. Playwright's default `waitUntil: "load"` waits
 * for all of that, so `page.goto("/")` was timing out whenever the network was
 * slow or rate-limited, even though the server itself responds in ~66ms.
 *
 * Blocking non-local requests makes the suite hermetic and fast: it tests this
 * application, not third-party CDNs. Aborted requests surface as `net::ERR_*`,
 * which `isIgnorable` already filters out of the console-error assertions.
 */
export const test = base.extend({
  page: async ({ page, baseURL }, use) => {
    const origin = new URL(baseURL ?? "http://127.0.0.1:7000").origin;
    await page.route("**/*", (route) => {
      const url = route.request().url();
      const isLocal = url.startsWith(origin) || url.startsWith("data:") || url.startsWith("blob:");
      return isLocal ? route.continue() : route.abort();
    });
    await use(page);
  },
});

export { expect } from "@playwright/test";

/**
 * Expectations for the browser suite are read out of `portfolio.json` at
 * runtime. Content is the user's to rewrite, so no title, name, or slug is ever
 * hardcoded here — these tests assert *behaviour*, not biography.
 */

export { portfolio };

export const hero = portfolio.sections.find((s) => s.type === "hero");

/** Section headings in file order — the order the page must render them in. */
export const sectionTitles: string[] = portfolio.sections
  .filter((s) => s.type !== "hero")
  .map((s) => s.title);

/** Posts newest-first, matching `getSortedPosts()`. */
export const sortedPosts = sortPosts(portfolio.posts);

/**
 * Console/page errors that are not the app's fault.
 *
 * The portfolio intentionally loads third-party images and widgets from
 * arbitrary hosts named in `portfolio.json` (icon CDN, GitHub calendar, remote
 * company logos). Those can fail in a sandboxed CI network, and that is not a
 * regression in this codebase.
 */
// Ignore transport diagnostics, never arbitrary messages naming a host.
const IGNORABLE = [
  /net::ERR_/i,
  /Failed to load resource/i,
  /ERR_NAME_NOT_RESOLVED/i,
  /ERR_INTERNET_DISCONNECTED/i,
  /Download the React DevTools/i,
];

export function isIgnorable(text: string): boolean {
  return IGNORABLE.some((re) => re.test(text));
}

/** Collect genuine console errors and uncaught exceptions for a page. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (!isIgnorable(text)) errors.push(`console: ${text}`);
  });
  page.on("pageerror", (err) => {
    if (!isIgnorable(err.message)) errors.push(`pageerror: ${err.message}`);
  });
  return errors;
}

/** True when the document is in dark mode. */
export async function isDark(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.classList.contains("dark"));
}

/**
 * Block until React has hydrated, so clicks actually reach handlers.
 *
 * `ThemeToggle` renders a pulse placeholder until its `mounted` effect runs,
 * then swaps in a real button labelled "Toggle theme". That swap is a genuine
 * app-level hydration signal, which beats an arbitrary timeout.
 */
export async function waitForHydration(page: Page): Promise<void> {
  await page.getByRole("button", { name: /toggle theme/i }).waitFor({ state: "visible" });
}
