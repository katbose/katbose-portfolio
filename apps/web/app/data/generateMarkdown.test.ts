import { describe, expect, test } from "bun:test";
import type { PortfolioData, Section } from "../components/sections/registry";
import { generateMarkdown } from "./generateMarkdown";
import { postUrl } from "./postHelpers";
import { getSortedPosts, posts as realPosts } from "./posts";

/**
 * Characterization tests for the agent-mode markdown generator.
 *
 * These use a synthetic fixture rather than the real `portfolio.json`. The
 * generator's job is a data -> markdown transformation, so the fixture pins the
 * transformation rules while staying immune to content edits. Real content is
 * only referenced where the generator genuinely reads it (the posts list).
 */

const META: PortfolioData["meta"] = {
  siteUrl: "https://fixture.example",
  docsUrl: "https://docs.fixture.example",
  calendarUrl: "https://cal.example/fixture",
  email: "fixture@example.test",
};

const SOCIALS: PortfolioData["socials"] = [
  { label: "GitHub", href: "https://github.example/fixture", icon: "github" },
  { label: "LinkedIn", href: "https://linkedin.example/fixture", icon: "linkedin" },
];

/**
 * Build a fixture portfolio containing only the given sections.
 *
 * `posts` defaults to the real content because the thoughts assertion below
 * checks the generator against every published post. Callers that care about
 * post handling pass their own list — which is now possible at all, since the
 * generator reads `data.posts` instead of importing the post list itself.
 */
function build(
  sections: Section[],
  meta: Partial<PortfolioData["meta"]> = {},
  posts: PortfolioData["posts"] = realPosts,
): PortfolioData {
  return { meta: { ...META, ...meta }, socials: SOCIALS, posts, sections };
}

const HERO: Section = {
  type: "hero",
  data: {
    image: "/fixture.png",
    name: "Fixture Person",
    phonetic: "/fɪkstʃə/",
    noun: "noun",
    timezone: { label: "UTC", tz: "Etc/UTC" },
    intro: ["First intro line.", "Second intro line."],
  },
};

describe("generateMarkdown - hero", () => {
  test("renders name, phonetic, noun, clock and timezone label", () => {
    const md = generateMarkdown(build([HERO]), "12:34:56");
    expect(md).toContain("# Fixture Person");
    expect(md).toContain("/fɪkstʃə/ • noun • 12:34:56 UTC");
  });

  test("falls back to 00:00:00 when time is empty", () => {
    const md = generateMarkdown(build([HERO]), "");
    expect(md).toContain("• 00:00:00 UTC");
  });

  test("renders the intro paragraphs under an About heading", () => {
    const md = generateMarkdown(build([HERO]), "00:00:00");
    expect(md).toContain("## About\n\nFirst intro line.\n\nSecond intro line.");
  });
});

describe("generateMarkdown - featured pill", () => {
  test("resolves a relative href against siteUrl", () => {
    const md = generateMarkdown(
      build([HERO], {
        featured: { tag: "Latest", title: "A Post", href: "/a-post" },
      }),
      "00:00:00",
    );
    expect(md).toContain("**Latest:** [A Post](https://fixture.example/a-post)");
  });

  test("is omitted when meta.featured is absent", () => {
    const md = generateMarkdown(build([HERO]), "00:00:00");
    expect(md).not.toContain("**Latest:**");
  });
});

describe("generateMarkdown - rich text blocks", () => {
  test("renders string blocks as paragraphs and list blocks as dash bullets", () => {
    const md = generateMarkdown(
      build([
        {
          type: "expandableCard",
          title: "Card Section",
          data: {
            heading: "Card Heading",
            body: ["A paragraph.", { list: ["One", "Two"] }, "Another paragraph."],
          },
        },
      ]),
      "00:00:00",
    );
    expect(md).toContain("## Card Section\n\n### Card Heading");
    expect(md).toContain("A paragraph.\n\n- One\n- Two\n\nAnother paragraph.");
  });
});

describe("generateMarkdown - experience", () => {
  const experience: Section = {
    type: "experience",
    title: "Experience",
    data: {
      featured: {
        name: "Acme Corp",
        role: "Engineer",
        dateRange: "2024 - Present",
        link: "https://acme.example",
        body: ["Did the work."],
      },
      previousLabel: "Previously",
      previous: [
        {
          name: "Globex",
          role: "Intern",
          link: "https://globex.example",
          body: ["Learned a lot."],
        },
      ],
    },
  };

  test("includes the featured entry and every previous entry", () => {
    const md = generateMarkdown(build([experience]), "00:00:00");
    expect(md).toContain("## Experience");
    expect(md).toContain("### Acme Corp\n**Engineer**\n*2024 - Present*\n\nDid the work.");
    expect(md).toContain("### Globex\n**Intern**");
  });

  test("prefers dateRange over link, and falls back to link when no dateRange", () => {
    const md = generateMarkdown(build([experience]), "00:00:00");
    expect(md).toContain("*2024 - Present*");
    expect(md).not.toContain("[https://acme.example](https://acme.example)");
    expect(md).toContain("[https://globex.example](https://globex.example)");
  });
});

