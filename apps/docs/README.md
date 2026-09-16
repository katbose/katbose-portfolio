# @katbose/docs

Mintlify documentation for the monorepo. Hosted by Mintlify and served on its own
subdomain, `docs.katbose.dev`, so it deploys independently of the web app and
needs nothing from it.

## Local

```bash
bun --filter @katbose/docs dev            # preview on http://localhost:7003
bun --filter @katbose/docs validate       # docs.json + page resolution
bun --filter @katbose/docs broken-links   # internal links, including anchors
bun --filter @katbose/docs format         # rewrites MDX in place
bun --filter @katbose/docs a11y           # colour contrast + media alt text
```

## Files

| File | Purpose |
|---|---|
| `docs.json` | Site config — theme, colors, fonts, navigation, navbar, footer |
| `style.css` | Visual parity with the portfolio. Auto-included; no import needed |
| `index.mdx` | Landing page |
| `architecture.mdx` | Workspace layout and content model |
| `local-development.mdx` | Install, run, test, validate |
| `changelog.mdx` | **Owned by release automation.** See below |

## The two overrides in the root package.json exist for this workspace

Mintlify's packages pin their dependencies to exact versions, and two of those
pins collide with the web app's:

| Package | Pins | Web app has |
|---|---|---|
| `@mintlify/prebuild` | `sharp` **0.33.5** exactly | `sharp` 0.35.4, via `next` |
| `@mintlify/previewing` | `react` **19.2.3** exactly | `react` 19.3.0 |

Bun hoists one version and nests the other, producing two failures that look
unrelated but share a cause:

- **sharp** — both majors ship a file called `libvips-42.dll`. Windows resolves
  DLLs by name once per process, so whichever loads second is handed the wrong
  library and dies with `ERR_DLOPEN_FAILED: The specified procedure could not be
  found`. The trigger is `sharp-ico`, a `favicons` dependency that declares
  `sharp: *` and so resolves to whatever is hoisted — Next's 0.35.4.
- **react** — `react-reconciler` hoists to the root and binds to react 19.3.0
  while `ink` renders with the nested 19.2.3. Two React instances means two
  dispatchers, so every hook call throws inside `mint dev`.

Both are fixed by collapsing each package onto a single version, in the root
`package.json`:

```json
"overrides": {
  "react": "19.3.0",
  "sharp": "0.35.4",
  "qs": "6.16.0",
  "adm-zip": "0.6.1",
  "js-yaml@4.3.1": "4.3.2",
  "puppeteer@24.3.1": "25.11.0"
}
```

`react` and `sharp` are deliberately **top-level, not scoped to a parent**. A
scoped rule would nest a second copy of the wanted version, and two copies of the
*same* version are still two module instances — which fixes neither a
dual-dispatcher bug nor a duplicate-DLL bug. Collapsing to one copy does: after
these rules there is exactly one `react`, one `sharp`, and one `libvips-42.dll`
in the tree, so neither collision can occur at all.

`sharp` is pinned up to 0.35.4 rather than down to Mintlify's 0.33.5, because
0.33.5 carries four libvips CVEs and two libheif advisories that 0.35.4 fixes.
Verified that `mint validate`, `broken-links`, `a11y`, `format` and `dev` all
work on 0.35.4.

`qs`, `adm-zip` and `js-yaml` are purely security bumps for advisories in the
docs toolchain; they are listed here because `bun audit` flags them and the
packages that pull them in pin exact versions, so nothing else can move them.

`js-yaml` uses the **version-scoped** form on purpose. Every `@mintlify/*`
package pins `js-yaml` at exactly `4.3.1`, but `front-matter` needs `^3.13.1`,
and js-yaml v4 removed `safeLoad`. A plain `"js-yaml": "4.3.2"` rule would drag
`front-matter` across a major and break it. The `@4.3.1` selector matches only
dependents whose declared range covers 4.3.1, so `front-matter` keeps its 3.x
copy. Verified after installing: one `js-yaml@4.3.2` hoisted, one `3.15.2` nested
under `front-matter`, and commitlint still loads its config.

Nested and version-scoped overrides need Bun >= 1.4, and Bun writes them as
lockfile version 3. `packageManager` already pins Bun 1.4.2.

The version-scoped Puppeteer override replaces Mintlify's 24.3.1 pin with
25.11.0 and its matching browser downloader 3.2.2. This removes `extract-zip`
and both reported path-traversal/arbitrary-write advisories. `bun audit` on
September 16, 2026 reports **no vulnerabilities** across 956 audited packages.
Mintlify itself remains pinned at 4.2.891.

