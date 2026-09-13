# @katbose/cms

Reserved workspace for the content management app. **Nothing is implemented yet.**

## Status

Deliberately empty. This directory exists so the monorepo structure is settled
before the CMS decision is made, not to hold placeholder code.

| | |
|---|---|
| Framework | **Undecided** — Payload and Sanity are both under consideration |
| Local port | `7001` |
| Hosting | Separate from `katbose.dev` (its own deployment target) |
| Turborepo | Declares no tasks, so `turbo run` skips it until it has scripts |

## Why the portfolio content still lives in the web app

Right now the single source of truth for site content is:

```
apps/web/app/data/portfolio.json
```

That stays put until the CMS is chosen. Moving it into a shared package first
would mean guessing at the CMS's data model and almost certainly migrating
twice. When the CMS lands, the content moves once, directly into whatever shape
that tool actually wants.

## When picking this up

1. Choose the framework and record the reason here.
2. Add a `package.json` with `dev`, `build`, and `typecheck` scripts so
   Turborepo picks the workspace up automatically.
3. Extend the shared compiler settings:
   `"extends": "@katbose/typescript-config/base.json"` — or `nextjs.json` if the
   choice turns out to be Next-based.
4. Bind the dev server to port `7001` so it never collides with web (`7000`),
   dash (`7002`), or docs (`7003`).
