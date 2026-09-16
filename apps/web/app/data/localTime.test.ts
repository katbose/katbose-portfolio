import { describe, expect, test } from "bun:test";
import { formatLocalTime, MARKDOWN_TIME_TOKEN, stampMarkdown } from "./localTime";

describe("local time", () => {
  test("uses the configured timezone, including across midnight", () => {
    const date = new Date("2026-09-15T20:00:00Z");
    expect(formatLocalTime("Asia/Kolkata", date)).toBe("01:30:00");
    expect(formatLocalTime("Etc/UTC", date)).toBe("20:00:00");
  });

  test("fills only the generated timestamp slot, leaving prose untouched", () => {
    const template = `# Person\nnoun • ${MARKDOWN_TIME_TOKEN} UTC\nMeet at 12:34:56.\n`;
    expect(stampMarkdown(template, "20:00:00")).toBe(
      "# Person\nnoun • 20:00:00 UTC\nMeet at 12:34:56.\n",
    );
    expect(stampMarkdown("# No clock\n", "20:00:00")).toBe("# No clock\n");
  });
});
