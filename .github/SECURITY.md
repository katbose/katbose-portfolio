# Security Policy

## Supported versions

This project is pre-1.0 and ships a single version for the whole repository,
tagged `vX.Y.Z`. Only the most recent release is supported; fixes land on `main`
and go out in the next release rather than being backported.

| Version | Supported |
|---|---|
| Latest release | Yes |
| Anything older | No |

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Use GitHub's private vulnerability reporting on the
[Security tab](https://github.com/katbose/katbose-portfolio/security/advisories/new),
which keeps the report private until a fix is published. If that is unavailable,
email **im@katbose.dev** with `SECURITY` in the subject.

Helpful things to include:

- What the issue is and roughly how severe you think it is
- Steps to reproduce, or a proof of concept
- Which version, commit, or URL you saw it on
- Whether you have already disclosed it anywhere

This is a personal project maintained in spare time, so please expect a first
response within about a week rather than within hours. You will get an
acknowledgement, an assessment, and credit in the release notes if you would like
it. If a report turns out to be out of scope, you will get an explanation rather
than silence.

## Scope

**In scope**

- The deployed site at `katbose.dev` and anything served from it
- Source in this repository, including the build, CI, and release tooling
- The GitHub Actions workflows and the permissions they request
- Dependency issues that are actually reachable in this project

**Out of scope**

- The hosting platforms themselves. Report those to the host in question, or to
  [Mintlify](https://mintlify.com) for the documentation site, directly.
- Vulnerabilities in third-party dependencies with no reachable path here — see
  the accepted advisories below.
- Missing hardening headers, or findings from an automated scanner, with no
  demonstrated impact.
- Anything requiring physical access to a maintainer's machine, or social
  engineering.

Content on the site is largely biographical and inherited from the upstream
template it was forked from. Please report factual or attribution concerns as a
normal issue, not as a security report.

## How this project reduces risk

- **Exact dependency pins.** Every direct dependency is pinned to an exact
  version — no `^`, no `~` — so an upgrade is always a visible, reviewable edit.
- **`bun audit` on every change.** Contributors run it before opening a pull
  request.
- **Least-privilege CI.** The CI workflow requests `contents: read` and nothing
  more. Release writes are isolated to the release workflow on `main`; the
  deployment-label workflow has only deployment-write access and checks out no code.
- **Actions pinned by commit SHA.** Every GitHub Action is referenced by its full
  40-character commit SHA rather than a tag, so a moved or retagged release cannot
  change what executes. The human-readable version sits in a comment beside each
  one.
- **`pull_request`, not `pull_request_target`.** Workflows triggered by a fork's
  pull request never run with repository secrets.
- **No secrets in the repository.** `.env*` is gitignored and nothing in the tree
  requires a credential to build.

## Code scanning

CodeQL scans JavaScript/TypeScript and GitHub Actions on pushes and pull requests
into main, weekly, and on manual dispatch. Both languages use the
`security-extended` suite. Source, scripts and tests remain in scope; findings
are assessed by their reachable impact rather than severity labels alone.
Neither language requires a build or dependency installation for analysis.
Action versions stay pinned, checkout credentials are not persisted, and only
analysis jobs receive permission to upload security results.

## Dependency advisory history

The previously accepted `extract-zip@2.0.1` advisories (GHSA-jmr9-qjv8-65gv and
GHSA-7pqw-9j4j-h8q3) were removed through the version-scoped Puppeteer override.
The replacement downloader no longer depends on that extractor. Skipping the
browser download alone was not the fix. See `apps/docs/README.md` for the
compatibility checks and override rationale. CI runs `bun audit` on the current
lockfile; historical audit results are not a guarantee for future advisories.

Five other advisories reported against this tree were resolved by pinning
`sharp`, `qs`, `adm-zip` and `js-yaml` in the root `overrides` block.
`apps/docs/README.md` explains each pin and why the `js-yaml` rule uses Bun's
version-scoped form.

## Documentation dependency remediation

On October 8, 2026, compatible lockfile updates, scoped overrides and the
following dependency replacements resolved all 26 audit findings. The raw
`bun audit` command remains enforced without advisory exclusions.

`sprintf-js` was removed by moving the legacy frontmatter dependency from
js-yaml 3 to 4.3.2. The committed Bun patch for `front-matter@4.0.2` uses
`load`, the safe API in js-yaml 4, instead of the removed `safeLoad` API.
Legacy JavaScript YAML tags remain disabled, including with `allowUnsafe`.
This eliminates the argparse 1 / sprintf-js dependency path underlying
[GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c).

`braces@3.0.3` is replaced with the exact reviewed backport
`@dieub/braces-depth-guard@3.0.3-pn.3`. Its runtime changes bound brace and
parenthesis nesting and AST traversal to 100 levels and reject cyclic parent
chains. These changes address
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
The backport's registry signatures and provenance attestation were verified;
its runtime matches source commit
`305a2e4bfe324bb53c336c1b03387ee1251c926f`, and its 799-test suite passes.
The lockfile pins the npm archive's integrity hash.

CI exercises both remediations through actual Mintlify, file-matching and
watcher consumers, including malicious input regression tests. A renamed
package or a clean audit alone does not establish remediation. Revisit the
backport and frontmatter patch when maintained upstream releases remove the
need for them; retain the regression tests when changing these pins.

If you find another reachable issue, please report it.
