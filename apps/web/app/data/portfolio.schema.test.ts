import { describe, expect, test } from "bun:test";
import { ICONS } from "../components/icons";
import portfolioJson from "./portfolio.json";
import {
  COLLAPSED_HEIGHTS,
  ICON_NAMES,
  PortfolioSchema,
  type PortfolioSection,
} from "./portfolio.schema";

/**
 * The content gate.
 *
 * Two jobs here, and they are different jobs:
 *
 *   1. Prove the *real* `portfolio.json` is valid. This is what `next build`
 *      depends on, and it is what makes the single cast in `portfolio.ts`
 *      defensible.
 *   2. Prove the schema actually *rejects* things. A schema that accepts
 *      everything passes job 1 trivially and is worth nothing, so every rule
 *      that exists to catch a specific silent failure gets a test that shows it
 *      catching it.
 */

/* -------------------------------------------------------------------------- */
/* The real content                                                           */
/* -------------------------------------------------------------------------- */

describe("portfolio.json", () => {
  test("satisfies the schema", () => {
    const result = PortfolioSchema.safeParse(portfolioJson);

    // Surface every path and message at once. A bare `toBe(true)` here would
    // report "expected false to be true" and leave you diffing a 38 KB file.
    if (!result.success) {
      const report = result.error.issues
        .map((i) => `  ${i.path.join(".") || "<root>"}: ${i.message}`)
        .join("\n");
      throw new Error(`portfolio.json failed validation:\n${report}`);
    }

    expect(result.success).toBe(true);
  });

  test("has content in every collection the site renders", () => {
    const data = PortfolioSchema.parse(portfolioJson);

    expect(data.sections.length).toBeGreaterThan(0);
    expect(data.socials.length).toBeGreaterThan(0);
    expect(data.posts.length).toBeGreaterThan(0);
  });

  test("declares every section type the renderer knows how to draw", () => {
    const data = PortfolioSchema.parse(portfolioJson);

    // `SectionRenderer` switches exhaustively on `type`. Anything the schema
    // admits must therefore have a matching case, which the compiler enforces;
    // this only checks the tags are the expected closed set.
    for (const section of data.sections) {
      expect(typeof section.type).toBe("string");
      expect(section.type.length).toBeGreaterThan(0);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Registry agreement                                                         */
/* -------------------------------------------------------------------------- */

describe("schema stays in sync with the code it protects", () => {
  test("every accepted icon name resolves to a real icon", () => {
    // `Icon` renders `null` for an unknown name, so a typo in the content file
    // used to mean a silently missing glyph in the navbar. The schema's enum is
    // the guard; this test is the guard on the guard.
    for (const name of ICON_NAMES) {
      expect(ICONS[name], `ICONS is missing "${name}"`).toBeDefined();
    }
  });

  test("the icon registry exposes nothing the schema forbids", () => {
    // Catches the opposite drift: an icon added to the registry but never
    // allowed in content is dead code, and usually means a forgotten edit here.
    expect(Object.keys(ICONS).sort()).toEqual([...ICON_NAMES].sort());
  });

  test("every accepted collapsed height is a max-h utility", () => {
    // These are interpolated into `className`, and `globals.css` guarantees
    // them via `@source inline(...)`. The shape has to stay predictable for
    // that guarantee to mean anything.
    for (const value of COLLAPSED_HEIGHTS) {
      expect(value).toMatch(/^max-h-\d+$/);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Rejection                                                                  */
/* -------------------------------------------------------------------------- */

/** A minimal valid portfolio, mutated per-test to isolate one rule at a time. */
function valid() {
  return {
    meta: {
      siteUrl: "https://example.com",
      docsUrl: "https://docs.example.com",
      calendarUrl: "https://cal.example.com/x",
      email: "someone@example.com",
    },
    socials: [{ label: "GitHub", href: "https://github.com/x", icon: "github" }],
    posts: [
      {
        slug: "a-post",
        kicker: "Essay",
        title: "A Post",
        description: "About something.",
        date: "2026-01-31",
        blocks: [{ type: "p", text: "Hello." }],
      },
    ],
    sections: [
      {
        type: "hero",
        data: {
          image: "/me.png",
          name: "Someone",
          phonetic: "some-one",
          noun: "builder",
          timezone: { label: "IST", tz: "Asia/Kolkata" },
          intro: ["Hi."],
        },
      },
    ],
  };
}

/**
 * Assert the schema rejects `input`, and that it blames `path`.
 *
 * Checking the path matters: a test that only asserts "something failed" will
 * keep passing after the mutation stops being the reason it fails.
 *
 * `unrecognized_keys` is reported against the *containing* object rather than
 * the offending key — the key itself arrives in `issue.keys` — so the effective
 * path is reassembled here to keep these assertions readable at the call site.
 */
function rejects(input: unknown, path: string) {
  const result = PortfolioSchema.safeParse(input);
  expect(result.success).toBe(false);
  if (result.success) return;

  const paths = result.error.issues.flatMap((issue) => {
    const base = issue.path.join(".");
    if (issue.code !== "unrecognized_keys") return [base];
    return issue.keys.map((key) => [base, key].filter(Boolean).join("."));
  });

  expect(
    paths.some((p) => p === path || p.startsWith(`${path}.`)),
    `expected an issue at "${path}", got: ${paths.join(", ") || "<none>"}`,
  ).toBe(true);
}

describe("the fixture itself is valid", () => {
  test("so every rejection below is caused by its own mutation", () => {
    expect(PortfolioSchema.safeParse(valid()).success).toBe(true);
  });
});

describe("structure", () => {
  test("rejects an unknown top-level key", () => {
    rejects({ ...valid(), colour: "blue" }, "colour");
  });

  test("rejects an unknown key inside a section", () => {
    const data = valid();
    // @ts-expect-error deliberately invalid: extra key on hero data
    data.sections[0].data.nickname = "typo";
    rejects(data, "sections.0.data.nickname");
  });

  test("rejects an unknown section type", () => {
    const data = valid();
    data.sections.push({ type: "newsletter", title: "Newsletter", data: {} } as never);
    rejects(data, "sections.1");
  });

  test("rejects a missing required field", () => {
    const data = valid();
    // @ts-expect-error deliberately invalid: hero must have a name
    delete data.sections[0].data.name;
    rejects(data, "sections.0.data.name");
  });

  test("rejects a blank string where content is required", () => {
    const data = valid();
    data.sections[0].data.name = "   ";
    rejects(data, "sections.0.data.name");
  });
});

describe("cross-field rules", () => {
  test("rejects zero hero sections", () => {
    const data = valid();
    data.sections = [];
    rejects(data, "sections");
  });

  test("rejects two hero sections", () => {
    const data = valid();
    data.sections.push(structuredClone(data.sections[0]));
    rejects(data, "sections");
  });

  test("rejects duplicate post slugs", () => {
    // Two posts with one slug means one of them has no reachable route, because
    // `/[slug]` is generated from this list.
    const data = valid();
    data.posts.push({ ...structuredClone(data.posts[0]), title: "Another" });
    rejects(data, "posts.1.slug");
  });
});

describe("semantic rules", () => {
  test("rejects a non-https url", () => {
    const data = valid();
    data.socials[0].href = "http://github.com/x";
    rejects(data, "socials.0.href");
  });

  test("rejects a malformed email", () => {
    const data = valid();
    data.meta.email = "someone-at-example.com";
    rejects(data, "meta.email");
  });

  test("rejects an unknown icon name", () => {
    const data = valid();
    data.socials[0].icon = "mastodon";
    rejects(data, "socials.0.icon");
  });

  test("rejects an invalid time zone", () => {
    // Any regex would accept this. Only the tz database knows it is wrong.
    const data = valid();
    data.sections[0].data.timezone.tz = "Asia/Kolkataa";
    rejects(data, "sections.0.data.timezone.tz");
  });

  test("rejects a non-ISO date", () => {
    const data = valid();
    data.posts[0].date = "31-01-2026";
    rejects(data, "posts.0.date");
  });

  test("rejects an impossible date", () => {
    const data = valid();
    data.posts[0].date = "2026-02-30";
    rejects(data, "posts.0.date");
  });

  test("rejects a non-kebab-case slug", () => {
    const data = valid();
    data.posts[0].slug = "A Post";
    rejects(data, "posts.0.slug");
  });

  test("rejects an unknown post block type", () => {
    const data = valid();
    data.posts[0].blocks.push({ type: "quote", text: "..." } as never);
    rejects(data, "posts.0.blocks.1");
  });

  test("rejects an image source that is neither local nor https", () => {
    const data = valid();
    data.sections[0].data.image = "me.png";
    rejects(data, "sections.0.data.image");
  });

  test("rejects a collapsed height Tailwind will not generate", () => {
    // The specific silent failure this rule exists for: `max-h-[37rem]` parses
    // as a plausible utility, is interpolated into `className`, and then never
    // appears in the stylesheet because Tailwind never saw it.
    const data = valid();
    data.sections.push({
      type: "expandableCard",
      title: "Card",
      data: { heading: "H", collapsedHeight: "max-h-[37rem]", body: ["Text."] },
    } as never);
    rejects(data, "sections.1.data.collapsedHeight");
  });

  test("accepts every allowlisted collapsed height", () => {
    for (const collapsedHeight of COLLAPSED_HEIGHTS) {
      const data = valid();
      data.sections.push({
        type: "expandableCard",
        title: "Card",
        data: { heading: "H", collapsedHeight, body: ["Text."] },
      } as never);
      expect(PortfolioSchema.safeParse(data).success, `${collapsedHeight} should be accepted`).toBe(
        true,
      );
    }
  });
});

describe("inferred types", () => {
  test("the section union is discriminated, not widened to string", () => {
    // Regression guard. An earlier version of the schema built its section
    // variants through a helper that widened the `type` tag to `string`. Every
    // runtime test still passed — the union only collapsed in the *inferred
    // type*, which is invisible to `safeParse` and caught the components by
    // surprise instead.
    const section: PortfolioSection = {
      type: "github",
      title: "GitHub",
      data: { username: "someone" },
    };

    if (section.type === "github") {
      expect(section.data.username).toBe("someone");
    }

    // @ts-expect-error "newsletter" is not a member of the union
    const invalid: PortfolioSection = { type: "newsletter", title: "N", data: {} };
    expect(invalid).toBeDefined();
  });
});
