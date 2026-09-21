/**
 * The content contract for `portfolio.json`.
 *
 * WHY THIS EXISTS
 * ---------------
 * `portfolio.json` is the single source of truth for the whole site, but JSON
 * carries no guarantees. Before this file existed, four separate modules each
 * did `portfolioJson as unknown as PortfolioData` — an assertion that tells the
 * compiler to stop checking. A misspelled key, a malformed date, a broken URL,
 * or an unknown section `type` would survive typecheck, survive the build, and
 * surface as a blank region in the browser.
 *
 * This schema closes that hole. It is the executable specification of what
 * valid content looks like.
 *
 * WHY IT IS A devDependency, NOT A RUNTIME ONE
 * --------------------------------------------
 * The content is a local file committed to this repository, and `/` is fully
 * prerendered at build time (`○ Static` in the build output). Validating on
 * every server render would therefore prove nothing that validating once at
 * build time does not already prove — while adding a production dependency and
 * risking the schema being pulled into a client bundle.
 *
 * So the runtime `zod` import here is reachable from exactly two places:
 *
 *   1. `portfolio.schema.test.ts`  — parses the real file plus invalid cases
 *   2. `bun run validate:content`  — the prebuild gate
 *
 * Application code must import from this module with `import type` only, which
 * TypeScript erases. Nothing here ever reaches a browser. If content later
 * moves to a CMS or any other source this program does not control, move `zod`
 * to `dependencies` and parse at that boundary — the schema itself is already
 * correct for that use.
 *
 * HOW IT STAYS HONEST
 * -------------------
 * Section components keep co-locating their own `*Data` interfaces, which is a
 * deliberate pattern in this codebase (see `components/types.ts`). This schema
 * does not replace them. Instead, the conformance assertion at the bottom of
 * this file proves at compile time that anything the schema accepts is valid
 * input for those components. If the two ever drift, `tsc` fails.
 */

import { z } from "zod";
import type { PortfolioData } from "../components/sections/registry";
import type { Post } from "./posts";

/* -------------------------------------------------------------------------- */
/* Primitives                                                                 */
/* -------------------------------------------------------------------------- */

/** Non-empty after trimming. Guards against `""` and `"   "` placeholders. */
const NonEmpty = z.string().trim().min(1);

/**
 * An absolute `https://` URL. `http` is rejected: every link in this file is
 * either a social profile, a CDN asset, or a canonical site URL, and none of
 * them should downgrade a visitor to plaintext.
 */
const HttpsUrl = z.url({ protocol: /^https$/ });

/**
 * An image source: either a root-relative path served from `public/`, or an
 * absolute `https://` URL.
 *
 * Deliberately permissive about the host. Most logos here are raw `<img>` tags
 * pointing at arbitrary company CDNs, which is a conscious tradeoff documented
 * at those call sites. Only sources passed to `next/image` need to appear in
 * `next.config.ts` `remotePatterns`, and that is enforced by Next itself.
 */
const ImageSrc = z.union([
  z.string().regex(/^\/[^/].*$/, "must be a root-relative path like /me.png"),
  HttpsUrl,
]);

/**
 * A unit of rich text, mirroring `Block` in `components/types.ts`: either a
 * markdown string (inline `**bold**` and `[text](url)` only) or a bullet list.
 */
const Block = z.union([NonEmpty, z.strictObject({ list: z.array(NonEmpty).min(1) })]);

/**
 * The clamp height of a collapsed panel — a Tailwind `max-h-*` utility, not a
 * CSS length, because it is interpolated directly into a `className` by
 * `Collapsible.tsx`.
 *
 * This is an allowlist rather than a pattern for a reason. Tailwind only emits
 * utilities it can statically see, and it does not scan `portfolio.json`, so an
 * arbitrary `max-h-*` value here would parse fine and then silently fail to
 * clamp in the browser. The matching `@source inline(...)` rule in
 * `globals.css` guarantees every value below actually exists in the stylesheet.
 * Add to both or neither.
 */
