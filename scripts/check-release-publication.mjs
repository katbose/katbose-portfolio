import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export function findStalledReleases(pages, readPull) {
  const stalled = [];
  for (const issue of pages.flat()) {
    if (!issue.pull_request) continue;
    // List/search results can lag behind label writes. Confirm the current PR.
    const pull = readPull(issue.number);
    if (
      pull.merged_at &&
      pull.base.ref === "main" &&
      pull.labels.some((label) => label.name === "autorelease: pending")
    )
      stalled.push(issue.number);
  }
  return stalled;
}

export function main() {
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: GitHub Actions supplies the repository.
  const repo = process.env.GH_REPO;
  if (!repo) throw new Error("GH_REPO is required");
  const api = (...args) => JSON.parse(execFileSync("gh", ["api", ...args], { encoding: "utf8" }));
  const pages = api(
    `repos/${repo}/issues?state=closed&labels=autorelease%3A%20pending&per_page=100`,
    "--paginate",
    "--slurp",
  );
  const stalled = findStalledReleases(pages, (number) => api(`repos/${repo}/pulls/${number}`));
  if (stalled.length)
    throw new Error(
      `Merged release PRs remain pending: ${stalled.join(", ")}. Inspect Release Please warnings.`,
    );
  console.log("No merged release PRs remain pending.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
