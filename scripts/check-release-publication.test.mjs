import assert from "node:assert/strict";
import { test } from "node:test";
import { findStalledReleases } from "./check-release-publication.mjs";

const candidate = (number) => ({ number, pull_request: {} });
const pull = (labels, merged = "2026-09-19", base = "main") => ({
  merged_at: merged,
  base: { ref: base },
  labels: labels.map((name) => ({ name })),
});

test("stale pending list does not fail after the PR was tagged", () => {
  assert.deepEqual(
    findStalledReleases([[candidate(7)]], () => pull(["autorelease: tagged"])),
    [],
  );
});

test("genuinely pending merged PRs on later pages still fail", () => {
  assert.deepEqual(
    findStalledReleases([[], [candidate(7)]], () => pull(["autorelease: pending"])),
    [7],
  );
});

test("closed unmerged PRs, other branches and issues are excluded", () => {
  const pages = [[{ number: 1 }, candidate(2), candidate(3)]];
  assert.deepEqual(
    findStalledReleases(pages, (number) =>
      number === 2
        ? pull(["autorelease: pending"], null)
        : pull(["autorelease: pending"], "date", "other"),
    ),
    [],
  );
});

test("API errors are surfaced instead of reporting success", () => {
  assert.throws(
    () =>
      findStalledReleases([[candidate(7)]], () => {
        throw new Error("API unavailable");
      }),
    /API unavailable/,
  );
});
