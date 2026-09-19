import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const marker = "<!-- release-overview -->";
const end = "<!-- /release-overview -->";
const credits = "<!-- release-credits -->";
const creditsEnd = "<!-- /release-credits -->";
const legacyDetails = "<details>\n<summary>Full changelog and commit links</summary>";

function sourceNotes(body) {
  let clean = body
    .replaceAll("\r\n", "\n")
    .replace(new RegExp(`${marker}[\\s\\S]*?${end}\\s*`), "")
    .replace(new RegExp(`${credits}[\\s\\S]*?${creditsEnd}\\s*`), "")
    .trim();
  // Migrate only the exact wrapper emitted by the previous formatter.
  if (clean.startsWith(legacyDetails) && clean.endsWith("</details>")) {
    clean = clean.slice(legacyDetails.length, -"</details>".length).trim();
  }
  return clean;
}

export function releaseComparison(body, repo) {
  const match = sourceNotes(body).match(/^## \[[^\]]+\]\((https:\/\/github\.com\/[^\s)]+)\)/m);
  if (!match) return undefined;
  const url = new URL(match[1]);
  const prefix = `/${repo}/compare/`;
  if (url.origin !== "https://github.com" || !url.pathname.startsWith(prefix))
    throw new Error("Release comparison must belong to this repository");
  const [base, head, extra] = url.pathname.slice(prefix.length).split("...");
  if (!base || !head || extra || url.search || url.hash)
    throw new Error("Unsupported release comparison");
  return { url: url.href, base };
}

export function collectContributors(pages) {
  return [
    ...new Set(
      pages
        .flatMap((page) => page.commits ?? [])
        .filter((commit) => commit.author?.type === "User")
        .map((commit) => commit.author.login)
        .filter((login) => /^[a-z\d](?:[a-z\d-]{0,38})$/i.test(login)),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export function formatNotes(body, version, isPr = false, metadata = {}) {
  const clean = sourceNotes(body);
  // Keep Release Please's generated PR body intact: it parses this to publish.
  if (isPr && !clean.includes(`<summary>${version}</summary>`))
    throw new Error("Release PR version details not found; refusing to rewrite");
  const links = metadata.comparison
    ? `**Full comparison:** [View all changes](${metadata.comparison})`
    : "";
  const contributors = metadata.contributors?.length
    ? `### 🤝 Contributors\n\n${metadata.contributors.map((login) => `- [@${login}](https://github.com/${login})`).join("\n")}`
    : "";
  if (isPr) {
    const intro = [links, contributors].filter(Boolean).join("\n\n");
    return `${intro ? `${marker}\n${intro}\n${end}\n\n` : ""}${clean}\n`;
  }
  const footer = [contributors, links].filter(Boolean).join("\n\n");
  return `${clean}${footer ? `\n\n${credits}\n${footer}\n${creditsEnd}` : ""}\n`;
}

function gh(...args) {
  return execFileSync("gh", args, { encoding: "utf8" });
}

export function main([kind, id, option]) {
  if (!["--pr", "--release"].includes(kind) || !id || (option && option !== "--preview"))
    throw new Error("Use --pr NUMBER or --release TAG, optionally followed by --preview");
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
  const comparison = releaseComparison(record.body, repo);
  let contributors = [];
  if (comparison) {
    // A release PR's future tag does not exist yet; use its current head SHA.
    const target = isPr ? record.head.sha : id;
    const range = `${encodeURIComponent(comparison.base)}...${encodeURIComponent(target)}`;
    const pages = JSON.parse(
      gh("api", `repos/${repo}/compare/${range}?per_page=100`, "--paginate", "--slurp"),
    );
    contributors = collectContributors(pages);
  }
  const body = formatNotes(record.body, version, isPr, {
    comparison:
      comparison && isPr
        ? `https://github.com/${repo}/compare/${encodeURIComponent(comparison.base)}...${record.head.sha}`
        : comparison?.url,
    contributors,
  });
  if (option === "--preview") {
    console.log(body);
    return;
  }
  if (body === record.body) return;
  const update = isPr ? endpoint : `repos/${repo}/releases/${record.id}`;
  execFileSync("gh", ["api", "--method", "PATCH", update, "--input", "-"], {
    input: JSON.stringify({ body }),
    stdio: ["pipe", "ignore", "inherit"],
  });
  console.log(`Updated ${isPr ? "release PR" : "release"} ${id}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main(process.argv.slice(2));
