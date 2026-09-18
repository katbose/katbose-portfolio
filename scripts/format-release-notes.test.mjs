import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { formatNotes } from "./format-release-notes.mjs";

test("release PR retains parseable version details and is idempotent", () => {
  const original =
    "Header\n<details><summary>0.2.0</summary>\n\n### Features\n* Feature ([abc](https://example.com))\n</details>";
  const once = formatNotes(original, "0.2.0", "## At a glance\n\nUseful summary", true);
  assert.ok(once.endsWith(`${original}\n`));
  assert.equal(formatNotes(once, "0.2.0", "## At a glance\n\nUseful summary", true), once);
  assert.throws(() => formatNotes(original, "0.3.0", "Summary", true));
});
test("release overview is bounded while full changelog preserves every link", () => {
  const original = "* One\n* Two\n* Three\n* Four [commit](https://example.com)";
  const result = formatNotes(original, "0.2.0");
  assert.ok(result.includes("<summary>Full changelog and commit links</summary>"));
  assert.ok(result.includes(original));
  assert.ok(!result.split("<!-- /release-overview -->")[0].includes("Four"));
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
