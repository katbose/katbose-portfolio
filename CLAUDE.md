# katbose.dev — Agent Guide

A Bun + Turborepo monorepo. The portfolio is a data-driven Next.js app whose
content lives in one JSON file: components are fixed, data is not.

## The one rule

**Edit content in `apps/web/app/data/portfolio.json`. Do not hardcode content inside components.**

## Repository map

```
apps/
  web/     Next.js portfolio — katbose.dev            port 7000
  cms/     reserved, framework undecided              port 7001
  dash/    reserved, framework undecided              port 7002
  docs/    Mintlify docs — katbose.dev/docs           port 7003
packages/
  typescript-config/   shared base.json + nextjs.json
```

Things that are easy to get wrong here:

- **`/docs` is not a route in `apps/web`.** It is a separate Mintlify site. In
  production it is mapped onto the domain at the hosting layer; in development
  `apps/web/next.config.ts` redirects it to `:7003`. Do not add
  `apps/web/app/docs/`.
- **`apps/cms` and `apps/dash` are deliberately empty** — a `package.json` and a
  `README.md`, nothing else. They declare no scripts, so `turbo run` skips them.
  Do not scaffold code there speculatively.
- **Only the root `package.json` has a `version`.** One version covers the whole
  repository. Never add a `version` field to a workspace.
- **The root `overrides` block exists for `apps/docs`, not the web app.** The
  Mintlify CLI pins `react` and `sharp` to versions that collide with Next's, and
  the block collapses each to a single copy. Removing the `react` or `sharp` rule
  breaks `mint dev`; the `qs`, `adm-zip` and `js-yaml` rules are security bumps
  that `bun audit` would otherwise flag. `apps/docs/README.md` explains each one.
- **`turbo.jsonc`, `apps/docs/docs.json`, and `release-please-config.json` carry
  no `$schema` key.** All three formats publish one and would accept it; it is
  absent only because the tooling used to author these files refuses to write
  remote schema URLs. Adding it locally is a genuine improvement for editor
  autocomplete. Nothing is unguarded meanwhile: `mint validate` checks
  `docs.json`, and CI parses the rest.

## How the system works

```
apps/web/app/data/portfolio.json
  -> SectionRenderer (apps/web/app/components/sections/registry.tsx)
    -> one component per section type
      -> rendered on the page
```

The page (`apps/web/app/page.tsx`) loops over the `sections` array and renders each one. The agent-mode Markdown view is generated from the same JSON by `apps/web/app/data/generateMarkdown.ts`.

## The JSON structure

```
portfolio.json
  meta        -> siteUrl, calendarUrl, email, featured? (optional pill)
  socials[]   -> label, href, icon (used in navbar + contact section)
  posts[]     -> blog posts / essays (see "Blog posts / essays" below)
  sections[]  -> ordered list of sections (order = render order on page)
```

Each section:
```json
{
  "type": "sectionType",
  "title": "Section Heading",
  "data": { ... }
}
```

The `hero` section has no `title` field. Everything else does.

`meta.featured` is optional. When present it renders a small pill above the hero
and one line in the agent-mode Markdown; when absent both are omitted. All three
fields are required if you include it:

```json
"featured": { "tag": "Latest", "title": "A Post Title", "href": "/a-post" }
```

A relative `href` is resolved against `meta.siteUrl` in the Markdown output.

## Section types and their data shapes

Read the exported `*Data` type at the top of each component file for the exact schema. Here is a quick reference:

### `hero`
File: `apps/web/app/components/sections/Hero.tsx`
```json
{
  "type": "hero",
  "data": {
    "image": "/me.png",
    "name": "Your Name",
    "phonetic": "/fəˈnetɪk/",
    "noun": "noun",
    "timezone": { "label": "IST", "tz": "Asia/Kolkata" },
    "intro": ["paragraph one", "paragraph two"]
  }
}
```

### `experience`
File: `apps/web/app/components/sections/ExperienceSection.tsx`
```json
{
  "type": "experience",
  "title": "Experience",
  "data": {
    "featured": {
      "name": "Company Name",
      "link": "https://...",
      "role": "Role, Location",
      "dateRange": "Month Year - Present",
      "collapsedHeight": "max-h-48",
      "body": [ ...blocks ]
    },
    "previousLabel": "Previously",
    "previous": [
      {
        "name": "Company Name",
        "role": "Role, Location",
        "link": "https://...",
        "body": [ ...blocks ]
      }
    ]
  }
}
```

