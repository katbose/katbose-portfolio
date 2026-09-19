import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const marker = "<!-- release-overview -->";
const end = "<!-- /release-overview -->";
const credits = "<!-- release-credits -->";
const creditsEnd = "<!-- /release-credits -->";
const legacyDetails = "<details>\n<summary>Full changelog and commit links</summary>";

function sourceNotes(body) {
  const saved = body.match(/<!-- release-source\n([\s\S]*?)\n-->/);
  if (saved) body = saved[1];
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
  if (url.origin === "https://github.com" && url.pathname.startsWith(`/${repo}/releases/tag/`))
    return undefined;
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

export function payloadLayout(body) {
  const headings = {
    Features: "🚀 Features",
    "Bug Fixes": "🐛 Bug Fixes",
    "✨ Features": "🚀 Features",
    "🛠 Fixes": "🐛 Bug Fixes",
    "🏗 Architecture": "🛠 Refactors",
    "📖 Documentation": "📚 Documentation",
    "🧪 Verification": "🧪 Tests",
    "⚙️ Automation": "⚙️ CI",
  };
  return body
    .split("\n")
    .map((line) => {
      if (line.startsWith("## [") && !line.startsWith("## [v"))
        line = line.replace("## [", "## [v");
      if (line.startsWith("### ")) line = `### ${headings[line.slice(4)] ?? line.slice(4)}`;
      if (/^[-*] /.test(line)) line = line.replace(/^([-*] )\*\*([^*]+):\*\* /, "$1$2: ");
      return line;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

export function formatNotes(body, version, isPr = false, metadata = {}) {
  const clean = sourceNotes(body);
  let notes = clean;
  if (isPr) {
    const opening = `<details><summary>${version}</summary>`;
    const start = clean.indexOf(opening);
    const end = clean.lastIndexOf("</details>");
    if (start < 0 || end < start)
      throw new Error("Release PR version details not found; refusing to rewrite");
    notes = clean.slice(start + opening.length, end).trim();
    if (clean.includes("-->")) throw new Error("Release source contains a comment terminator");
  }
  const contributors = metadata.contributors?.length
    ? "### 🤝 Contributors\n\n" +
      metadata.contributors
        .map((login) => {
          const name = metadata.names?.[login];
          return `* ${name ? `${name.replace(/[[\]<>*_]/g, "")} (` : ""}[@${login}](https://github.com/${login})${name ? ")" : ""}`;
        })
        .join("\n")
    : "";
  const footer = contributors ? `\n\n${credits}\n${contributors}\n${creditsEnd}` : "";
  // Release Please parses the original source; GitHub renders only the notes above it.
  const source = isPr ? `\n\n<!-- release-source\n${clean}\n-->` : "";
  return `${payloadLayout(notes)}${footer}${source}\n`;
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
  if (!isPr && !/^## \[/.test(sourceNotes(record.body))) {
    const releases = JSON.parse(gh("api", `repos/${repo}/releases?per_page=100`));
    const previous = releases
      .filter(
        (release) =>
          !release.draft && !release.prerelease && release.published_at < record.published_at,
      )
      .sort((a, b) => b.published_at.localeCompare(a.published_at))[0];
    const link = previous
      ? `https://github.com/${repo}/compare/${previous.tag_name}...${id}`
      : record.html_url;
    record.body = `## [${version}](${link}) (${record.published_at.slice(0, 10)})\n\n${sourceNotes(record.body)}`;
  }
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
  } else if (!isPr) {
    const pages = JSON.parse(
      gh(
        "api",
        `repos/${repo}/commits?sha=${encodeURIComponent(id)}&per_page=100`,
        "--paginate",
        "--slurp",
      ),
    );
    contributors = collectContributors(pages.map((commits) => ({ commits })));
  }
  const names = Object.fromEntries(
    contributors.map((login) => [login, JSON.parse(gh("api", `users/${login}`)).name]),
  );
  const body = formatNotes(record.body, version, isPr, {
    names,
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