export const COLLAPSED_HEIGHTS = [
  "max-h-20",
  "max-h-24",
  "max-h-32",
  "max-h-40",
  "max-h-48",
  "max-h-56",
  "max-h-64",
  "max-h-72",
  "max-h-80",
  "max-h-96",
] as const;

const CollapsedHeight = z.enum(COLLAPSED_HEIGHTS);

/**
 * Icon names accepted by the `ICONS` registry in `components/icons.tsx`.
 *
 * `Icon` renders `null` for an unknown name, so a typo here used to mean a
 * silently missing glyph in the navbar. Kept as a literal list rather than
 * imported from `icons.tsx` so that validation never has to load React or the
 * icon packages; `portfolio.schema.test.ts` asserts the two stay in sync.
 */
export const ICON_NAMES = [
  "github",
  "linkedin",
  "youtube",
  "calendar",
  "mail",
  "send",
  "x",
  "medium",
  "discord",
  "instagram",
] as const;

const IconName = z.enum(ICON_NAMES);

/**
 * An IANA time zone identifier, checked against the host's own tz database
 * rather than a regex — `"Asia/Kolkata"` is valid, `"Asia/Kolkataa"` is not,
 * and both match any plausible pattern.
 */
const TimeZone = NonEmpty.refine(
  (tz) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  },
  { error: "must be a valid IANA time zone identifier, e.g. Asia/Kolkata" },
);

/** A labelled external link used in section footers (`LinkRef`). */
const LinkRef = z.strictObject({ label: NonEmpty, url: HttpsUrl });

/* -------------------------------------------------------------------------- */
/* Site-level metadata                                                        */
/* -------------------------------------------------------------------------- */

const PortfolioMetaSchema = z.strictObject({
  siteUrl: HttpsUrl,
  docsUrl: HttpsUrl,
  calendarUrl: HttpsUrl,
  email: z.email(),
  /** Optional pill above the hero pointing at a featured page. */
  featured: z
    .strictObject({
      tag: NonEmpty,
      title: NonEmpty,
      /** Root-relative: the featured page is always on this site. */
      href: z.string().regex(/^\/[^/]*$/, "must be a root-relative path like /my-essay"),
    })
    .optional(),
});

const SocialSchema = z.strictObject({
  label: NonEmpty,
  href: HttpsUrl,
  icon: IconName,
});

/* -------------------------------------------------------------------------- */
/* Posts                                                                      */
/* -------------------------------------------------------------------------- */

const PostBlockSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("p"), text: NonEmpty }),
  z.strictObject({ type: z.literal("h2"), text: NonEmpty }),
  z.strictObject({ type: z.literal("list"), items: z.array(NonEmpty).min(1) }),
]);

const PostSchema = z.strictObject({
  /** Lowercase kebab-case: this becomes the URL at `/<slug>`. */
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be lowercase-kebab-case"),
  kicker: NonEmpty,
  title: NonEmpty,
  description: NonEmpty,
  coverImage: ImageSrc.optional(),
  coverAlt: NonEmpty.optional(),
  /** `YYYY-MM-DD`. Ordering and display both depend on this parsing cleanly. */
  date: z.iso.date(),
  blocks: z.array(PostBlockSchema).min(1),
});

/* -------------------------------------------------------------------------- */
/* Sections                                                                   */
/* -------------------------------------------------------------------------- */

const ExperienceEntrySchema = z.strictObject({
  name: NonEmpty,
  role: NonEmpty,
  location: NonEmpty.optional(),
  link: HttpsUrl.optional(),
  logo: ImageSrc.optional(),
  dateRange: NonEmpty.optional(),
  collapsedHeight: CollapsedHeight.optional(),
  body: z.array(Block).min(1),
});

