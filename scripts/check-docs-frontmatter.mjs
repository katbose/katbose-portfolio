// Exercise Mintlify's consumer of the patched front-matter / js-yaml dependency.
// Run: node scripts/check-docs-frontmatter.mjs
// No external service, credentials, or additional dependencies are needed.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const common = createRequire(
  new URL("../node_modules/@mintlify/common/package.json", import.meta.url),
);
const frontmatter = common("front-matter");
const parserRequire = createRequire(common.resolve("front-matter"));
const yamlVersion = parserRequire("js-yaml/package.json").version;
const wrapperPath = join(
  dirname(common.resolve("@mintlify/common")),
  "frontmatter/parseFrontmatter.js",
);
const { parseFrontmatter, hasFrontmatter } = await import(pathToFileURL(wrapperPath).href);

assert.match(yamlVersion, /^4\./, "front-matter must resolve the migrated js-yaml 4 parser");

// Expected output was checked against the original front-matter 4 / js-yaml 3
// implementation before removing its argparse 1 / sprintf-js dependency chain.
const fixtures = [
  {
    name: "plain text",
    input: "plain text\nsecond line",
    expected: { attributes: {}, body: "plain text\nsecond line", bodyBegin: 1 },
    hasFrontmatter: false,
  },
  {
    name: "empty metadata",
    input: "---\n---\nbody",
    expected: { attributes: {}, body: "body", bodyBegin: 3, frontmatter: "" },
    hasFrontmatter: true,
  },
  {
    name: "arrays, booleans, numbers and multiline text",
    input:
      "---\ntitle: Example\ncount: 12\nflag: true\ntags: [web, docs]\n" +
      "summary: |\n  First line\n  Second line\n---\n# Body\n",
    expected: {
      attributes: {
        title: "Example",
        count: 12,
        flag: true,
        tags: ["web", "docs"],
        summary: "First line\nSecond line\n",
      },
      body: "# Body\n",
      bodyBegin: 10,
      frontmatter:
        "title: Example\ncount: 12\nflag: true\ntags: [web, docs]\n" +
        "summary: |\n  First line\n  Second line",
    },
    hasFrontmatter: true,
  },
  {
    name: "Windows line endings",
    input: "---\r\ntitle: Windows\r\n---\r\nbody\r\n",
    expected: {
      attributes: { title: "Windows" },
      body: "body\r\n",
      bodyBegin: 4,
      frontmatter: "title: Windows",
    },
    hasFrontmatter: true,
  },
  {
    name: "alternate delimiter",
    input: "= yaml =\ntitle: Alternate\n= yaml =\nbody",
    expected: {
      attributes: { title: "Alternate" },
      body: "body",
      bodyBegin: 4,
      frontmatter: "title: Alternate",
    },
    hasFrontmatter: true,
  },
  {
    name: "YAML end marker",
    input: "---\ntitle: End marker\n...\nbody",
    expected: {
      attributes: { title: "End marker" },
      body: "body",
      bodyBegin: 4,
      frontmatter: "title: End marker",
    },
    hasFrontmatter: true,
  },
  {
    name: "byte order mark",
    input: "\ufeff---\ntitle: BOM\n---\nbody",
    expected: {
      attributes: { title: "BOM" },
      body: "body",
      bodyBegin: 4,
      frontmatter: "title: BOM",
    },
    hasFrontmatter: true,
  },
  {
    name: "dates, aliases and merge keys",
    input:
      "---\nwhen: 2026-10-08\nbase: &base\n  title: Parent\n" +
      "merged:\n  <<: *base\n  extra: child\n---\nbody",
    expected: {
      attributes: {
        when: new Date("2026-10-08T00:00:00.000Z"),
        base: { title: "Parent" },
        merged: { title: "Parent", extra: "child" },
      },
      body: "body",
      bodyBegin: 9,
      frontmatter:
        "when: 2026-10-08\nbase: &base\n  title: Parent\n" + "merged:\n  <<: *base\n  extra: child",
    },
    hasFrontmatter: true,
  },
  {
    name: "quoted identifiers with leading zeroes",
    input: '---\nidentifier: "0128"\n---\nbody',
    expected: {
      attributes: { identifier: "0128" },
      body: "body",
      bodyBegin: 4,
      frontmatter: 'identifier: "0128"',
    },
    hasFrontmatter: true,
  },
];

for (const fixture of fixtures) {
  assert.deepEqual(frontmatter(fixture.input), fixture.expected, fixture.name);
  assert.deepEqual(parseFrontmatter(fixture.input), fixture.expected, fixture.name);
  assert.equal(frontmatter.test(fixture.input), fixture.hasFrontmatter, fixture.name);
  assert.equal(hasFrontmatter(fixture.input), fixture.hasFrontmatter, fixture.name);
}

for (const input of [
  "---\nbroken: [\n---\nbody",
  "---\nduplicate: one\nduplicate: two\n---\nbody",
]) {
  assert.throws(() => frontmatter(input), /YAMLException/);
  assert.throws(() => parseFrontmatter(input), /YAMLException/);
}

// v4 load() stays safe even if a future consumer sets the old allowUnsafe flag.
for (const tag of [
  "!!js/function >\n  function () { return 1; }",
  "!!js/regexp /foo/",
  '!!js/undefined ""',
]) {
  const input = `---\nunsafe: ${tag}\n---\nbody`;
  assert.throws(() => frontmatter(input), /unknown tag/);
  assert.throws(() => frontmatter(input, { allowUnsafe: true }), /unknown tag/);
  assert.throws(() => parseFrontmatter(input), /unknown tag/);
}

const files = execFileSync("git", ["ls-files", "-z", "--", "apps/docs"], {
  cwd: root,
  encoding: "utf8",
})
  .split("\0")
  .filter((file) => /\.mdx?$/.test(file));
assert.ok(files.length > 0, "No tracked documentation pages found");

for (const file of files) {
  const input = readFileSync(join(root, file), "utf8");
  const result = parseFrontmatter(input);
  assert.deepEqual(result, frontmatter(input), file);
  assert.equal(hasFrontmatter(input), frontmatter.test(input), file);
  assert.equal(
    input
      .split("\n")
      .slice(result.bodyBegin - 1)
      .join("\n"),
    result.body,
    file,
  );
  if (file.endsWith(".mdx")) {
    assert.equal(typeof result.attributes.title, "string", `${file}: title missing`);
    assert.equal(typeof result.attributes.description, "string", `${file}: description missing`);
    assert.ok(result.body.length > 0, `${file}: body missing`);
  }
}

console.log(
  `Frontmatter: js-yaml ${yamlVersion} passes ${fixtures.length} contract fixtures and`,
  `${files.length} tracked docs through Mintlify's wrapper; malformed YAML and unsafe tags reject.`,
);