describe("generateMarkdown - project", () => {
  test("includes subtitle, link, body, stats and footer link", () => {
    const md = generateMarkdown(
      build([
        {
          type: "project",
          title: "Project Section",
          data: {
            name: "Widget",
            subtitle: "a tagline",
            link: "https://widget.example",
            body: ["What it does."],
            stats: [{ value: "42", label: "users" }],
            footerLink: { label: "Read more", url: "https://widget.example/case-study" },
          },
        },
      ]),
      "00:00:00",
    );
    expect(md).toContain("## Project Section");
    expect(md).toContain("### Widget");
    expect(md).toContain("**a tagline**");
    expect(md).toContain("[https://widget.example](https://widget.example)");
    expect(md).toContain("- 42 users");
    expect(md).toContain("Read more: [https://widget.example/case-study]");
  });

  test("omits optional pieces when they are absent", () => {
    const md = generateMarkdown(
      build([
        {
          type: "project",
          title: "Project Section",
          data: { name: "Bare", body: ["Only a body."] },
        },
      ]),
      "00:00:00",
    );
    expect(md).toContain("### Bare");
    expect(md).toContain("Only a body.");
    expect(md).not.toContain("Read more");
  });
});

describe("generateMarkdown - education and tech stack", () => {
  test("renders education items", () => {
    const md = generateMarkdown(
      build([
        {
          type: "education",
          title: "Education",
          data: { items: [{ title: "A School", role: "A Degree", body: ["2020 - 2024"] }] },
        },
      ]),
      "00:00:00",
    );
    expect(md).toContain("## Education\n\n### A School\n**A Degree**\n2020 - 2024");
  });

  test("flattens tech stack categories into one comma-separated list", () => {
    const md = generateMarkdown(
      build([
        {
          type: "techStack",
          title: "Stack",
          data: {
            categories: [
              { name: "Languages", skills: [{ name: "Go", slug: "go" }] },
              { name: "Web", skills: [{ name: "React", slug: "react" }] },
            ],
          },
        },
      ]),
      "00:00:00",
    );
    expect(md).toContain("## Stack\n\nGo, React");
  });
});

describe("generateMarkdown - contact and links footer", () => {
  test("links LinkedIn from socials and the mailto from meta", () => {
    const md = generateMarkdown(
      build([
        {
          type: "contact",
          title: "Get in Touch",
          data: { heading: "Hi", subheading: "There", ctas: [], socialsLabel: "Find me on" },
        },
      ]),
      "00:00:00",
    );
    expect(md).toContain("[LinkedIn](https://linkedin.example/fixture)");
    expect(md).toContain("[email](mailto:fixture@example.test)");
  });

  test("always appends a links footer with every social and the calendar", () => {
    const md = generateMarkdown(build([HERO]), "00:00:00");
    expect(md).toContain("**Links:**");
    for (const social of SOCIALS) {
      expect(md).toContain(`- ${social.label}: [${social.href}](${social.href})`);
    }
    expect(md).toContain(`- Calendar: [${META.calendarUrl}](${META.calendarUrl})`);
  });

  test("ends with exactly one trailing newline", () => {
    const md = generateMarkdown(build([HERO]), "00:00:00");
    expect(md.endsWith("\n")).toBe(true);
    expect(md.endsWith("\n\n")).toBe(false);
  });
});

describe("generateMarkdown - thoughts section", () => {
  test("lists the real posts newest-first with their canonical urls", () => {
    const md = generateMarkdown(
      build([{ type: "thoughts", title: "Thoughts", data: {} }]),
      "00:00:00",
    );
    const sorted = getSortedPosts();
    expect(sorted.length).toBeGreaterThan(0);
    for (const post of sorted) {
      expect(md).toContain(`- [${post.title}](${postUrl(post)}) — ${post.description}`);
    }
  });
});

describe("generateMarkdown - sections that intentionally differ from their title", () => {
  test("the github section contributes nothing (it is a visual-only widget)", () => {
    const withGithub = generateMarkdown(
      build([{ type: "github", title: "GitHub Contributions", data: { username: "someone" } }]),
      "00:00:00",
    );
    const bare = generateMarkdown(build([]), "00:00:00");
    expect(withGithub).toBe(bare);
    expect(withGithub).not.toContain("GitHub Contributions");
    expect(withGithub).not.toContain("someone");
  });

  test("the youtube section uses a handle-derived heading instead of its title", () => {
    const md = generateMarkdown(
      build([
        {
          type: "youtube",
          title: "My YouTube Channel",
          data: {
            image: "/yt.png",
            name: "Fixture Channel",
            url: "https://youtube.example/@fixturehandle",
            tagline: "a tagline",
            community: { url: "https://chat.example", count: "10+", text: "in the chat" },
            videos: [{ title: "Video One", url: "https://youtube.example/watch?v=1" }],
          },
        },
      ]),
      "00:00:00",
    );
    expect(md).toContain("## YouTuber @fixturehandle");
    expect(md).not.toContain("## My YouTube Channel");
    expect(md).toContain("[Fixture Channel](https://youtube.example/@fixturehandle)");
    expect(md).toContain("- [Video One](https://youtube.example/watch?v=1)");
    expect(md).toContain("10+ in the chat: https://chat.example");
  });
});

describe("generateMarkdown - section independence", () => {
  test("an empty sections array still produces the links footer and nothing else", () => {
    const md = generateMarkdown(build([]), "00:00:00");
    expect(md).toContain("**Links:**");
    expect(md).not.toContain("## About");
    expect(md).not.toContain("## Experience");
  });

  test("only the sections present are rendered", () => {
    const md = generateMarkdown(build([HERO]), "00:00:00");
    expect(md).toContain("## About");
    expect(md).not.toContain("## Experience");
    expect(md).not.toContain("## Education");
  });
});
