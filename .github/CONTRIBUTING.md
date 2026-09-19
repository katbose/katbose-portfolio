# Contributing

Thanks for looking. This is the monorepo behind [katbose.dev](https://katbose.dev):
the portfolio site, its documentation, and reserved space for a CMS and a
dashboard.

It is a personal site, so the most useful contributions are bug reports, fixes,
and tooling improvements rather than content or redesigns. If you are thinking of
something large, open an issue first — it is kinder than finding out at review
that the direction was wrong.

## Before you start

| Tool | Version | Why |
|---|---|---|
| [Bun](https://bun.sh) | `1.4.2` | Package manager, workspace resolver, unit test runner |
| [Node.js](https://nodejs.org) | `>= 20.17` | Required by the Mintlify CLI |

Bun is pinned through `packageManager`, so a mismatched version will tell you.
Node is only needed for the docs site; the web app builds and runs under Bun.

```bash
git clone https://github.com/katbose/katbose-portfolio.git
cd katbose-portfolio
bun install     # every workspace, plus the git hooks
bun run dev     # starts every workspace that declares a dev task
```

Ports are fixed per workspace so nothing collides when several run at once:

| App | URL |
|---|---|
| `@katbose/web` | http://localhost:7000 |
| `@katbose/cms` | `7001` (reserved, nothing there yet) |
| `@katbose/dash` | `7002` (reserved, nothing there yet) |
| `@katbose/docs` | http://localhost:7003 |

`localhost:7000/docs` redirects to the docs server, so start both if you are
working across that boundary.

## The one rule about content

Site content lives in exactly one file:

```
apps/web/app/data/portfolio.json
```

Components are fixed; data is not. Do not hardcode copy inside a component, and
do not add a second data file. [`CLAUDE.md`](../CLAUDE.md) documents the full
schema — every section type, the rich-text block format, and the post format.

That file currently holds biographical content inherited from the upstream
template. Please do not edit it in a pull request unless the change is
specifically about that content and you say so explicitly.

## Checks

Run from the repository root. Each fans out across the workspaces that declare
the task.

```bash
bun run check       # Biome lint + format, applies safe fixes
bun run typecheck   # tsc --noEmit
bun run test        # Bun unit tests
bun run build       # production builds
bun run test:e2e    # Playwright, builds first
bun run validate    # docs config + page resolution
```

Biome is deliberately **not** a Turborepo task. It already scans the whole
repository in one pass, including root-level files no per-workspace run would
see, so the root scripts call it directly.

Touching `apps/docs` adds four more:

```bash
bun --filter @katbose/docs validate       # docs.json + page resolution
bun --filter @katbose/docs broken-links   # internal links, incl. anchors
bun --filter @katbose/docs a11y           # contrast + media alt text
bun --filter @katbose/docs format         # rewrites MDX in place
```

Docs pages must use the `.mdx` extension. A `.md` file is served but is never
resolved as a navigation page.

### Three things that look like bugs and are not

- **Stale `.next` breaks typecheck.** `apps/web/tsconfig.json` includes the types
  Next generates. If you delete or rename a route, `tsc` keeps failing on the
  generated validator until you remove `apps/web/.next` and rebuild.
- **Port 7000 must be free before `test:e2e`.** Playwright refuses to reuse a
  server it did not start, because an orphaned `next start` serves HTML
  referencing chunks a later build deleted — which looks like an application bug
  rather than a stale server.
- **The `overrides` block in the root `package.json` is load-bearing.** It exists
  for the docs CLI, not the web app. Removing the `react` or `sharp` rule breaks
  `mint dev`. [`apps/docs/README.md`](../apps/docs/README.md) explains each rule.

### Windows: Smart App Control can block Turborepo

On Windows with Smart App Control enforced, every root task fails like this:

```
Error: spawn UNKNOWN   errno: -4094
```

Run the binary directly and the real reason appears: *"An Application Control
policy has blocked this file."* Turborepo ships an unsigned platform binary at
`node_modules/@turbo/windows-64/bin/turbo.exe`, and Smart App Control judges
executables by signature and Microsoft reputation, so a freshly extracted copy is
blocked. It comes back every time `node_modules` is reinstalled.

Antivirus exclusions do not help — Smart App Control is a separate mechanism with
no per-file allow list. Until it is turned off (which cannot be undone without
reinstalling Windows) the workaround is to skip Turborepo and call the workspace
scripts directly:

```bash
bun --filter @katbose/web build
bun --filter @katbose/web typecheck
bun --filter @katbose/web test
```

You lose Turborepo's caching locally, nothing else. CI runs on Linux and is
unaffected.

## Commits

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org)
and are checked by commitlint on the `commit-msg` hook. This is not cosmetic:
release automation reads them to version the **entire repository**.

```
<type>[optional scope][!]: <subject>

feat(docs): add an architecture page
fix: correct the calendar link in the navbar
feat!: drop the legacy /docs route
```

| Prefix | Effect on the version |
|---|---|
| `fix:` | patch |
| `feat:` | minor |
| `feat!:` or a `BREAKING CHANGE:` footer | minor while below `1.0.0`, major after |
| `chore:` `docs:` `refactor:` `test:` `style:` `perf:` `build:` `ci:` `revert:` | no release |

Scope is optional and unrestricted. Workspace names (`web`, `docs`, `cms`,
`dash`) and cross-cutting labels (`deps`, `ci`, `release`) are the conventional
choices, not a gate.

Two hooks run automatically. They are managed by
[Lefthook](https://lefthook.dev) and configured in
[`lefthook.yml`](../lefthook.yml) — the `lefthook` package installs them from its
own postinstall during `bun install`, and skips doing so when `CI` is set, so
there is no `prepare` script to keep in sync.

- **`pre-commit`** — Biome over the staged files, then a typecheck of the whole
  project. It does not reformat for you; run `bun run check` and re-stage.
  Skipped mid-merge and mid-rebase.
- **`commit-msg`** — commitlint.

To run one by hand without committing:

```bash
bunx lefthook run pre-commit
bunx lefthook check-install   # confirm the installed hooks match lefthook.yml
```

If hooks seem not to fire, check that `core.hooksPath` is unset for this
repository (`git config --local --get core.hooksPath`). Lefthook installs into
`.git/hooks`, so a leftover value from another hook manager silently bypasses it.

## Pull requests

1. Branch from `main`. Never push to `main` directly.
2. Keep the change focused. A bug fix does not need the surrounding code
   reformatted.
3. Make sure `bun run check`, `bun run typecheck`, `bun run test` and
   `bun run build` pass locally. CI runs all of them plus Playwright and the docs
   gates, but finding out locally is faster.
4. Describe what you changed and how you verified it. "Tested manually" is fine
   if you say what you clicked.

CI runs two jobs — `verify` (lint, types, unit tests, build, end-to-end) and
`docs` (validate, links, accessibility, formatting). Both must be green.

## Dependencies

Every dependency is pinned to an **exact** version. No `^`, no `~`. If you add
one:

```bash
bun add --exact <package>@<version>
```

One standing exception to "track latest":

- The `overrides` block pins `react`, `sharp`, `qs`, `adm-zip` and `js-yaml` for
  reasons documented in `apps/docs/README.md`.

TypeScript tracks latest along with everything else and is currently on 7. Note
that TypeScript 7 no longer auto-includes `@types` packages from the monorepo
root, which is why `packages/typescript-config/base.json` sets `types`
explicitly. That field is replaced rather than merged when a config extends it,
so a workspace needing other ambient types has to restate the full list.

Run `bun audit` after adding anything. Two advisories are currently accepted and
explained in [`SECURITY.md`](SECURITY.md); anything beyond those needs a look.

## Versioning

One version covers the whole project. There is no separate version for `web`,
`docs`, `cms`, or `dash`, and only the root `package.json` carries a `version`
field — never add one to a workspace.

Releases are automated. Merging to `main` opens a release pull request; merging
that tags the repository as exactly `vX.Y.Z`, with no prefix or suffix, and
writes [`apps/docs/changelog.mdx`](../apps/docs/changelog.mdx). Do not bump
versions or edit the changelog by hand.

Release Please's configured `package-name` is deliberately empty: this is one
repository-wide release, with a componentless branch and plain `vX.Y.Z` tags.
The root npm package name remains unchanged. Do not set a nonempty release
package name while using the combined `release-please--branches--main` branch;
Release Please would refuse to publish its merged PR. The top-level
`group-pull-request-title-pattern` keeps combined PR titles in the
`chore(release): vX.Y.Z` format; a package-level title pattern does not control
the combined PR title. The workflow
fails explicitly if a merged release PR remains pending, and supports manual
reruns after a configuration repair.

### Release presentation

Release Please groups commits into features, fixes, performance, architecture,
build/dependencies, documentation, verification and automation. Write commit
subjects around the user-visible outcome; explain the approach in the body.

Published releases show the complete categorized changelog, including any breaking
changes, without collapsing it or repeating its first few bullets. PR and commit
links generated by Release Please remain intact. A full comparison link and
credits for GitHub commit authors are added from the release's actual comparison
range; bot accounts are excluded and paginated commit results are included.
Release PRs use their head SHA for contributor lookup because the future tag
does not exist yet. Their original version details remain intact for publication.

Release notes are generated entirely from Conventional Commits and GitHub
metadata. No per-version summary files are needed. Write commit subjects around
the outcome and include useful technical context in commit bodies. The formatter
never creates tags, publishes releases or merges PRs.

Preview a release before updating its presentation:

```sh
node scripts/format-release-notes.mjs --release v0.2.1 --preview
node scripts/format-release-notes.mjs --pr 6 --preview
```

Omit `--preview` to apply the presentation. Reruns are idempotent and also migrate
the earlier collapsed-changelog layout. Only formatter-owned blocks are replaced;
all generated change entries and links are retained. Existing published releases
are updated only when explicitly targeted; the workflow formats new releases.

### Deployment labels

Vercel builds the web workspace automatically. The deployment-label workflow
keeps its status and URLs but labels its GitHub target `production - apps/web`.
It handles only Vercel's `Production` records, ignores its own updates, and
checks for newer statuses before writing. Preview and Mintlify records are
untouched. This label does not rename Vercel's built-in Production environment.

## Conduct

By taking part you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
