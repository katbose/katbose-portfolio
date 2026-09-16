/**
 * The one place `portfolio.json` becomes typed data.
 *
 * WHAT CHANGED AND WHY
 * --------------------
 * Four modules used to reach for the JSON independently, each with its own
 * `as unknown as` cast: this page, `siteMeta.ts`, `posts.ts`, and the Playwright
 * fixtures. Two of them also hand-wrote their own idea of the file's shape, so
 * the four could disagree with each other and with reality, and nothing would
 * notice.
 *
 * Now there is a single entry point, and the cast below is the only one left.
 *
 * WHY A CAST IS STILL NEEDED
 * --------------------------
 * `resolveJsonModule` infers a *structural literal* type for the JSON: every
 * discriminant comes back as `string`, never `"hero"` or `"podcast"`. That is
 * not assignable to a discriminated union, so some assertion is unavoidable
 * without parsing at runtime.
 *
 * What makes this one safe rather than a blind spot is that two independent
 * mechanisms stand behind it:
 *
 *   1. `portfolio.schema.ts` proves at *compile time* that the schema's output
 *      is assignable to `PortfolioData` — so the shape asserted here is the
 *      shape the components actually accept.
 *   2. `bun run validate:content` proves at *build time* that the real file
 *      satisfies that schema, and runs before `next build`. Invalid content
 *      fails the build instead of rendering a blank region in the browser.
 *
 * So the assertion is not "trust me" — it is "this was checked, twice, by
 * things that fail loudly." If you remove either mechanism, this cast becomes
 * exactly as unsafe as the four it replaced.
 *
 * ON DELIBERATELY NOT PARSING HERE
 * --------------------------------
 * Validating in this module would mean importing `zod` into the application
 * graph. This module is consumed by Server Components and build/test tooling;
 * client islands receive only the props they need. Content is a committed local
 * file and `/` is fully prerendered, so a build-time gate proves everything a
 * per-render parse would, for free. If content ever comes from a source this
 * program does not control, parse it at *that* boundary.
 */

import type { PortfolioData } from "../components/sections/registry";
import portfolioJson from "./portfolio.json";

/**
 * The validated content of `portfolio.json`.
 *
 * Import this rather than the JSON. Nothing else should reach for the raw file.
 */
export const portfolio = portfolioJson as unknown as PortfolioData;
