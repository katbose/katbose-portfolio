import { expect, isIgnorable, test } from "./fixtures";

test("hostnames in application errors do not hide failures", () => {
  for (const host of [
    "cdn.simpleicons.org",
    "githubusercontent.com",
    "wikimedia.org",
    "gstatic.com",
    "googleusercontent.com",
    "nith.ac.in",
    "remix.re",
  ]) {
    expect(isIgnorable(`TypeError: failed to render ${host}`)).toBe(false);
    expect(isIgnorable(`TypeError: https://${host}.example.com/component`)).toBe(false);
  }
});

test("blocked transport diagnostics remain ignorable", () => {
  expect(isIgnorable("Failed to load resource: net::ERR_FAILED")).toBe(true);
  expect(isIgnorable("net::ERR_NAME_NOT_RESOLVED")).toBe(true);
});
