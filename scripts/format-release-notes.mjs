import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const marker = "<!-- release-overview -->";
const end = "<!-- /release-overview -->";

export function formatNotes(body, version, summary, isPr = false) {
  const clean = body.replace(new RegExp(`${marker}[\\s\\S]*?${end}\\s*`), "").trim();
  // Keep release-please's version details untouched: it parses them to publish.
  if (isPr && !clean.includes(`<summary>${version}</summary>`)) {
    throw new Error("Release PR version details not found; refusing to rewrite");
  }
  const bullets = clean
    .split("\n")
    .filter((line) => /^[-*] /.test(line))
    .slice(0, 3);
  const overview =
    summary?.trim() ||
    `## Highlights\n\n${bullets.join("\n") || "Maintenance release. Expand the details for the complete change list."}`;
  return `${marker}\n${overview}\n${end}\n\n${isPr ? clean : `<details>\n<summary>Full changelog and commit links</summary>\n\n${clean}\n\n</details>`}\n`;
}

function gh(...args) {
  return execFileSync("gh", args, { encoding: "utf8" });
}

export function main([kind, id]) {
  if (!["--pr", "--release"].includes(kind) || !id)
    throw new Error("Use --pr NUMBER or --release TAG");
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: standalone Actions script; never cached by Turbo
  const repo = process.env.GITHUB_REPOSITORY || "katbose/katbose-portfolio";
  const isPr = kind === "--pr";
  const endpoint = isPr ? `repos/${repo}/pulls/${id}` : `repos/${repo}/releases/tags/${id}`;
  const record = JSON.parse(gh("api", endpoint));
  const version = isPr
    ? record.body.match(/<summary>(\d+\.\d+\.\d+[^<]*)<\/summary>/)?.[1]
    : id.replace(/^v/, "");
  if (!version || !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version))
    throw new Error("Unsupported release version");
  if (isPr && record.head?.ref !== "release-please--branches--main")
    throw new Error("Not the release-please branch");
  const path = `.github/release-summaries/${version}.md`;
  const summary = existsSync(path) ? readFileSync(path, "utf8") : undefined;
  // Already formatted releases are left intact on a repeated workflow run.
  if (!isPr && record.body.includes(marker)) return;
  const body = formatNotes(record.body, version, summary, isPr);
  const update = isPr ? endpoint : `repos/${repo}/releases/${record.id}`;
  execFileSync("gh", ["api", "--method", "PATCH", update, "--input", "-"], {
    input: JSON.stringify({ body }),
    stdio: ["pipe", "ignore", "inherit"],
  });
  console.log(`Updated ${isPr ? "release PR" : "release"} ${id}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main(process.argv.slice(2));
