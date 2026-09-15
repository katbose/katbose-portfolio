/**
 * Site-level identity, derived from `portfolio.json`.
 *
 * Route metadata (`layout.tsx`, `sitemap.ts`, `robots.ts`) used to hardcode the
 * owner's name and URL, which meant the page title could silently disagree with
 * the content file. Everything here reads from the content instead, so updating
 * `portfolio.json` remains the only edit needed.
 */

import { portfolio } from "./portfolio";

/** Absolute site URL, trailing slash stripped so it is safe to concatenate. */
export const SITE_URL = portfolio.meta.siteUrl.replace(/\/$/, "");

/**
 * Where the documentation lives.
 *
 * The docs are a Mintlify site on their own subdomain, so this is a cross-origin
 * link rather than a route in this app. Nothing needs to proxy or rewrite
 * `/docs`, and there is deliberately no `/docs` route here.
 *
 * In development that subdomain would send you to the deployed docs, which is
 * rarely what you want while editing them, so point at the local `mint dev`
 * server instead. Its port must match the `--port` in `apps/docs/package.json`.
 * `NODE_ENV` is inlined at build time, so the production bundle contains only
 * the real URL.
 */
export const DOCS_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:7003"
    : portfolio.meta.docsUrl.replace(/\/$/, "");

const hero = portfolio.sections.find((section) => section.type === "hero");

/** The site owner's name, taken from the hero section. */
export const OWNER_NAME = hero?.data.name ?? "";

/** Strip the inline markdown (`**bold**`, `[text](url)`) that `Block` strings allow. */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*/g, "")
    .trim();
}

/**
 * Meta description: the first hero intro line as plain prose. Falls back to the
 * owner's name so the tag is never empty.
 */
export const SITE_DESCRIPTION = hero?.data.intro?.[0]
  ? stripInlineMarkdown(hero.data.intro[0])
  : OWNER_NAME;