This crosses a major version deliberately. The
[Puppeteer 25 migration notes](https://pptr.dev/CHANGELOG#2500-2026-05-12)
require Node 22 and remove several deprecated APIs. Mintlify's installed ESM
adapter uses supported `launch`, page navigation, viewport, headers and content
APIs. Validation, broken links, accessibility, and the adapter's actual launch /
JavaScript execution / HTML extraction were verified on Node 24.21.0.

To repeat the integration check with an installed Chrome (PowerShell):

```powershell
$env:PUPPETEER_EXECUTABLE_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
node scripts/check-docs-browser.mjs
```

CI skips the browser download because its docs checks do not launch Chrome.
The override removes the vulnerable package; skipping the download alone was
not a fix. Revisit this override when Mintlify updates its own Puppeteer pin.

Running the CLI through `bunx` instead of installing it here was tried and
rejected. It avoids the conflicts, but the shared `%TEMP%\bunx-*` tree is not
self-healing: it corrupted twice in one session, once as a half-extracted
Puppeteer browser and once as a silently missing `lodash`. CI needs a lockfile,
not a cache that can rot.

<!-- Reinstalling note: mint pulls Puppeteer, whose postinstall downloads a
     browser into ~/.cache/puppeteer. If a download is interrupted, that cache is
     left with the folder present and the executable missing, and every later
     `bun install` fails on it. Delete ~/.cache/puppeteer and reinstall. -->

If `bun install` fails in a `puppeteer` postinstall complaining that a browser
folder exists but its executable is missing, delete `~/.cache/puppeteer` and
install again. That cache is outside the repo and is rebuilt automatically.

## Two more things that will bite you

**`docs.json` has no `$schema` key.** Adding
`"$schema": "https://mintlify.com/docs.json"` as the first key gives editors
autocomplete and inline validation, and it is worth doing locally. It is absent
only because the tooling used to author the file refuses to write remote schema
URLs. `mint validate` enforces the same constraints and CI runs it, so the loss
is editor ergonomics, not correctness.

**Pages must be `.mdx`, not `.md`.** Mintlify's docs say both work. Verified
against mint 4.2.890, they do not: a `.md` file is served but is not resolved as
a navigation page, and `mint validate` reports it as missing. Use `.mdx`.

## The changelog

`changelog.mdx` is rewritten by release automation, so its structure is load
bearing.

release-please finds its insertion point by searching for the first version
heading — the regex is `\n###? v?[0-9[]`. When it finds one, it splices the new
entry in above it and leaves everything before it untouched. When it finds none,
it takes a different path: it writes its own `# Changelog` header at the top,
appends the previous content below the new entry, and demotes every H1 to an H2.

That second path would move this page's YAML frontmatter below the release notes,
which breaks it outright. The `## 0.0.0` baseline heading at the bottom of the
file exists to guarantee the first path is always taken. **Do not delete it, and
do not let it stop being the last version heading in the file.**

For the same reason the page has no `# ` H1 in its body. The title comes from
frontmatter; adding a body H1 would render a second `h1` and would be demoted on
the next release.

## Styling

`style.css` is plain, hand-written CSS. Mintlify inlines it into a `<style>` tag
at build time rather than linking it, so grepping the HTML for `style.css` will
wrongly suggest it was dropped — grep for a token such as `--kb-background`
instead.

Tokens are transcribed from `apps/web/app/globals.css` rather than imported,
because Mintlify renders Tailwind v3 while the web app is on Tailwind v4;
utility classes and v4-only syntax (`@theme`, `@custom-variant`) do not cross
that boundary. Restyle by targeting Mintlify's documented element IDs
(`#navbar`, `#sidebar`, `#sidebar-content`, `#page-title`, `#content`,
`#pagination`, `footer`).

If the palette in `globals.css` changes, update the `--kb-*` tokens at the top of
`style.css` to match. They are duplicated by necessity, not by accident.

`colors` in `docs.json` deliberately sets only `primary` and `light`. The
optional `dark` key drives buttons and hover states in *both* modes, so a
monochrome brand cannot express it as one hex: `#000000` there scores 1:1 against
the dark background and `mint a11y` fails the build. Omitting it lets Mintlify
derive both, and the navbar CTA is inverted per mode in `style.css` instead.
