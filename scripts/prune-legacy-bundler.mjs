#!/usr/bin/env node
// Prune Next's legacy bundler from this repository's installed `next` package.
// Runs as the root `postinstall`, so fresh installs are pruned automatically.
//
// Bun installs package files as hard links into its global cache. Never rewrite
// an installed file in place: doing so would mutate the cache inode and every
// other checkout linked to it. `replaceHardLinkSafely` writes a new inode,
// unlinks only this checkout, then renames the replacement into place.
//
// Next 16.3.5 resolves several legacy module aliases even on the Turbopack path.
// Their tiny shims must therefore remain resolvable, but their 2.5 MB payload is
// never executed here and can be replaced with an explanatory stub. Standalone
// legacy RSC and source-helper directories are removed as well. Exact paths
// below are filenames owned by Next, not dependencies used by this repository.
//
// This intentionally fails closed. A Next upgrade or layout change must update
// and re-verify this script before installation succeeds; otherwise a moved
// payload could silently return. Set KEEP_LEGACY_BUNDLER=1 only for a temporary
// stock install while investigating an upgrade:
//
//   KEEP_LEGACY_BUNDLER=1 bun install --force
//
// Usage:
//   bun scripts/prune-legacy-bundler.mjs          # prune (idempotent)
//   bun scripts/prune-legacy-bundler.mjs --check  # verify only
//   bun scripts/prune-legacy-bundler.mjs --quiet  # report failures only
import {
  copyFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const CHECK = process.argv.includes("--check");
const QUIET = process.argv.includes("--quiet");
const SUPPORTED_NEXT_VERSIONS = new Set(["16.3.5"]);

// Bun currently hoists Next to the root. Keep the workspace path so a future
// nested install cannot escape pruning when workspace versions diverge.
const NEXT_DIRS = ["node_modules/next", "apps/web/node_modules/next"];
const WEB_MANIFEST = "apps/web/package.json";

/** The payload. Its sibling shims remain so Next's startup aliases resolve. */
const BUNDLE = "dist/compiled/webpack/bundle5.js";
const REQUIRED_SHIMS = [
  "dist/compiled/webpack/webpack-lib.js",
  "dist/compiled/webpack/package.js",
  "dist/compiled/webpack/sources.js",
];
const DROP_DIRS = [
  "dist/compiled/react-server-dom-webpack",
  "dist/compiled/react-server-dom-webpack-experimental",
  "dist/compiled/webpack-sources1",
  "dist/compiled/webpack-sources3",
];

const MARKER = "@katbose/prune-legacy-bundler";
const STUB = `// Replaced by scripts/prune-legacy-bundler.mjs — ${MARKER}
// Next still resolves this legacy module path on its Turbopack startup path,
// which is why this explanatory stub exists instead of deleting the file.
const message =
  "Next's legacy bundler was pruned from this install by " +
  "scripts/prune-legacy-bundler.mjs. Re-install temporarily with " +
  "KEEP_LEGACY_BUNDLER=1 to restore a stock Next package.";

module.exports = () => {
  throw new Error(message);
};
`;

const log = (line) => {
  if (!QUIET) console.log(line);
};
const mb = (value) => `${(value / 1024 / 1024).toFixed(2)} MB`;
const isStubbed = (path) => existsSync(path) && readFileSync(path, "utf8").includes(MARKER);

function bytes(path) {
  if (!existsSync(path)) return 0;
  const stat = statSync(path);
  if (stat.isFile()) return stat.size;
  return readdirSync(path, { withFileTypes: true }).reduce(
    (total, entry) => total + bytes(join(path, entry.name)),
    0,
  );
}

function readNextVersion(nextDir) {
  const manifest = join(nextDir, "package.json");
  if (!existsSync(manifest)) throw new Error(`${nextDir}: missing package.json`);
  const version = JSON.parse(readFileSync(manifest, "utf8")).version;
  if (!SUPPORTED_NEXT_VERSIONS.has(version)) {
    throw new Error(
      `${nextDir}: unsupported Next ${version ?? "version"}; verify its layout and add it to SUPPORTED_NEXT_VERSIONS`,
    );
  }
  return version;
}

function assertKnownLayout(nextDir) {
  const version = readNextVersion(nextDir);
  const required = [BUNDLE, ...REQUIRED_SHIMS];
  const missing = required.filter((path) => !existsSync(join(nextDir, path)));
  if (missing.length > 0) {
    throw new Error(
      `${nextDir} (Next ${version}): unrecognized layout; missing ${missing.join(", ")}`,
    );
  }
  return version;
}

/**
 * Replace one installed file without touching any hard-linked Bun cache inode.
 * The temporary file is created beside the target, so rename stays atomic and
 * on the same volume. A copy fallback handles filesystems that reject rename.
 */
function replaceHardLinkSafely(target, content) {
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temporary, content, { encoding: "utf8", flag: "wx" });

  try {
    unlinkSync(target);
  } catch (error) {
    rmSync(temporary, { force: true });
    throw error;
  }

  try {
    renameSync(temporary, target);
  } catch {
    // `target` was already unlinked, so this creates a fresh inode too.
    copyFileSync(temporary, target);
    rmSync(temporary, { force: true });
  }
}

