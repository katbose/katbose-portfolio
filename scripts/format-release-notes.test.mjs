import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { collectContributors, formatNotes, releaseComparison } from "./format-release-notes.mjs";

test("release PR retains parseable version details and is idempotent", () => {
  const original =
    "Header\n<details><summary>0.2.0</summary>\n\n### Features\n* Feature ([abc](https://example.com))\n</details>";
  const once = formatNotes(original, "0.2.0", true);
  assert.ok(once.endsWith(`${original}\n`));
  assert.equal(formatNotes(once, "0.2.0", true), once);
  assert.throws(() => formatNotes(original, "0.3.0", true));
});
test("published changes and breaking instructions stay visible without duplicated highlights", () => {
  const original =
    "## [0.2.1](https://github.com/owner/repo/compare/v0.2.0...v0.2.1)\n\n### 🐛 Bug Fixes\n\n* Fix ([abc](https://example.com))\n\n### ⚠️ BREAKING CHANGES\n\nRun the migration before upgrading.";
  const metadata = {
    comparison: "https://github.com/owner/repo/compare/v0.2.0...v0.2.1",
    contributors: ["katbose"],
  };
  const result = formatNotes(original, "0.2.1", false, metadata);
  assert.ok(result.startsWith(original));
  assert.ok(!result.includes("<details>"));
  assert.equal(result.match(/Fix \(/g).length, 1);
  assert.ok(result.includes("### 🤝 Contributors\n\n- [@katbose](https://github.com/katbose)"));
  assert.ok(result.includes("**Full comparison:**"));
  assert.equal(formatNotes(result, "0.2.1", false, metadata), result);
});

test("legacy release migration removes only the formatter wrapper", () => {
  const source =
    "### Fixes\n\n* Original [commit](https://example.com)\n\n<details>\n<summary>Migration example</summary>\n\nKeep this custom detail.\n\n</details>";
  const legacy =
    "<!-- release-overview -->\n## Highlights\n\n* Duplicated old highlight\n<!-- /release-overview -->\n\n<details>\n<summary>Full changelog and commit links</summary>\n\n" +
    source +
    "\n\n</details>\n";
  const migrated = formatNotes(legacy, "0.2.1");
  assert.ok(migrated.endsWith(`${source}\n`));
  assert.ok(!migrated.includes("Duplicated old highlight"));
  assert.ok(!migrated.includes("Full changelog and commit links"));
  assert.equal(formatNotes(migrated, "0.2.1"), migrated);
});

test("PR contributor updates preserve the generated version body exactly", () => {
  const original =
    "Header\n<details><summary>0.2.2</summary>\n\n### Fixes\n\n* Fix (#6)\n</details>\nFooter";
  const once = formatNotes(original, "0.2.2", true, { contributors: ["alice"] });
  const updated = formatNotes(once, "0.2.2", true, { contributors: ["bob"] });
  assert.ok(updated.endsWith(`${original}\n`));
  assert.ok(!updated.includes("alice"));
  assert.ok(updated.includes("@bob"));
});

test("contributors include every page, deduplicate authors and omit bots and unlinked accounts", () => {
  assert.deepEqual(
    collectContributors([
      {
        commits: [
          { author: { login: "bob", type: "User" } },
          { author: null },
          { author: { login: "automation", type: "Bot" } },
        ],
      },
      {
        commits: [
          { author: { login: "alice", type: "User" } },
          { author: { login: "bob", type: "User" } },
        ],
      },
    ]),
    ["alice", "bob"],
  );
});

test("comparison comes from the generated header and must belong to this repository", () => {
  const notes = "## [0.2.1](https://github.com/owner/repo/compare/v0.2.0...v0.2.1) (2026-09-18)";
  assert.deepEqual(releaseComparison(notes, "owner/repo"), {
    url: "https://github.com/owner/repo/compare/v0.2.0...v0.2.1",
    base: "v0.2.0",
  });
  assert.throws(() => releaseComparison(notes, "another/repo"));
  assert.equal(releaseComparison("First release without a comparison", "owner/repo"), undefined);
});

test("empty contributor metadata adds no empty sections", () => {
  const original = "### Documentation\n\n* Updated the guide.";
  assert.equal(formatNotes(original, "0.2.1", false, { contributors: [] }), `${original}\n`);
});

test("combined release branch has a componentless publication identity", () => {
  const config = JSON.parse(
    readFileSync(new URL("../release-please-config.json", import.meta.url), "utf8"),
  );
  const root = config.packages["."];
  assert.deepEqual(Object.keys(config.packages), ["."]);
  assert.equal(config["separate-pull-requests"], false);
  // biome-ignore lint/suspicious/noTemplateCurlyInString: Release Please expands this literal placeholder.
  assert.equal(config["group-pull-request-title-pattern"], "chore(release): v${version}");
  assert.equal(root["package-name"], "", "combined branch must not expect a package component");
  assert.equal(root["include-component-in-tag"], false);
  assert.equal(root["pull-request-title-pattern"], undefined);
});
