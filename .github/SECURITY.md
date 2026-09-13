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
  more. Write permissions are isolated in a separate release workflow that only
  runs on `main`.
- **Actions pinned by commit SHA.** Every GitHub Action is referenced by its full
  40-character commit SHA rather than a tag, so a moved or retagged release cannot
  change what executes. The human-readable version sits in a comment beside each
  one.
- **`pull_request`, not `pull_request_target`.** Workflows triggered by a fork's
  pull request never run with repository secrets.
- **No secrets in the repository.** `.env*` is gitignored and nothing in the tree
  requires a credential to build.

## Accepted advisories

`bun audit` currently reports two advisories, both the same package. They are
known and accepted rather than overlooked:

**`extract-zip@2.0.1`** — GHSA-jmr9-qjv8-65gv and GHSA-7pqw-9j4j-h8q3, symlink
path traversal on archive extraction, rated high.

- **Path:** `@katbose/docs` → `mint` → … → `puppeteer` → `@puppeteer/browsers` →
  `extract-zip`
- **Why it is unresolved:** the advisory range is `<=2.0.1`, and 2.0.1 is the
  latest published release. There is no fixed version to move to.
- **Why the risk is low here:** it is a `devDependency` of the documentation
  toolchain, never shipped to a browser and never on a request path. It runs only
  when Puppeteer extracts a downloaded browser archive, which CI skips entirely
  via `PUPPETEER_SKIP_DOWNLOAD`, and the archives come from Google's own
  distribution.
- **Revisit when:** Puppeteer ships a release that no longer depends on a
  vulnerable `extract-zip`.

Five other advisories reported against this tree were resolved by pinning
`sharp`, `qs`, `adm-zip` and `js-yaml` in the root `overrides` block.
`apps/docs/README.md` explains each pin and why the `js-yaml` rule uses Bun's
version-scoped form.

If you find something reachable that is not on this list, please report it.