function inspect(nextDir) {
  const version = assertKnownLayout(nextDir);
  const bundlePath = join(nextDir, BUNDLE);
  const leftovers = DROP_DIRS.filter((path) => existsSync(join(nextDir, path)));
  return { version, bundlePath, stubbed: isStubbed(bundlePath), leftovers };
}

function prune(nextDir) {
  const state = inspect(nextDir);
  let freed = 0;

  if (state.stubbed) {
    log(`prune-legacy-bundler: ${nextDir}/${BUNDLE} already stubbed`);
  } else {
    freed += Math.max(0, bytes(state.bundlePath) - Buffer.byteLength(STUB));
    replaceHardLinkSafely(state.bundlePath, STUB);
    log(`prune-legacy-bundler: stubbed ${nextDir}/${BUNDLE}`);
  }

  for (const path of state.leftovers) {
    const target = join(nextDir, path);
    freed += bytes(target);
    rmSync(target, { recursive: true, force: true });
    log(`prune-legacy-bundler: removed ${nextDir}/${path}`);
  }

  return freed;
}

function expectsNext() {
  if (!existsSync(WEB_MANIFEST)) return false;
  const manifest = JSON.parse(readFileSync(WEB_MANIFEST, "utf8"));
  return typeof manifest.dependencies?.next === "string";
}

function main() {
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: Bun runs this postinstall outside the Turborepo task graph
  if (process.env.KEEP_LEGACY_BUNDLER === "1") {
    log("prune-legacy-bundler: KEEP_LEGACY_BUNDLER=1 — leaving the install stock");
    return 0;
  }

  const installed = NEXT_DIRS.filter((path) => existsSync(path));
  if (installed.length === 0) {
    if (expectsNext()) throw new Error("Next is declared but no installed package was found");
    log("prune-legacy-bundler: Next is not declared — nothing to prune");
    return 0;
  }

  let freed = 0;
  let failed = false;

  for (const nextDir of installed) {
    try {
      if (!CHECK) {
        freed += prune(nextDir);
        continue;
      }

      const state = inspect(nextDir);
      if (!state.stubbed || state.leftovers.length > 0) {
        console.error(`prune-legacy-bundler: ${nextDir} still contains the legacy payload`);
        if (!state.stubbed) console.error(`  ${BUNDLE} is intact`);
        for (const path of state.leftovers) console.error(`  ${path} is present`);
        failed = true;
      } else {
        log(`prune-legacy-bundler: ${nextDir} is pruned (Next ${state.version})`);
      }
    } catch (error) {
      console.error(`prune-legacy-bundler: ${error.message}`);
      failed = true;
    }
  }

  if (!CHECK && freed > 0) log(`prune-legacy-bundler: reclaimed ${mb(freed)}`);
  return failed ? 1 : 0;
}

try {
  process.exitCode = main();
} catch (error) {
  // Fail closed: a successful install must never imply pruning happened when
  // the Next version or layout was not actually recognized.
  console.error(`prune-legacy-bundler: ${error.message}`);
  process.exitCode = 1;
}
