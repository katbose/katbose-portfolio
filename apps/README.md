# `apps/`

Every deployable thing in this repository lives here. One directory per
workspace, one workspace per deployment target.

This file explains three things: **why** this folder exists at all, **what** is
inside it, and **how** the code within each app is organised. It stops short of
explaining how any one app works internally — `web` and `docs` each have a
detailed README for that, linked below.

## Contents

- [Why an `apps/` folder at all](#why-an-apps-folder-at-all)
- [Apps vs packages](#apps-vs-packages)
- [The four workspaces](#the-four-workspaces)
- [Structure at a glance](#structure-at-a-glance)
- [Inside `web`](#inside-web)
- [Inside `docs`](#inside-docs)
- [Inside `cms` and `dash`](#inside-cms-and-dash)
- [Port allocation](#port-allocation)
- [Deployment boundaries](#deployment-boundaries)
- [How Turborepo picks an app up](#how-turborepo-picks-an-app-up)
- [Shared conventions](#shared-conventions)
- [Running things](#running-things)
- [Adding a new app](#adding-a-new-app)

## Why an `apps/` folder at all

The repository started as a single Next.js site. A portfolio at the root, no
workspaces, no nesting. `apps/` exists because that shape could not hold four
things at once.

The problem was not size, it was **independence**. The portfolio, the docs site,
a future CMS, and a future dashboard each want their own framework, their own
dependency versions, their own build command, and their own hosting target. The
docs are a Mintlify site; the portfolio is Next.js. Those two cannot share a
`package.json` without one dictating terms to the other.

Three shapes were possible. This is why the third won:

**One repository, one app, everything at the root.** Simplest, and where this
started. Breaks the moment a second deployable arrives: two frameworks, one
dependency tree, one set of scripts, and no way to build or release them
separately.

**A repository per app.** Genuine independence, but the coordination cost lands
on every change that crosses a boundary. The docs describe the web app's
architecture; the web app links to the docs and swaps in a local docs port during
development. Keeping those honest across four repositories means four clones,
four CI setups, four dependency bumps a week, and a cross-repository pull request
every time a change touches two of them.

**One repository, many workspaces — this.** Each app keeps its own
`package.json`, its own framework, and its own deploy target, while the repo
keeps one clone, one install, one lockfile, one CI pipeline, and one commit that
can change the web app and the docs that describe it together, atomically.

What that buys concretely:

- **One `bun install`** resolves every workspace against a single lockfile, so
  two apps cannot silently drift onto different versions of a shared dependency.
- **One CI run** is the verdict for the whole repository, so a change to the web
  app cannot merge while the docs it references are broken.
- **One version, one changelog.** Release automation reads Conventional Commits
  and bumps every workspace together, so there is never a question of which
  combination of versions was deployed.
- **Shared config is a workspace, not a copy.** `@katbose/typescript-config` is
  imported by each app instead of the compiler options being duplicated four
  times and diverging.
- **Cross-cutting tooling runs once.** Biome, the commit hooks, and the MCP
  config sync operate on the whole tree.

And the corresponding costs, stated honestly: every app is checked out even if
you only touch one; Turborepo exists purely to stop that from being slow; and a
single version number means an unrelated app's minor moves when the web app gains
a feature.

**Why the name `apps`.** It marks the boundary that matters: `apps/*` ships to a
URL, `packages/*` is consumed by other workspaces. That one distinction decides
where any new directory belongs, and it is the same convention Turborepo,
Nx, and most JS monorepos use — so the layout is recognisable without
explanation.

## Apps vs packages

The split is about deployment, not size.

| | `apps/*` | `packages/*` |
|---|---|---|
| Purpose | Something that ships to a URL | Something other workspaces import |
| Published to npm | No — deployed | No — internal only |
| Depends on | packages | other packages |
| Example | `@katbose/web` → `katbose.dev` | `@katbose/typescript-config` |

If it has a hosting target, it belongs here. If its only consumers are other
workspaces, it belongs in [`packages/`](../packages) — today that holds exactly
one member, `typescript-config`, whose `base.json` and `nextjs.json` every app
extends.

Note the dependency direction: **apps depend on packages, never on each other.**
`web` does not import `docs`. If two apps ever need the same code, it moves into
`packages/` rather than one reaching sideways into the other.

## The four workspaces

Two are live, two are reserved. The reserved ones hold a README and a minimal
`package.json` and nothing else — the directories exist so the structure is
settled before the decisions are made, not to hold placeholder code.

| Workspace | Status | Stack | Serves | README |
|---|---|---|---|---|
| `web` | **Live** | Next.js 16 App Router, React 19, Tailwind 4 | `katbose.dev` | [`web/README.md`](web/README.md) |
| `docs` | **Live** | Mintlify | `docs.katbose.dev` | [`docs/README.md`](docs/README.md) |
| `cms` | Reserved | Undecided — Payload and Sanity both under consideration | its own target | [`cms/README.md`](cms/README.md) |
| `dash` | Reserved | Undecided | its own target | [`dash/README.md`](dash/README.md) |

## Structure at a glance

```
apps/
├── web/                    the portfolio — Next.js, the substance of the repo
│   ├── app/                App Router: routes, components, content
│   ├── e2e/                Playwright specs + visual baselines
│   ├── scripts/            content validation, bundle budgets
│   ├── public/             static assets
│   ├── proxy.ts            middleware: ?format=markdown negotiation
│   ├── next.config.ts      redirects, remote image patterns
│   └── playwright.config.ts
│
├── docs/                   documentation — Mintlify, its own subdomain
│   ├── docs.json           navigation, theme, the whole site config
│   ├── *.mdx               the pages
│   └── style.css
│
├── cms/                    reserved — not implemented
└── dash/                   reserved — not implemented
```

Only `web` and `docs` have scripts, so `turbo run <task>` touches only those two.

## Inside `web`

The one app with real structure. Four directories matter, and the split between
them is deliberate.

```
web/
├── app/
│   ├── layout.tsx          root layout, fonts, providers
│   ├── page.tsx            the homepage — maps portfolio.json to sections
│   ├── providers.tsx       theme provider
│   ├── globals.css         Tailwind entry + documented utility allowlist
│   ├── robots.ts           ┐ generated, not static files
│   ├── sitemap.ts          ┘
│   │
│   ├── blogs/              ┐ the two post collections
│   │   ├── page.tsx        │ archive listing
│   │   └── [slug]/         │ a post, plus its /markdown route
│   ├── explore/            ┘ same shape
│   ├── [slug]/             legacy post URLs → 308 to the canonical collection
│   │
│   ├── components/         everything renderable
│   │   ├── sections/       one component per portfolio.json section type
│   │   ├── ui/             primitives ported from shadcn/ui
│   │   ├── essay/          post-page pieces
│   │   └── *.tsx           shared: shell, menu, breadcrumb, archive, effects
│   │
│   └── data/               content + derived logic, and the unit tests
│
├── e2e/                    Playwright: behaviour + visual regression
├── scripts/                validate-content.ts, bundle-report.ts
└── public/
```

### `app/data` — the source of truth

The most important directory in the repository. The site is data-driven: almost
everything rendered comes from one JSON file, and the modules beside it are the
only place that file is interpreted.

| File | Role |
|---|---|
| `portfolio.json` | **All site content.** Sections, posts, socials, metadata |
| `portfolio.schema.ts` | Zod schema — the contract `portfolio.json` must satisfy |
| `portfolio.ts` | Typed access to the parsed content |
| `posts.ts` | Post type and lookup helpers |
| `postHelpers.ts` | Everything *derived* from a post: URL, markdown, reading time |
| `postRoutes.ts` | Collections, path building, the canonical URL decision |
| `postRouteShared.ts` | Shared bodies for the four post routes |
| `siteMenu.ts` | Navigation menu links and section anchor ids |
| `siteMeta.ts` | Site URL, docs URL, owner name, meta description |
| `generateMarkdown.ts` | The whole site as Markdown, for agent mode |
| `localTime.ts` | Timezone clock formatting |
| `imageProps.server.ts` | Server-side image optimisation |

Two conventions here are worth internalising:

**Tests sit beside their module** as `*.test.ts` — ten of them — rather than in
a separate tree. They are Bun tests, run by `bun test`, and they compute their
expectations *from* `portfolio.json` so that editing content cannot break them;
only a change in behaviour can.

**Deriving is separated from storing.** `posts.ts` holds content and lookup;
`postHelpers.ts` holds everything computed from it. That is why a post's URL,
its markdown form, and its reading time cannot drift apart across the page, the
markdown route, and the agent view — they all call the same function.

### `app/components` — three tiers

The subdirectories are not arbitrary grouping; each tier has a different rule.

**`sections/`** — one component per section type in `portfolio.json`, plus
`registry.tsx`, which is the single place a `type` string maps to a component.
Adding a section means adding a component, a variant in the discriminated union,
and a case in the renderer. The union makes forgetting the third step a compile
error rather than a blank space on the page.

**`ui/`** — primitives ported from shadcn/ui (`breadcrumb`, `dropdown-menu`,
`animated-theme-toggler`). Ported rather than installed: this repo has no `cn`
helper, no `@/*` path alias, and no shadcn CSS layer, so upstream's `data-slot`
contract and accessibility semantics are kept while the classes are rewritten in
the project's own Tailwind idiom.

**Top level** — everything shared across pages: the shell, the site menu, the
post archive, the water-shader effects, rich text.

The `.client.tsx` suffix is a convention, not a framework requirement: it marks
components that carry `"use client"`, so the client boundary is visible in a
directory listing rather than only on opening the file. Several of them are
`lazy()`-loaded to stay out of the initial bundle, which `scripts/bundle-report.ts`
enforces with a per-route budget.

### `e2e` and `scripts`

`e2e/` holds fourteen Playwright specs split by concern — hydration, animations,
reduced motion, server HTML, theming, post routing — plus `visual.spec.ts` and
its screenshot baselines. Behaviour specs run in CI; the visual baselines stay
local, since screenshots differ across platforms.

`scripts/` holds two checks that are not framework-provided:
`validate-content.ts` parses `portfolio.json` against the Zod schema and runs as
`prebuild`, so invalid content fails before a build starts; `bundle-report.ts`
measures the client JavaScript each route actually ships and fails when a route
crosses its budget.

## Inside `docs`

Deliberately flat. Mintlify owns the structure, so there is no `src/`.

```
docs/
├── docs.json               navigation, theme, colours — the entire site config
├── index.mdx               ┐
├── architecture.mdx        │ the pages
├── local-development.mdx   │
├── changelog.mdx           ┘ generated by release automation
└── style.css               CSS overrides
```

Worth knowing: `changelog.mdx` is generated, and `mint format` and release
automation disagree about how to format it, so CI excludes it from the formatting
check. `docs/README.md` explains that and the two root-level dependency overrides
that exist solely for this workspace.

There is deliberately **no `/docs` route** in the web app and nothing proxies to
it. The two are separate origins that link to each other.

## Inside `cms` and `dash`

```
cms/                        dash/
├── package.json            ├── package.json    name + private, no scripts
└── README.md               └── README.md       status and pickup steps
```

Not started, on purpose. Site content currently lives in
`web/app/data/portfolio.json` and stays there until the CMS is actually chosen:
extracting it into a shared package first would mean guessing at the CMS's data
model and migrating twice. Each README records the reserved port and the steps
for picking it up.

Because neither declares scripts, `turbo run build` and friends skip them
entirely rather than failing.

## Port allocation

Every app owns a port in the 700x range so all four can run at once. This matters
more than it looks: `test:e2e` starts a production server on web's port, and
docs' port is hardcoded in web's `siteMeta.ts` development branch.

| Port | Workspace | Command |
|---|---|---|
| `7000` | `web` | `next dev -p 7000` |
| `7001` | `cms` | reserved |
| `7002` | `dash` | reserved |
| `7003` | `docs` | `mint dev --port 7003` |

Playwright honours `PLAYWRIGHT_PORT` if you need the suite off `7000` — useful
when a dev server already holds it.

## Deployment boundaries

Each app deploys independently. No shared build output, no app importing another.

```
katbose.dev        ← apps/web    (Vercel)
docs.katbose.dev   ← apps/docs   (Mintlify)
```

Those URLs are not hardcoded in components. They come from `meta.siteUrl` and
`meta.docsUrl` in `web/app/data/portfolio.json`, re-exported through
`siteMeta.ts`, which is also what lets the docs link point at `localhost:7003`
during development.

## How Turborepo picks an app up

There is no registration step. A workspace joins a task the moment its
`package.json` declares a script with that name — which is exactly why the
reserved apps are skipped rather than broken.

Tasks declared in [`turbo.jsonc`](../turbo.jsonc):

| Task | What it does | Notes |
|---|---|---|
| `build` | Production build | `dependsOn: ["^build"]` so dependency packages compile first |
| `typecheck` | `tsc --noEmit` | |
| `test` | Bun unit tests | No build needed |
| `test:e2e` | Playwright | `dependsOn: ["build"]` — same-package, not `^build` |
| `validate` | Content/config validation | Used by `docs` |
| `dev` | Dev servers | `persistent: true`, `cache: false` — nothing may depend on it |

`dev` is the one task Turborepo does not cache. It is declared here anyway so
every root script goes through the same task graph and prefixes its output with
the workspace it came from. `persistent` is what makes that safe: Turborepo keeps
the task running rather than waiting for it to exit, and rejects any task that
tries to `dependsOn` it.

Note it is **not** marked `interactive`. That would let the TUI forward keystrokes
to a focused server, but Turborepo then refuses to start the task at all without
an active TUI, so `bun run dev` fails with *"Cannot run interactive task without
Terminal UI"* whenever output is piped or the shell is not a TTY. Neither dev
server reads stdin, so the flag costs more than it returns.

One absence is deliberate, and worth understanding before "fixing" it:

**No Biome task.** It scans the whole repository in one pass, including
root-level files — workflows, configs, `turbo.jsonc` itself — that no
per-workspace run would see. Splitting it per app would be slower *and* less
thorough, so root scripts call it directly.

The `test:e2e` dependency is the subtle one: it depends on `build` in the *same*
package, not `^build`, because `playwright.config.ts` starts the server with
`bun run start`, which serves that workspace's own `.next` output. With `^build`
the suite fails with "no production build found".

## Shared conventions

Things every app here follows, so a new one need not rediscover them.

**TypeScript config is inherited, never rewritten.** Extend
`@katbose/typescript-config/base.json`, or `nextjs.json` for a Next app — it adds
the DOM libs, JSX handling, and the Next language-service plugin on top of base.
Note that `types` is *replaced* rather than merged when extending, which is why
base sets it explicitly.

**Package names are scoped:** `@katbose/<dir>`, matching the directory.

**Workspaces are private.** Nothing here is published to npm.

**One version for the whole repository.** Release automation reads Conventional
Commits and bumps every workspace together, so a `feat:` anywhere moves the
shared minor. Scope commits by workspace — `feat(web):`, `chore(docs):` — to keep
changelogs readable.

## Running things

From the repository root:

```bash
bun install              # every workspace and the git hooks

bun run dev              # turbo run dev — web on :7000, docs on :7003
bun run dev:bun          # same servers without turbo (Smart App Control escape)
bun run build            # turbo run build
bun run typecheck        # turbo run typecheck
bun run test             # turbo run test
bun run test:e2e         # turbo run test:e2e
bun run validate         # turbo run validate

bun run check            # biome, whole repo, with fixes
```

One workspace at a time:

```bash
bun --filter @katbose/web dev
bun --filter @katbose/docs broken-links
```

Each app's README documents its own scripts; `web` has several that are not
Turborepo tasks, including the bundle budget report.

## Adding a new app

1. **Create `apps/<name>/`**, name the package `@katbose/<name>`, keep it
   `private: true`.
2. **Reserve a port** in the 700x range, record it in the table above, and bind
   the dev server to it explicitly. Ports are allocated here, not discovered.
3. **Extend the shared tsconfig** rather than writing compiler options:
   `"extends": "@katbose/typescript-config/base.json"`, or `nextjs.json` for a
   Next app.
4. **Name scripts after the Turborepo tasks** you want to join: `dev`, `build`,
   `typecheck`, `test`, `test:e2e`, `validate`. Matching names *is* the
   registration mechanism.
5. **Declare `build` outputs** if the build writes to disk, so caching works.
   Follow web's example of excluding cache and dev directories — leaving them in
   balloons the artifact and makes replays go stale.
6. **Do not import another app.** Shared code goes to `packages/`.
7. **Write the README.** State the status honestly, including "not implemented",
   and record *why* the framework was chosen. The reserved apps' READMEs are the
   template.
8. **Do not add a Biome task to `turbo.jsonc`.** See above.

## See also

- [Root README](../README.md) — what the project is and the overall workflow
- [`CONTRIBUTING.md`](../.github/CONTRIBUTING.md) — commit conventions, hooks,
  and the Smart App Control workaround
- [`turbo.jsonc`](../turbo.jsonc) — the task graph, with reasoning inline
- [`packages/`](../packages) — shared, non-deployed workspaces
