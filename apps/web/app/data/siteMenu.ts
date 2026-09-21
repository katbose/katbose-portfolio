/**
 * The site navigation menu.
 *
 * Two groups: `primary` links are shown directly, `more` links sit behind a
 * "More" divider in the same menu. Order within each array is display order.
 *
 * Section links use an absolute-from-root hash (`/#experience`) rather than a
 * bare `#experience`, so they resolve from anywhere — the archives and post
 * pages route to the homepage and then scroll, not to a missing in-page anchor.
 * The matching `id`s are attached by `SectionShell` (see `sectionAnchorId`).
 *
 * Some targets do not exist yet and that is intentional: `/#certifications` has
 * no section, `/resume` has no route. They are wired now so the menu is
 * complete; the destinations get built later.
 */

export interface SiteMenuLink {
  label: string;
  href: string;
}

export const SITE_MENU: { primary: SiteMenuLink[]; more: SiteMenuLink[] } = {
  primary: [
    { label: "Experience", href: "/#experience" },
    { label: "Projects", href: "/#projects" },
    { label: "Blogs", href: "/blogs" },
    { label: "Resume", href: "/resume" },
    { label: "Contact", href: "/contact" },
  ],
  more: [
    { label: "Things I Explore", href: "/explore" },
    { label: "Education", href: "/#education" },
    { label: "Certifications", href: "/#certifications" },
    { label: "Recommendations", href: "/#recommendations" },
  ],
};

/**
 * The `id` a section renders with, so a `/#<type>` menu link lands on it.
 *
 * Derived from the section's `type` (the discriminant in `portfolio.json`), so
 * a link and its target cannot drift: `type: "project"` becomes `id="project"`,
 * matched by the `/#project`... wait — the menu says `/#projects`. The mapping
 * below reconciles the few cases where the menu label's slug differs from the
 * section type.
 */
const SECTION_ANCHOR_OVERRIDES: Record<string, string> = {
  // Menu link is "/#projects"; the section type is singular "project".
  project: "projects",
};

/** The anchor id for a section type, or undefined for types with no link. */
export function sectionAnchorId(sectionType: string): string {
  return SECTION_ANCHOR_OVERRIDES[sectionType] ?? sectionType;
}
