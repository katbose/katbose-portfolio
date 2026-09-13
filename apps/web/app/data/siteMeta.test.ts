import { describe, expect, test } from "bun:test";
import type { PortfolioData } from "../components/sections/registry";
import portfolioJson from "./portfolio.json";
import { OWNER_NAME, SITE_DESCRIPTION, SITE_URL } from "./siteMeta";

/**
 * Characterization tests for the site identity derived from `portfolio.json`.
 *
 * These exist because route metadata (layout, sitemap, robots) used to hardcode
 * the owner's name and URL, which could silently disagree with the content
 * file. Expectations are read back out of the JSON so content stays editable.
 */

const portfolio = portfolioJson as unknown as PortfolioData;
const hero = portfolio.sections.find((section) => section.type === "hero");

describe("SITE_URL", () => {
  test("matches meta.siteUrl", () => {
    expect(SITE_URL).toBe(portfolio.meta.siteUrl.replace(/\/$/, ""));
  });

  test("has no trailing slash, so it is safe to concatenate", () => {
    expect(SITE_URL.endsWith("/")).toBe(false);
  });

  test("is an absolute https url", () => {
    const url = new URL(SITE_URL);
    expect(url.protocol).toBe("https:");
    expect(url.hostname.length).toBeGreaterThan(0);
  });
});

describe("OWNER_NAME", () => {
  test("comes from the hero section", () => {
    expect(hero).toBeDefined();
    if (hero) {
      expect(OWNER_NAME).toBe(hero.data.name);
    }
  });

  test("is non-empty, so page titles are never blank", () => {
    expect(OWNER_NAME.length).toBeGreaterThan(0);
  });
});

describe("SITE_DESCRIPTION", () => {
  test("is non-empty, so the meta description tag is never blank", () => {
    expect(SITE_DESCRIPTION.length).toBeGreaterThan(0);
  });

  test("strips inline bold markers", () => {
    expect(SITE_DESCRIPTION).not.toContain("**");
  });

  test("strips markdown link syntax but keeps the link text", () => {
    expect(SITE_DESCRIPTION).not.toContain("](");
    expect(SITE_DESCRIPTION).not.toMatch(/\[[^\]]+\]\(/);
  });

  test("is derived from the first hero intro line", () => {
    expect(hero).toBeDefined();
    const firstIntro = hero?.data.intro?.[0];
    expect(firstIntro).toBeDefined();
    if (firstIntro) {
      // Every word of visible prose in the source line survives stripping.
      const plain = firstIntro
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/\*\*/g, "")
        .trim();
      expect(SITE_DESCRIPTION).toBe(plain);
    }
  });

  test("has no leading or trailing whitespace", () => {
    expect(SITE_DESCRIPTION).toBe(SITE_DESCRIPTION.trim());
  });
});
