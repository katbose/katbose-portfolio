/**
 * Per-route client JavaScript report, with budgets.
 *
 * WHY THIS EXISTS
 * ---------------
 * Next.js 16 no longer prints "First Load JS" in the build table, so the cost of
 * a `"use client"` boundary is invisible unless you go looking for it. It was
 * worth looking: `/` was shipping 828 KB of raw JavaScript against 576 KB for
 * every other route, and inside that gap sat the entire contents of
 * `portfolio.json` — including essay bodies the homepage never renders.
 *
 * That is the kind of regression that arrives one innocent import at a time. So
 * this measures the real thing (the chunks each prerendered document actually
 * references) and fails when a route crosses its budget.
 *
 * HOW TO READ THE NUMBERS
 * -----------------------
 * Sizes are raw bytes on disk, not transfer sizes — real responses are
 * compressed and land roughly 3-4x smaller. Raw is the honest number for
 * *interactivity* cost, because the browser must decompress, parse, and execute
 * all of it regardless of how efficiently it arrived.
 *
 * USAGE
 *   bun run bundle:report          # print the table
 *   bun run bundle:report --check  # also fail if a budget is exceeded
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const APP_DIR = join(import.meta.dir, "..", ".next", "server", "app");
const NEXT_DIR = join(import.meta.dir, "..", ".next");

/**
 * Per-route ceilings for raw client JavaScript, in kilobytes.
 *
 * These are deliberately set a little above the measured baseline rather than at
 * some aspirational number: a budget that is already red teaches everyone to
 * ignore it. Ratchet them down as the server-first refactor lands.
 */
const BUDGETS_KB: Record<string, number> = {
  "/": 900,
  "/thoughts": 650,
  "/[slug]": 650,
};

/** Prerendered documents worth tracking, mapped to their route names. */
const ROUTES: Record<string, string> = {
  "/": "index.html",
  "/thoughts": "thoughts.html",
  "/[slug]": "consumer-design.html",
};

interface RouteReport {
  route: string;
  chunks: number;
  bytes: number;
  budgetKb: number | undefined;
}

/**
 * Collect every `/_next/static/**.js` URL the document references and sum the
 * files on disk.
 *
 * Reading the emitted HTML rather than a build manifest is deliberate: it counts
 * exactly what a browser would fetch for a cold visit, including chunks pulled
 * in by preload hints, and it cannot drift from the shipped output.
 */
function measure(htmlPath: string): { chunks: number; bytes: number } {
  const html = readFileSync(htmlPath, "utf8");
  const refs = new Set(html.match(/\/_next\/static\/[^"'\\)\s]+?\.js/g) ?? []);

  let bytes = 0;
  for (const ref of refs) {
    // "/_next/..." -> "<.next>/..."
    const file = join(NEXT_DIR, ref.replace("/_next/", ""));
    if (existsSync(file)) bytes += Bun.file(file).size;
  }

  return { chunks: refs.size, bytes };
}

const check = process.argv.includes("--check");

if (!existsSync(APP_DIR)) {
  console.error("  no build output found — run `bun run build` first");
  process.exit(1);
}

const reports: RouteReport[] = [];

for (const [route, file] of Object.entries(ROUTES)) {
  const htmlPath = join(APP_DIR, file);
  if (!existsSync(htmlPath)) {
    console.error(`  missing prerendered document for ${route} (${file})`);
    process.exit(1);
  }

  const { chunks, bytes } = measure(htmlPath);
  reports.push({ route, chunks, bytes, budgetKb: BUDGETS_KB[route] });
}

const kb = (bytes: number) => bytes / 1024;
const failures: string[] = [];

console.log("");
console.log("  route          chunks     raw JS     budget");
console.log("  ────────────────────────────────────────────────");

for (const { route, chunks, bytes, budgetKb } of reports) {
  const size = kb(bytes);
  const over = budgetKb !== undefined && size > budgetKb;
  if (over) failures.push(`${route}: ${size.toFixed(1)} KB exceeds ${budgetKb} KB`);

  console.log(
    [
      `  ${route.padEnd(14)}`,
      String(chunks).padStart(4),
      `${size.toFixed(1).padStart(9)} KB`,
      budgetKb === undefined ? "         —" : `${String(budgetKb).padStart(7)} KB`,
      over ? "  OVER" : "",
    ].join(" "),
  );
}

/**
 * The homepage premium over a comparable server-rendered route.
 *
 * This single number is the clearest measure of what the client boundary costs,
 * because both routes share the same framework baseline and layout.
 */
const home = reports.find((r) => r.route === "/");
const thoughts = reports.find((r) => r.route === "/thoughts");
if (home && thoughts) {
  const premium = kb(home.bytes - thoughts.bytes);
  console.log("  ────────────────────────────────────────────────");
  console.log(`  / carries ${premium.toFixed(1)} KB more than /thoughts`);
}
console.log("");

if (check && failures.length > 0) {
  console.error("  client JavaScript budget exceeded:");
  for (const f of failures) console.error(`    ${f}`);
  console.error("");
  console.error("  Either justify the increase and raise the budget in");
  console.error("  scripts/bundle-report.ts, or move the new code behind a");
  console.error("  narrower client boundary.");
  console.error("");
  process.exit(1);
}
