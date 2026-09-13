/**
 * Commit message rules for the katbose.dev monorepo.
 *
 * These messages are not just style: release automation parses them to decide
 * the next version for the WHOLE repository. There is one version for every
 * workspace, so a `feat:` anywhere bumps the minor for everything.
 *
 *   fix:                                patch   0.1.0 -> 0.1.1
 *   feat:                               minor   0.1.0 -> 0.2.0
 *   feat!:  or  BREAKING CHANGE: footer  major   0.1.0 -> 1.0.0
 *   chore: docs: refactor: test: ci: …   no release
 *
 * Scope is optional and intentionally unrestricted — no `scope-enum` here, so
 * `feat(navbar):` is as valid as `feat(web):`. Workspace names (`web`, `docs`,
 * `cms`, `dash`) and cross-cutting labels (`deps`, `ci`, `release`) are the
 * conventional choices, but they are guidance rather than a gate.
 *
 * @type {import("@commitlint/types").UserConfig}
 */
export default {
  extends: ["@commitlint/config-conventional"],

  rules: {
    // config-conventional caps body and footer lines at 100 characters. Commit
    // bodies here routinely carry a bare URL to an upstream issue or a docs
    // page, and a URL cannot be wrapped without breaking it. Turned off rather
    // than raised, because the right limit is "however long the link is".
    // Subject length stays capped at the inherited 100.
    "body-max-line-length": [0, "always"],
    "footer-max-line-length": [0, "always"],
  },
};