### `techStack`
File: `apps/web/app/components/sections/TechStackSection.tsx`
```json
{
  "type": "techStack",
  "title": "Section title",
  "data": {
    "categories": [
      {
        "name": "Languages",
        "skills": [
          { "name": "Go", "slug": "go" }
        ]
      }
    ]
  }
}
```
The `slug` must match a valid icon on [simpleicons.org](https://simpleicons.org). Check the site if unsure.

### `expandableCard`
File: `apps/web/app/components/sections/ExpandableCardSection.tsx`
```json
{
  "type": "expandableCard",
  "title": "Section title",
  "data": {
    "heading": "Card heading",
    "collapsedHeight": "max-h-48",
    "body": [ ...blocks ]
  }
}
```

### `project`
File: `apps/web/app/components/sections/ProjectSection.tsx`
```json
{
  "type": "project",
  "title": "Section title",
  "data": {
    "name": "Project Name",
    "link": "https://...",
    "subtitle": "short tagline",
    "body": [ ...blocks ],
    "stats": [
      { "value": "201", "label": "sign-ups in 3 days" }
    ],
    "footerLink": { "label": "Read more", "url": "https://..." }
  }
}
```
`stats`, `link`, `subtitle`, and `footerLink` are all optional.

### `youtube`
File: `apps/web/app/components/sections/YouTubeSection.tsx`
```json
{
  "type": "youtube",
  "title": "My YouTube Channel",
  "data": {
    "image": "/youtube-profile.png",
    "name": "Channel Name",
    "url": "https://youtube.com/@handle",
    "tagline": "short description",
    "community": {
      "url": "https://discord.gg/...",
      "count": "300+ members",
      "text": "in the Discord"
    },
    "videos": [
      { "title": "Video title", "url": "https://youtube.com/watch?v=..." }
    ],
    "footerLink": { "label": "See all videos", "url": "https://..." }
  }
}
```

### `podcast`
File: `apps/web/app/components/sections/PodcastSection.tsx`
```json
{
  "type": "podcast",
  "title": "Podcast Appearances",
  "data": {
    "episodes": [
      {
        "title": "Episode title",
        "url": "https://youtube.com/watch?v=...",
        "description": "optional one-liner"
      }
    ]
  }
}
```
Thumbnails are derived from the YouTube ID in `url`, so no image field is
needed. `description` is optional. A non-YouTube `url` renders without a
thumbnail rather than breaking.

### `thoughts`
File: `apps/web/app/components/sections/ThoughtsSection.tsx`
```json
{
  "type": "thoughts",
  "title": "Thinking",
  "data": {
    "count": 3,
    "viewAllLabel": "View more",
    "viewAllHref": "/thoughts"
  }
}
```
Every field is optional (`count` defaults to 3, `viewAllHref` to `/thoughts`).
This section holds **no content of its own** — it reads the newest entries from
the top-level `posts` array. Add a post by appending to `posts`, not here.

### `education`
File: `apps/web/app/components/sections/EducationSection.tsx`
```json
{
  "type": "education",
  "title": "Education",
  "data": {
    "items": [
      {
        "title": "Institution Name",
        "role": "Degree / Field",
        "link": "https://...",
        "body": [ ...blocks ]
      }
    ]
  }
}
```

### `github`
File: `apps/web/app/components/sections/GithubSection.tsx`
```json
{
  "type": "github",
  "title": "GitHub Contributions",
  "data": { "username": "YourGitHubUsername" }
}
```

### `publications`
File: `apps/web/app/components/sections/PublicationsSection.tsx`
```json
{
  "type": "publications",
  "title": "Research Publications",
  "data": {
    "items": [
      {
        "title": "Paper title",
        "link": "https://doi.org/...",
        "venue": "Conference or journal name",
        "authors": "Name A; Name B",
        "abstract": "Full abstract text here.",
        "collapsedHeight": "max-h-32",
        "linkLabel": "View Publication"
      }
    ]
  }
}
```

### `recommendations`
File: `apps/web/app/components/sections/RecommendationsSection.tsx`
```json
{
  "type": "recommendations",
  "title": "Recommendations",
  "data": {
    "items": [
      {
        "name": "Person Name",
        "link": "https://linkedin.com/in/...",
        "role": "Their title / context",
        "quote": ["paragraph one", "paragraph two"]
      }
    ]
  }
}
```

### `contact`
File: `apps/web/app/components/sections/ContactSection.tsx`
```json
{
  "type": "contact",
  "title": "Get in Touch",
  "data": {
    "heading": "Let's build something together",
    "subheading": "short line under the heading",
    "ctas": [
      { "label": "Schedule a meeting", "href": "https://cal.com/...", "icon": "calendar", "primary": true },
      { "label": "Email me", "href": "mailto:you@example.com", "icon": "mail", "primary": false }
    ],
    "socialsLabel": "Find me on"
  }
}
```

## The `Block` type (rich text)

Anywhere you see `body` or `intro`, the value is an array of blocks. A block is either:

**A paragraph (string):**
```json
"This sentence has **bold** and a [link](https://example.com)."
```

**A bullet list:**
```json
{ "list": ["First item", "Second item with **bold**"] }
```

Inline formatting supported inside any string: `**bold**` and `[text](url)`.

## The `socials` array

Used in two places: the bottom navbar and the contact section. Update it once and both update.

Valid icon names (the `icon` field): `github`, `linkedin`, `x`, `youtube`,
`instagram`, `discord`, `medium`, `calendar`, `mail`.

These map to real icon components in `apps/web/app/components/icons.tsx`. Add
new icons there if needed. An unknown name renders nothing rather than throwing,
so a typo fails silently — check the name against `ICONS` in that file.

Brand marks come from `react-icons/fa6`, not Lucide: Lucide removed every
brand/logo icon in v1 for trademark reasons, so `lucide-react` has no `Github`
or `Linkedin` export to import. Only generic glyphs (`Calendar`, `Mail`) come
from Lucide.

## Rearranging sections

Move blocks up or down inside the `sections` array. The page renders them in the same order.

## Removing a section

Delete its block from the `sections` array.

## Adding a new section type

Only needed if none of the existing types fit:

1. Create `apps/web/app/components/sections/YourSection.tsx`. Export the component and its `YourData` interface.
2. Add the variant to the `Section` union in `apps/web/app/components/sections/registry.tsx`.
3. Add a `case` for it in `SectionRenderer` in the same file.
4. Add the block (with your new `type`) to `portfolio.json`.

TypeScript will error at the `SectionRenderer` switch if you forget step 3.

## Blog posts / essays

Posts are fully templated. **To add a post, append one object to the `posts` array in `apps/web/app/data/portfolio.json` — nothing else.** No new route, component, proxy, or sitemap edits are needed. (`apps/web/app/data/posts.ts` only holds the `Post` types and lookup helpers — it reads its data from the JSON.)

Each post:
```json
{
  "slug": "my-post",
  "kicker": "Essay",
  "title": "My Post Title",
  "description": "One-line meta description for SEO / previews.",
  "date": "2026-07-03",
  "blocks": [ ...post blocks ]
}
```
`slug` becomes the URL (`/my-post`, lowercase-kebab-case); `kicker` is the small uppercase label above the title; `date` is YYYY-MM-DD, used for ordering and the sitemap.

A post block is one of:
```json
{ "type": "p",    "text": "A paragraph with **bold** and [links](https://...)." }
{ "type": "h2",   "text": "A section heading" }
{ "type": "list", "items": ["First bullet", "Second **bold** bullet"] }
```

Everything else is derived automatically from that data:
- the rendered page at `/<slug>` (`apps/web/app/[slug]/page.tsx`)
- the raw-markdown version at `/<slug>?format=markdown` (for AI agents / sharing)
- reading time and the "Ask ChatGPT about this" deep-link (`apps/web/app/data/postHelpers.ts`)
- the sitemap entry

To feature a post with the pill above the hero, point `meta.featured.href` in `portfolio.json` at `/<slug>`.

Do not hardcode post content in `apps/web/app/[slug]/page.tsx` — that file is the fixed template; the `posts` array in `portfolio.json` is the content.

## Images

Put image files in `apps/web/public/`. Reference them in the JSON as `/filename.png` (root-relative path).

## Verifying changes

Run from the repository root. Each of these fans out across the workspaces that
declare the task.

```bash
bun run build       # production builds
bun run typecheck   # tsc --noEmit
bun run test        # Bun unit tests
bun run test:e2e    # Playwright (builds first)
bun run validate    # docs.json + page resolution (apps/docs)
bun run check       # Biome lint + format + import sorting, applies safe fixes
```

`bun run build` is the fastest way to catch a bad edit: a type mismatch or a
missing required field fails there. Fix it before assuming the change worked.

Biome is deliberately **not** a Turborepo task. It already scans the whole
repository in one fast pass, including root-level files that no per-workspace
run would see, so the root scripts call it directly.

Editing `apps/docs` needs its own gates:

```bash
bun --filter @katbose/docs validate       # docs.json + page resolution
bun --filter @katbose/docs broken-links   # internal links, incl. anchors
bun --filter @katbose/docs a11y           # contrast + media alt text
bun --filter @katbose/docs format         # rewrites MDX in place
```

Docs pages must be `.mdx`. A `.md` file is served but is never resolved as a
navigation page, and `mint validate` reports it as missing.

### Two gotchas that look like bugs

- **Stale `.next` breaks typecheck.** `apps/web/tsconfig.json` includes
  `.next/types/**/*.ts`, which Next generates. Delete a route and `tsc` keeps
  failing on the generated validator until you remove `apps/web/.next` and
  rebuild. (There is no tsconfig at the repo root; compiler settings come from
  `packages/typescript-config`.)
- **`next build` and `next start` share `apps/web/.next/lock`.** Running both at
  once fails with "Unable to acquire lock". Playwright also needs port 7000
  free, because it deliberately refuses to reuse a server it did not start.

### Commits and releases

Commit messages follow Conventional Commits and are enforced by commitlint on
the `commit-msg` hook. This is not cosmetic: release automation derives the next
version for the **whole repository** from these messages.

```
fix:     -> patch      feat:    -> minor
feat!: or a BREAKING CHANGE: footer -> minor while below 1.0.0, major after
chore: docs: refactor: test: ci:  -> no release
```

Tags are exactly `vX.Y.Z`, with no prefix, suffix, or per-app component. The
canonical changelog is `apps/docs/changelog.mdx`, written by release automation.
Its trailing `## 0.0.0` heading is load-bearing — see `apps/docs/README.md`
before touching that file.

Git hooks are managed by [Lefthook](https://lefthook.dev), configured in
`lefthook.yml`. The `pre-commit` hook runs Biome over the staged files and then
type-checks the whole project; it does not write fixes for you, so a failing
commit means running `bun run check` and re-staging. The `commit-msg` hook runs
commitlint.

Hooks install themselves — the `lefthook` package's postinstall runs
`lefthook install`, and skips when `CI` is set. There is no `prepare` script.
`pre-commit` is skipped mid-merge and mid-rebase, because those commits are often
not something the committer can fix in place.

Two lint decisions are deliberate, so do not "fix" them:

- `suspicious/noArrayIndexKey` is off in `biome.jsonc`. Every list here renders
  static `portfolio.json` content in file order, so index keys are correct and
  content-derived keys would collide on repeated prose.
- The `<img>` tags carry `biome-ignore lint/performance/noImgElement`. Their
  `src` values are arbitrary URLs from `portfolio.json`; `next/image` would
  require whitelisting every host in `apps/web/next.config.ts` and would break the moment
  a user adds a logo from a new domain.

Suppression comments must be a **single line** immediately above the offending
node, otherwise biome reports `suppressions/unused`.

## What NOT to do

- Do not hardcode user content inside component files.
- Do not add a second data file. `portfolio.json` is the only source of truth.
- Do not edit `apps/web/app/data/generateMarkdown.ts` to patch content. Fix the JSON instead.
- Do not add a `title` field to the `hero` section (it does not use one).
- Do not add a `version` field to any workspace `package.json`. One version, at
  the root, owned by release automation.
- Do not recreate `apps/web/app/docs/`. Documentation lives in `apps/docs`.
- Do not use a caret or tilde in a dependency range. Every version in this repo
  is pinned exactly.
- Do not upgrade TypeScript. It is held at `5.9.3` on purpose while everything
  else tracks latest.
- Do not remove the `overrides` block from the root `package.json`.

### Known quirks in `generateMarkdown.ts`, pinned by tests

Two behaviours look like bugs and are not. Both are covered by characterization
tests, so "fixing" them fails the suite:

- There is no handler for the `github` section, so it contributes nothing to the
  Markdown output.
- The `youtube` section emits `## YouTuber @<handle>` rather than its configured
  `title`.

Change them deliberately, updating the tests in the same commit, or not at all.