const HeroSchema = z.strictObject({
  type: z.literal("hero"),
  data: z.strictObject({
    image: ImageSrc,
    name: NonEmpty,
    phonetic: NonEmpty,
    noun: NonEmpty,
    timezone: z.strictObject({ label: NonEmpty, tz: TimeZone }),
    intro: z.array(NonEmpty).min(1),
  }),
});

/**
 * Every section except the hero carries a visible heading.
 *
 * `T` is constrained with `const` so `z.literal(type)` keeps the exact string
 * literal. Without it the tag widens to `string`, which still parses correctly
 * at runtime but silently destroys the discriminated union in the inferred
 * type — the compile-time conformance check at the bottom of this file exists
 * precisely because that failure is invisible to `safeParse`.
 */
const titled = <const T extends string, D extends z.ZodType>(type: T, data: D) =>
  z.strictObject({ type: z.literal(type), title: NonEmpty, data });

const SectionSchema = z.discriminatedUnion("type", [
  HeroSchema,

  titled(
    "experience",
    z.strictObject({
      featured: ExperienceEntrySchema,
      previousLabel: NonEmpty,
      previous: z.array(ExperienceEntrySchema),
      viewAllLabel: NonEmpty.optional(),
      viewAllHref: z
        .string()
        .regex(/^\/[^/]*$/)
        .optional(),
    }),
  ),

  titled(
    "techStack",
    z.strictObject({
      categories: z
        .array(
          z.strictObject({
            name: NonEmpty,
            skills: z
              .array(
                z.strictObject({
                  name: NonEmpty,
                  /**
                   * A Simple Icons slug. Resolved at runtime as
                   * `cdn.simpleicons.org/<slug>`, so an invalid slug is a
                   * silent 404 rather than a build error.
                   */
                  slug: z.string().regex(/^[a-z0-9.+-]+$/, "must be a Simple Icons slug"),
                }),
              )
              .min(1),
          }),
        )
        .min(1),
    }),
  ),

  titled(
    "expandableCard",
    z.strictObject({
      heading: NonEmpty,
      collapsedHeight: CollapsedHeight.optional(),
      body: z.array(Block).min(1),
    }),
  ),

  titled(
    "project",
    z.strictObject({
      name: NonEmpty,
      link: HttpsUrl.optional(),
      subtitle: NonEmpty.optional(),
      image: ImageSrc.optional(),
      cardImage: ImageSrc.optional(),
      body: z.array(Block).min(1),
      stats: z.array(z.strictObject({ value: NonEmpty, label: NonEmpty })).optional(),
      footerLink: LinkRef.optional(),
    }),
  ),

  titled(
    "blogs",
    z.strictObject({
      count: z.number().int().positive().max(5).optional(),
      viewAllLabel: NonEmpty.optional(),
      viewAllHref: z
        .string()
        .regex(/^\/[^/]*$/)
        .optional(),
    }),
  ),

  titled(
    "education",
    z.strictObject({
      items: z
        .array(
          z.strictObject({
            title: NonEmpty,
            role: NonEmpty,
            link: HttpsUrl.optional(),
            logo: ImageSrc.optional(),
            body: z.array(Block).min(1),
          }),
        )
        .min(1),
    }),
  ),

  titled("github", z.strictObject({ username: NonEmpty })),

  titled(
    "publications",
    z.strictObject({
      items: z
        .array(
          z.strictObject({
            title: NonEmpty,
            link: HttpsUrl,
            venue: NonEmpty,
            authors: NonEmpty,
            abstract: NonEmpty,
            collapsedHeight: CollapsedHeight.optional(),
            linkLabel: NonEmpty.optional(),
            logo: ImageSrc.optional(),
          }),
        )
        .min(1),
    }),
  ),

  titled(
    "recommendations",
    z.strictObject({
      items: z
        .array(
          z.strictObject({
            name: NonEmpty,
            link: HttpsUrl.optional(),
            role: NonEmpty,
            quote: z.array(NonEmpty).min(1),
          }),
        )
        .min(1),
    }),
  ),

  titled(
    "contact",
    z.strictObject({
      heading: NonEmpty,
      subheading: NonEmpty,
      ctas: z
        .array(
          z.strictObject({
            label: NonEmpty,
            /**
             * A CTA points at one of three things: an internal route
             * (root-relative, e.g. `/contact`), an external site (`https:`), or
             * an email (`mailto:`). The component opens only the `https:` form
             * in a new tab.
             */
            href: z.union([
              z.string().regex(/^\/[^/]/, "must be a root-relative path like /contact"),
              HttpsUrl,
              z.string().regex(/^mailto:.+@.+\..+$/),
            ]),
            icon: IconName,
            primary: z.boolean().optional(),
          }),
        )
        .min(1),
      socialsLabel: NonEmpty,
      image: ImageSrc.optional(),
    }),
  ),

  titled(
    "thoughts",
    z.strictObject({
      count: z.number().int().positive().optional(),
      viewAllLabel: NonEmpty.optional(),
      viewAllHref: z
        .string()
        .regex(/^\/[^/]*$/)
        .optional(),
    }),
  ),

  titled(
    "podcast",
    z.strictObject({
      episodes: z
        .array(
          z.strictObject({
            title: NonEmpty,
            url: HttpsUrl,
            description: NonEmpty.optional(),
          }),
        )
        .min(1),
    }),
  ),
]);

