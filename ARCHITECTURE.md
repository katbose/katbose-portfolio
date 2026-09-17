# Portfolio architecture

## Runtime and content

The web workspace uses Next.js 16.3.5, React 19.3.0, TypeScript 7.0.2 and Bun
1.4.2. Direct dependencies are pinned to exact versions. Native browser animations
replace Motion; docs tooling
uses a reviewed Puppeteer override to remove the vulnerable ZIP extractor.

`apps/web/app/data/portfolio.json` remains the content source. Prebuild validates
it with Zod, and schema conformance is checked by TypeScript. The schema does
not run in the browser.

## Server and client responsibilities

`app/page.tsx` renders the featured link, navigation links and section registry
on the server. It passes rendered elements as `children`/`navigationLinks` to
`PortfolioShell.client.tsx`, plus configuration values and generated Markdown.
A client wrapper does not turn server-produced children into client modules.

Static prose, essay previews, rich text and education are server-rendered.
Education uses `StaticExperienceItem`, with no unused disclosure state.
Interactive islands own their local state:

- `PortfolioShell`: human/agent mode, copy feedback, QR visibility and navbar.
- `LiveClock`: the only one-second timer; its initial value is deterministic
  for hydration, then it uses the configured timezone.
- `Collapsible` and `ExpandableExperienceItem`: disclosure state.
- `TechStackSection`: marquee/category view; `CountUp`: animated statistics.
- `ThemeToggle` and the theme provider: theme and URL synchronization.
- `GithubGraph`: loads the calendar module and data near the viewport.
- `WaterEffects.client`: navbar shader and deferred illustration shaders.

Do not import `portfolio`, `posts`, `siteMeta`, or `generateMarkdown` into a
client island. Derive values on the server and pass what the island needs.

## Markdown

`generateMarkdown(data)` returns deterministic text without a timestamp.
Supplying a time retains the existing timestamp format; an optional third
argument `{ includeTimestamp: false }` explicitly omits it. The homepage
generates a template with one time slot. Opening agent mode fills that slot
with a local-time snapshot. Display and clipboard use the same string. Clock
ticks never regenerate the portfolio or Markdown. Clipboard failure keeps
the text available for manual copying.

## Loading and media

Page transitions, scroll reveals and counters use browser-native animation APIs.
The initial hero is visible without waiting for JavaScript. Reduced-motion
preferences disable shaders, marquee animation and the theme view transition. Mobile and desktop navbars use the same WebGL
water shader and animated edge shine. A static named shader export keeps
unused shaders out of the deferred bundle.
QR code generation loads when opened. GitHub's calendar and illustration
images/shaders load when their sections approach the viewport. React lazy
boundaries keep these modules, the theme animation and Analytics out of the
initial document's script references. Analytics remains Vercel-only. Skill icons
and their marquee animation also wait until their section approaches the viewport.

Off-screen sections use CSS content visibility until first visited, then remain
rendered. Reveal observers batch geometry reads to avoid repeated synchronous
layout during hydration. Initial marquee markup does not animate on mount.

Links use native document navigation, including essays and the archive. This
removes automatic route prefetching and client link code; navigation reloads the
document. Shared theme links apply before paint, and same-document browser
history updates the theme through a popstate listener.

`OptimizedImage` renders responsive image markup on the server. `WaterImage`
shares its optimized URL between the image and shader, with a noscript fallback.
Original assets remain in `public/`; Next.js resizes and compresses them.
`imageProps.server.ts` isolates imports from Next's internal image helpers,
because its public barrel retains unused client Image code in this version.
Five parity tests compare the adapter with the public API. Review this adapter
when upgrading Next; it follows next.config.ts image settings.

DM Sans is vendored in `public/fonts/` with its SIL Open Font License. The same
Latin and Latin Extended subsets, Unicode ranges and fallback metrics are retained.
The root layout explicitly preloads both fonts through React; a server-response
test verifies those hints and the WOFF2 assets. This fixes missing preloads in the
Windows Webpack build and removes the build-time Google Fonts dependency. Swap
display preserves the intended font after loading; optional display was rejected
after an inconsistent mobile capture.

Production builds explicitly use Next's supported Webpack backend, which
produces the smaller measured bundle. Development continues to use Turbopack.

## Verification and budgets

From the repository root:

```sh
bun run ci:biome
bun --filter @katbose/web typecheck
bun --filter @katbose/web test
bun --filter @katbose/web build
bun --filter @katbose/web bundle:report --check
bun --filter @katbose/web test:e2e
bun --filter @katbose/web test:visual
```

Playwright owns its production server on port 7000 by default. Set
`PLAYWRIGHT_PORT=7100` to use a different free port. Visual tests use one worker
to avoid competing WebGL renders. Run Lighthouse separately from browser tests.
Visual baselines are local and ignored by Git. Compare against
pre-change baselines without regenerating them to hide regressions. Clock and
shader regions are masked, including the shader image before its canvas mounts.
The expanded-stack baselines were reviewed and replaced on September 16 because
the earlier captures contained blank, unrevealed sections. Full-page captures
now verify section opacity and final counters after overlapping scroll steps.

CI enforces the bundle report after building: 580 KB for `/` and 650 KB for the
other tracked routes. The report sums raw JavaScript referenced in generated
HTML, including conservative preload/legacy references; it is not compressed
transfer size and excludes later dynamic downloads and RSC/HTML payloads.
Missing referenced chunks fail rather than count as zero bytes.

The current raw-JavaScript measurements are 578.7 KB for `/`, 556.2 KB for
`/thoughts`, and 558.0 KB for `/[slug]`. These values describe a local production
build; they do not establish production Core Web Vitals.
