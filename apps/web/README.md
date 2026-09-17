# `@katbose/web`

The [katbose.dev](https://katbose.dev) portfolio site. Next.js App Router, React,
TypeScript, Tailwind CSS v4.

This is the engineering reference. For the project overview see the
[root README](../../README.md); for the schema written for coding agents see
[`CLAUDE.md`](../../CLAUDE.md).

## Contents

- [The core idea](#the-core-idea)
- [Layout](#layout)
- [Content model](#content-model)
- [Section types](#section-types)
- [Posts and rich text](#posts-and-rich-text)
- [Routing and the dual view](#routing-and-the-dual-view)
- [The docs boundary](#the-docs-boundary)
- [Styling](#styling)
- [Scripts](#scripts)
- [Testing](#testing)
- [Adding a section type](#adding-a-section-type)
- [Gotchas](#gotchas)

## The core idea

The page is a function of one JSON file. `app/data/portfolio.json` holds an
ordered `sections` array; `app/page.tsx` walks it and dispatches each entry to a
component by its `type`. Reordering the array reorders the page. Deleting an
entry removes the section. No component edits.

The same JSON also generates a Markdown rendering of every page, so the version
a person reads and the version an agent scrapes are produced from one source and
cannot drift.

## Layout

```
apps/web/
├── app/
│   ├── page.tsx              # homepage: reads sections[], dispatches by type
│   ├── layout.tsx            # fonts, metadata, providers
│   ├── providers.tsx         # next-themes wrapper
│   ├── globals.css           # Tailwind v4 entry, @theme, custom animations
│   ├── robots.ts             # generated robots.txt
│   ├── sitemap.ts            # generated sitemap.xml
│   ├── thoughts/page.tsx     # essay index
│   ├── [slug]/
│   │   ├── page.tsx          # a single essay, HTML
│   │   └── markdown/         # the same essay, text/markdown
│   ├── components/
│   │   ├── sections/         # one component per section type
│   │   └── *.tsx             # shared primitives
│   └── data/
│       ├── portfolio.json    # ← all content
│       ├── posts.ts          # typed access to posts[]
│       ├── postHelpers.ts    # slug lookup, previews, dates
│       ├── siteMeta.ts       # metadata derived from meta{}
│       └── generateMarkdown.ts  # JSON → Markdown
├── e2e/                      # Playwright
├── proxy.ts                  # ?format=markdown content negotiation
├── next.config.ts            # remote image hosts
└── playwright.config.ts
```

## Content model

`portfolio.json` has four top-level keys:

| Key | Shape | Purpose |
|---|---|---|
| `meta` | object | `siteUrl`, `email`, `calendarUrl`. Feeds `siteMeta.ts`. |
| `socials` | array | `label`, `href`, `icon`. Rendered in the hero and contact section. |
| `posts` | array | Long-form essays. Each has a `slug` and a `blocks` array. |
| `sections` | ordered array | The page itself. Order here is order on screen. |

Every section entry looks like:

```jsonc
{
  "type": "experience",   // selects the component
  "title": "Experience",  // rendered heading; "" to omit
  "data": { }             // shape depends on type
}
```

`data` is only ever read by the one component that handles that `type`, so the
shapes are independent of each other.

## Section types

Thirteen types are wired up, in this file order:

| # | `type` | Renders |
|---|---|---|
| 1 | `hero` | Portrait, name, phonetic, live local time, socials |
| 2 | `experience` | Featured role plus optional `previous[]` |
| 3 | `techStack` | Collapsible categories of skills, icons via simpleicons CDN |
| 4 | `expandableCard` | A heading over collapsible rich text |
| 5 | `project` | A project with a stat grid and a footer link |
| 6 | `podcast` | Episode list linking out to YouTube |
| 7 | `thoughts` | The `count` most recent posts, linking to `/thoughts` |
| 8 | `youtube` | Channel card, video grid, community callout |
| 9 | `education` | Institutions with dates |
| 10 | `github` | Contribution calendar (`react-github-calendar`) |
| 11 | `publications` | Papers with authors and venues |
| 12 | `recommendations` | Testimonials with attribution |
| 13 | `contact` | Email, calendar link, socials |

Each maps to a component in `app/components/sections/`. `hero` reads
`socials` from the top level as well as its own `data`.

## Posts and rich text

Posts live in `posts[]`, not in `sections`. Each has `slug`, `kicker`, `title`,
`description`, `date` (`YYYY-MM-DD`), and `blocks[]`.

`blocks` is a small tagged-union rich-text format, deliberately narrower than
Markdown so it can render to both HTML and Markdown without ambiguity. Block
kinds include paragraphs, headings, lists, quotes, and images; inline runs carry
emphasis and links.

`generateMarkdown.ts` is the single place that turns blocks into Markdown, and
it is unit-tested (`generateMarkdown.test.ts`) precisely because it is the seam
where the two views could diverge.

`postHelpers.ts` owns slug lookup, preview extraction, and date formatting so
those rules exist once rather than in each consumer.

## Routing and the dual view

| Route | Serves |
|---|---|
| `/` | Homepage from `sections[]` |
| `/thoughts` | Essay index |
| `/<slug>` | One essay, HTML |
| `/<slug>/markdown` | The same essay, `text/markdown` |
| `/<slug>?format=markdown` | Rewritten to `/<slug>/markdown` by `proxy.ts` |
| `/robots.txt`, `/sitemap.xml` | Generated by `robots.ts` / `sitemap.ts` |

`proxy.ts` runs as middleware. It checks for `?format=markdown`, and rewrites
**only** when the slug is a real post — every other request passes through
untouched. Its matcher skips `_next/`, `api/`, and anything with a file
extension.

A rewrite is used rather than a redirect so the URL the caller requested is the
URL they keep.

## The docs boundary

The documentation is **not** part of this app. It is the Mintlify site in
`apps/docs`, served by Mintlify on its own subdomain, `docs.katbose.dev`.

Because it is a separate origin, this app needs no configuration for it at all:
no rewrite, no redirect, no `vercel.json`, and no `/docs` route. The Menu badge
on the home page is an ordinary cross-origin link, built from `DOCS_URL` in
`app/data/siteMeta.ts`.

`DOCS_URL` reads `meta.docsUrl` from `portfolio.json`, except in development,
where it points at the local `mint dev` server on `:7003` so you are not sent to
the deployed docs while editing them. The switch is on `NODE_ENV`, which Next
inlines at build time, so the production bundle contains only the real URL — no
`localhost` reference survives into it.

An earlier arrangement served the docs at `katbose.dev/docs`. That needed a
hosting-layer rewrite in production and a dev-only redirect here, both of which
the subdomain removes.

## Styling

DM Sans is self-hosted from `public/fonts/` with its license. `app/fonts.css`
preserves the font subsets and fallback metrics; `layout.tsx` preloads both
files. Builds do not download fonts. Update preload URLs with any font changes.


Tailwind CSS v4 via `@tailwindcss/postcss`. There is no `tailwind.config.js` —
v4 moves configuration into CSS, so `globals.css` carries `@import "tailwindcss"`,
an `@theme inline` block mapping CSS variables to Tailwind tokens, and a
`@custom-variant dark` bound to the `.dark` class that `next-themes` toggles.

Because those at-rules are v4-only, VS Code's built-in CSS validator reports
them as unknown. `.vscode/settings.json` sets `css.lint.unknownAtRules: "ignore"`;
Biome is the CSS linter here and parses them correctly.

Use canonical v4 class names. `bg-linear-to-t` rather than the deprecated
`bg-gradient-to-t` — the canonical form puts the oklab interpolation behind an
`@supports` query, so browsers without it still get a working gradient instead
of dropping the declaration entirely.

## Scripts

```bash
bun --filter @katbose/web dev         # next dev  -p 7000
bun --filter @katbose/web build       # next build --webpack (measured production bundle)
bun --filter @katbose/web start       # next start -p 7000
bun --filter @katbose/web typecheck   # tsc --noEmit
bun --filter @katbose/web test        # bun test  (unit)
bun --filter @katbose/web test:e2e    # playwright
```

## Testing

For server/client boundaries, loading behavior and bundle measurement semantics,
see [architecture](../../ARCHITECTURE.md).

**Unit** — `bun test`, colocated beside the module under test:

| File | Covers |
|---|---|
| `generateMarkdown.test.ts` | Every block kind and inline run → Markdown |
| `postHelpers.test.ts` | Slug lookup, previews, date formatting |
| `posts.test.ts` | Post shape and ordering |
| `siteMeta.test.ts` | Metadata derived from `meta{}` |
| `portfolio.schema.test.ts` | Content validation and invalid-data rejection |
| `localTime.test.ts` | Timezone formatting and Markdown timestamp insertion |
| `imageProps.test.ts` | Internal image adapter parity with Next's public API |

**End-to-end** — Playwright against a production build:

| Spec | Covers |
|---|---|
| `homepage.spec.ts` | Headings in JSON order, hero, socials, console clean |
| `essays.spec.ts` | Essay index and individual essays |
| `modes.spec.ts` | Human/agent switch, theme toggle, `?theme=`, QR dialog |
| `animations.spec.ts` | Reveals, disclosures and final counter values |
| `reduced-motion.spec.ts` | Static media and usable controls with reduced motion |
| `touch-navigation.spec.ts` | Touch controls render the desktop water shader |
| `theme-first-paint.spec.ts` | Shared theme before hydration and browser history |
| `water-theme-hydration.spec.ts` | Navbar colors before/after hydration with saved, system and shared themes |
| `clock.spec.ts` | Clock isolation, exact Markdown copy and clipboard failures |
| `server-html.spec.ts` | Content and working font preloads in the server response |
| `deferred-calendar.spec.ts` | Calendar loads only near the viewport |
| `deferred-images.spec.ts` | Illustration sources load only near the viewport |
| `visual.spec.ts` | Local desktop/mobile visual regression baselines |
| `fixtures.ts` | Shared setup |

`playwright.config.ts` sets `reuseExistingServer: false`. Its port must be free;
it defaults to 7000. Set `PLAYWRIGHT_PORT=7100` to leave another server running.

The visual script uses `--workers=1` because concurrent WebGL renders can cause
timeouts. Run Lighthouse separately from browser tests. For behavior tests on a
busy machine, pass `--workers=1` too.

## Adding a section type

1. Add the entry to `sections[]` in `portfolio.json` with a new `type` and its
   `data`.
2. Create the component in `app/components/sections/`.
3. Register its union variant and renderer in `app/components/sections/registry.tsx`
   and add its schema to `app/data/portfolio.schema.ts`.
4. Teach `generateMarkdown.ts` to render it, and add a case to
   `generateMarkdown.test.ts`. Skipping this is how the HTML and Markdown views
   start to drift.
5. If the section has a visible heading, extend the ordering assertion in
   `homepage.spec.ts`.

## Gotchas

- **Stale `.next` after deleting a route.** Typecheck reads generated route
  types and will fail on a route that no longer exists. `rm -rf .next`.
- **The chosen Playwright port must be free.** See above.
- **Shader images.** `WaterImage` uses `getImageProps` on the server so its raw
  fallback image and WebGL texture share an optimized URL. Keep those URLs
  identical; passing the original source to the shader downloads the full PNG.
- **Remote image hosts are allowlisted.** `next.config.ts` permits
  `cdn.simpleicons.org` and `img.youtube.com` only; a new host needs adding
  there or `next/image` rejects it.
- **`portfolio.json` is LF.** Writing it with a tool that emits CRLF rewrites
  every line; Biome will fail the whole file.
