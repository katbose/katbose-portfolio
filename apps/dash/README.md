# @katbose/dash

Reserved workspace for the analytics and reporting dashboard. **Nothing is
implemented yet.**

## Status

Deliberately empty. This directory exists so the monorepo structure is settled
before the dashboard is designed, not to hold placeholder code.

| | |
|---|---|
| Framework | **Undecided** |
| Local port | `7002` |
| Hosting | Separate from `katbose.dev` (its own deployment target) |
| Turborepo | Declares no tasks, so `turbo run` skips it until it has scripts |

## Intended scope

Analytics and reports for the portfolio and its docs. Concrete data sources are
not decided; likely candidates are Vercel Analytics (already wired into the web
app) and Mintlify's docs analytics.

## When picking this up

1. Choose the framework and record the reason here.
2. Add a `package.json` with `dev`, `build`, and `typecheck` scripts so
   Turborepo picks the workspace up automatically.
3. Extend the shared compiler settings:
   `"extends": "@katbose/typescript-config/base.json"` — or `nextjs.json` if the
   choice turns out to be Next-based.
4. Bind the dev server to port `7002` so it never collides with web (`7000`),
   cms (`7001`), or docs (`7003`).
