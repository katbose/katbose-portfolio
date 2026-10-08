// Verify the pinned depth-guard backport through Mintlify's actual consumers.
// The exact npm artifact was compared with upstream braces 3.0.3, its signatures
// and provenance verified, and all 799 upstream/backport tests run separately.
// This check proves the advisory's attack is rejected and docs globbing works;
// the unfiltered bun audit remains the advisory-status check.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";

const common = createRequire(
  new URL("../node_modules/@mintlify/common/package.json", import.meta.url),
);
const preview = createRequire(
  new URL("../node_modules/@mintlify/previewing/package.json", import.meta.url),
);
const tailwind = createRequire(common.resolve("tailwindcss-v3"));
const micromatch = tailwind("micromatch");
const fastGlob = tailwind("fast-glob");
const consumers = [
  ["Tailwind / micromatch", createRequire(tailwind.resolve("micromatch"))],
  [
    "Tailwind / fast-glob / micromatch",
    createRequire(createRequire(tailwind.resolve("fast-glob")).resolve("micromatch")),
  ],
  ["Tailwind / chokidar", createRequire(tailwind.resolve("chokidar"))],
  ["Mintlify preview / chokidar", createRequire(preview.resolve("chokidar"))],
];

const nested = (depth, open = "{", close = "}") => `${open.repeat(depth)}a,b${close.repeat(depth)}`;
const tooDeep = (error) =>
  (error instanceof SyntaxError || error instanceof RangeError) &&
  /exceeds max depth/.test(error.message);

function nestedAst(depth) {
  const root = { type: "root", nodes: [] };
  let parent = root;
  for (let i = 0; i < depth; i++) {
    const child = {
      type: "brace",
      nodes: [],
      commas: 1,
      ranges: 0,
      open: true,
      close: true,
      parent,
    };
    parent.nodes.push(child);
    parent = child;
  }
  parent.nodes.push({ type: "text", value: "a" });
  return root;
}

function checkGuards(braces) {
  // Both inputs are below the existing 10,000-character input cap. Upstream
  // crashes while recursively compiling/expanding these deeply nested ASTs.
  for (const pattern of [nested(4000), nested(4000, "(", ")")]) {
    for (const method of ["parse", "compile", "expand", "stringify"]) {
      assert.throws(() => braces[method](pattern), tooDeep, `${method} must reject deep input`);
    }
    assert.throws(() => braces(pattern), tooDeep);
    assert.throws(() => braces(pattern, { expand: true }), tooDeep);
  }
  for (const method of ["parse", "compile", "expand", "stringify"]) {
    assert.doesNotThrow(() => braces[method](nested(100)));
    for (const maxDepth of [101, 100000, Infinity, NaN, "100000"]) {
      assert.throws(() => braces[method](nested(101), { maxDepth }), tooDeep);
    }
    assert.throws(() => braces[method](nested(2), { maxDepth: 1.5 }), tooDeep);
    assert.throws(() => braces[method]("abc", { maxDepth: -1 }), /maxDepth must be non-negative/);
    assert.throws(
      () => braces[method]("a".repeat(10001), { maxLength: NaN }),
      /maxLength must be a non-negative number/,
    );
    assert.throws(
      () => braces[method]("a".repeat(10001), { maxLength: Infinity }),
      /exceeds max characters/,
    );
    // Limits are snapshotted before parsing; stateful getters cannot disable
    // a checked finite limit by replacing it with NaN on the next read.
    let reads = 0;
    const options = {
      get maxDepth() {
        return ++reads === 1 ? 1 : NaN;
      },
    };
    const input = method === "parse" ? nested(2) : braces.parse(nested(2));
    assert.throws(() => braces[method](input, options), tooDeep);
    assert.equal(reads, 1);
  }
  for (const method of ["compile", "expand", "stringify"]) {
    assert.throws(() => braces[method](nestedAst(4000)), tooDeep);
    const cycle = { type: "root", nodes: [] };
    cycle.nodes.push(cycle);
    assert.throws(() => braces[method](cycle), tooDeep);
  }
  const paren = { type: "paren", nodes: [{ type: "text", value: "a" }] };
  paren.parent = paren;
  assert.throws(
    () => braces.expand({ type: "root", nodes: [paren] }),
    /parent chain contains a cycle/,
  );
  assert.deepEqual(braces("docs/{guide,api}/**/*.{md,mdx}"), ["docs/(guide|api)/**/*.(md|mdx)"]);
  assert.deepEqual(braces.expand("a/{b,{c,d}}/{01..03..2}"), [
    "a/b/01",
    "a/b/03",
    "a/c/01",
    "a/c/03",
    "a/d/01",
    "a/d/03",
  ]);
  assert.deepEqual(braces.expand("{a,a,}", { nodupes: true, noempty: true }), ["a"]);
  assert.deepEqual(braces.expand("x/\\{a,b}/y", { keepEscaping: true }), ["x/\\{a,b}/y"]);
  assert.throws(() => braces.expand("{1..10000}"), /exceeds range limit/);
}

