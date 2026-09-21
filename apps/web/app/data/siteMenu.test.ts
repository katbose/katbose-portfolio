import { describe, expect, test } from "bun:test";
import { portfolio } from "./portfolio";
import { POST_COLLECTIONS } from "./postRoutes";
import { SITE_MENU, sectionAnchorId } from "./siteMenu";

/**
 * The menu links to two kinds of place: routes, and section anchors on the
 * homepage. These tests cover the half that can be checked without a browser —
 * that the link shapes are valid, and that a `/#<id>` link has a section whose
 * anchor id actually matches.
 *
 * Deliberately not asserted: that every destination exists. `/resume`,
 * `/contact` and `#certifications` are wired ahead of the pages and sections
 * they point at.
 */

const ALL_LINKS = [...SITE_MENU.primary, ...SITE_MENU.more];

describe("SITE_MENU shape", () => {
  test("both groups carry links", () => {
    expect(SITE_MENU.primary.length).toBeGreaterThan(0);
    expect(SITE_MENU.more.length).toBeGreaterThan(0);
  });

  test("every link has a non-empty label", () => {
    for (const link of ALL_LINKS) {
      expect(link.label.trim(), `label for ${link.href}`).not.toBe("");
    }
  });

  test("every href is root-relative, so the menu works from any page", () => {
    // A bare "#id" would resolve against the current path and break on
    // /blogs/<slug>; an absolute URL would leave the site.
    for (const link of ALL_LINKS) {
      expect(link.href.startsWith("/"), `${link.label} -> ${link.href}`).toBe(true);
      expect(link.href.startsWith("//"), `${link.label} -> ${link.href}`).toBe(false);
    }
  });

  test("hrefs are unique, so no destination is listed twice", () => {
    const hrefs = ALL_LINKS.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  test("labels are unique, so two rows cannot read the same", () => {
    const labels = ALL_LINKS.map((l) => l.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  test("a link is in one group or the other, never both", () => {
    const primary = new Set(SITE_MENU.primary.map((l) => l.href));
    for (const link of SITE_MENU.more) {
      expect(primary.has(link.href), `${link.href} is in both groups`).toBe(false);
    }
  });
});

describe("section anchor links", () => {
  const anchorLinks = ALL_LINKS.filter((l) => l.href.startsWith("/#"));

  test("there is at least one anchor link to check", () => {
    expect(anchorLinks.length).toBeGreaterThan(0);
  });

  test("each anchor link uses the /#<id> form, not a bare #id", () => {
    for (const link of anchorLinks) {
      expect(link.href).toMatch(/^\/#[a-z-]+$/);
    }
  });

  test("sectionAnchorId maps every section type to a non-empty id", () => {
    for (const section of portfolio.sections) {
      expect(sectionAnchorId(section.type), `id for "${section.type}"`).toBeTruthy();
    }
  });

  test("the project section resolves to the id the menu links to", () => {
    // The one place label and type disagree: the section type is singular
    // "project", the menu link is "/#projects".
    expect(sectionAnchorId("project")).toBe("projects");
  });

  test("other section types pass through unchanged", () => {
    for (const type of ["experience", "education", "recommendations"]) {
      expect(sectionAnchorId(type)).toBe(type);
    }
  });
});

describe("route links", () => {
  test("collection archives are linked by their real collection name", () => {
    const routeLinks = ALL_LINKS.filter((l) => !l.href.startsWith("/#")).map((l) =>
      l.href.replace("/", ""),
    );
    // Both archives should be reachable from the menu.
    for (const collection of POST_COLLECTIONS) {
      expect(routeLinks, `menu links to /${collection}`).toContain(collection);
    }
  });
});