/* -------------------------------------------------------------------------- */
/* Top level                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The whole content file.
 *
 * Note `posts` is included here. The hand-written `PortfolioData` interface
 * omitted it even though the file has always carried it, which is why
 * `posts.ts` needed its own separate assertion to reach the data.
 */
export const PortfolioSchema = z
  .strictObject({
    meta: PortfolioMetaSchema,
    socials: z.array(SocialSchema).min(1),
    posts: z.array(PostSchema),
    sections: z.array(SectionSchema).min(1),
  })
  /**
   * Cross-field rules that no single field can express.
   *
   * Both of these were previously unenforceable: the page reads the hero with
   * `.find()` and falls back to a hardcoded timezone, and `/[slug]` builds its
   * routes from `posts`, so a duplicate slug would make one post unreachable.
   */
  .check((ctx) => {
    const heroes = ctx.value.sections.filter((s) => s.type === "hero");
    if (heroes.length !== 1) {
      ctx.issues.push({
        code: "custom",
        input: ctx.value.sections,
        path: ["sections"],
        message: `expected exactly one "hero" section, found ${heroes.length}`,
      });
    }

    const seen = new Set<string>();
    ctx.value.posts.forEach((post, i) => {
      if (seen.has(post.slug)) {
        ctx.issues.push({
          code: "custom",
          input: post.slug,
          path: ["posts", i, "slug"],
          message: `duplicate post slug "${post.slug}" — each post needs its own route`,
        });
      }
      seen.add(post.slug);
    });
  });

/* -------------------------------------------------------------------------- */
/* Inferred types                                                             */
/* -------------------------------------------------------------------------- */

export type Portfolio = z.infer<typeof PortfolioSchema>;
export type PortfolioSection = z.infer<typeof SectionSchema>;
export type PortfolioPost = z.infer<typeof PostSchema>;

/* -------------------------------------------------------------------------- */
/* Compile-time conformance                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Fails the build if `A` is not assignable to `B`.
 *
 * Used below to prove the schema and the component-facing interfaces agree.
 * The direction matters: we need everything the schema *accepts* to be valid
 * input for the components. The reverse is not required — the schema is allowed
 * to be stricter than the interfaces, and it is (valid URLs, real dates, known
 * icon names). That extra strictness is the entire point.
 */
type Assignable<A extends B, B> = A;

/** Schema output is safe to hand to `SectionRenderer` and friends. */
export type SchemaMatchesComponents = Assignable<Portfolio, PortfolioData>;

/** Schema output is safe to hand to the post helpers and `/[slug]` route. */
export type SchemaMatchesPosts = Assignable<PortfolioPost, Post>;