function waitFor(watcher, event, predicate = () => true) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => finish(new Error(`Watcher timed out waiting for ${event}`)),
      10000,
    );
    const onEvent = (...args) => {
      if (predicate(...args)) finish(null, args);
    };
    const onError = (error) => finish(error);
    const finish = (error, result) => {
      clearTimeout(timeout);
      watcher.off(event, onEvent);
      watcher.off("error", onError);
      if (error) reject(error);
      else resolve(result);
    };
    watcher.on(event, onEvent);
    watcher.on("error", onError);
  });
}

async function checkConsumers() {
  const fixture = await mkdtemp(join(tmpdir(), "katbose-braces-check-"));
  const watchers = [];
  const normalize = (path) => path.replaceAll("\\", "/");
  try {
    for (const directory of ["guide", "api", "reference"]) await mkdir(join(fixture, directory));
    const files = {
      "guide/intro.mdx": '<div class="text-green-500"></div>',
      "api/methods.md": '<div class="font-bold"></div>',
      "reference/types.mdx": '<div class="px-4"></div>',
      "reference/ignored.txt": '<div class="text-red-500"></div>',
    };
    for (const [path, content] of Object.entries(files))
      await writeFile(join(fixture, path), content);
    const pattern = "{guide,{api,reference}}/**/*.{md,mdx}";
    const expected = ["api/methods.md", "guide/intro.mdx", "reference/types.mdx"];
    assert.deepEqual((await fastGlob(pattern, { cwd: fixture })).sort(), expected);
    assert.deepEqual(micromatch(Object.keys(files), pattern).sort(), expected);
    assert.equal(micromatch.parse(pattern).length, 1);
    assert.throws(() => micromatch.parse(nested(4000)), tooDeep);
    assert.throws(() => micromatch.braceExpand(nested(4000)), tooDeep);
    // Tailwind reads actual files through its installed fast-glob dependency.
    const result = await common("postcss")([
      common("tailwindcss-v3")({
        content: [normalize(join(fixture, pattern))],
        corePlugins: { preflight: false },
      }),
    ]).process("@tailwind utilities;", { from: undefined });
    const selectors = [];
    result.root.walkRules((rule) => selectors.push(rule.selector));
    for (const selector of [".text-green-500", ".font-bold", ".px-4"]) {
      assert.ok(
        selectors.includes(selector),
        `Tailwind must discover ${selector} through brace globs`,
      );
    }
    assert.ok(!selectors.includes(".text-red-500"), "Tailwind must exclude unmatched files");
    assert.equal(result.warnings().length, 0);
    // Watch both actual chokidar installations with their default native
    // watcher settings; nested brace patterns must discover and track files.
    for (const [name, from] of [
      ["Tailwind", tailwind],
      ["Mintlify preview", preview],
    ]) {
      const discovered = [];
      const watcher = from("chokidar").watch(pattern, { cwd: fixture });
      watchers.push(watcher);
      watcher.on("add", (path) => discovered.push(normalize(path)));
      await waitFor(watcher, "ready");
      assert.deepEqual(discovered.sort(), expected, `${name} watcher initial discovery`);
      const addedPath = `${name === "Tailwind" ? "guide" : "api"}/added.mdx`;
      const added = waitFor(watcher, "add", (path) => normalize(path) === addedPath);
      await writeFile(join(fixture, addedPath), '<div class="italic">Added</div>');
      await added;
      const changed = waitFor(watcher, "change", (path) => normalize(path) === addedPath);
      await writeFile(
        join(fixture, addedPath),
        '<div class="italic">Changed content after ready</div>',
      );
      await changed;
      await watcher.close();
      await rm(join(fixture, addedPath));
    }
  } finally {
    await Promise.all(watchers.map((watcher) => watcher.close()));
    // Delete only the exact temporary fixture directory created above.
    assert.equal(dirname(fixture), tmpdir());
    assert.ok(basename(fixture).startsWith("katbose-braces-check-"));
    await rm(fixture, { recursive: true, force: true });
  }
}

try {
  const checked = new Set();
  for (const [name, from] of consumers) {
    const manifest = from("braces/package.json");
    assert.equal(
      manifest.name,
      "@dieub/braces-depth-guard",
      `${name} must resolve the verified backport`,
    );
    assert.equal(
      manifest.version,
      "3.0.3-pn.3",
      `${name} must resolve the exact reviewed artifact`,
    );
    const resolved = from.resolve("braces");
    if (!checked.has(resolved)) {
      checkGuards(from("braces"));
      checked.add(resolved);
    }
  }
  console.log(
    "Braces: all four consumer paths resolve pn.3; deep inputs, depth options, AST cycles, and ordinary patterns pass.",
  );
  await checkConsumers();
  console.log(
    "Docs globbing: micromatch, fast-glob, Tailwind 3 CSS, and both native chokidar watchers pass.",
  );
} catch (error) {
  console.error(`Braces backport check failed: ${error.message}`);
  process.exitCode = 1;
}
