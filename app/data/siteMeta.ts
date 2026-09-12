import type { PortfolioData } from "../components/sections/registry";
import portfolioJson from "./portfolio.json";

/**
 * Site-level identity, derived from `portfolio.json`.
 *
 * Route metadata (`layout.tsx`, `sitemap.ts`, `robots.ts`) used to hardcode the
 * owner's name and URL, which meant the page title could silently disagree with
 * the content file. Everything here reads from the JSON instead, so updating
 * `portfolio.json` remains the only edit needed.
 */
const portfolio = portfolioJson as unknown as PortfolioData;

/** Absolute site URL, trailing slash stripped so it is safe to concatenate. */
export const SITE_URL = portfolio.meta.siteUrl.replace(/\/$/, "");

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
