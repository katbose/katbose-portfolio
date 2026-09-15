import { expect, hero, portfolio, sectionTitles, test } from "./fixtures";

/**
 * What the server sends before any application JavaScript runs.
 *
 * WHY THIS SUITE EXISTS
 * ---------------------
 * Every other browser test waits for hydration first, so all of them would keep
 * passing if the entire page were built in the browser. That makes them blind to
 * the single most consequential architectural property of this app: how much of
 * the portfolio is real HTML versus how much is assembled client-side.
 *
 * This is the baseline that makes the server-first refactor measurable. Right
 * now `app/page.tsx` is a Client Component, so the homepage content reaches the
 * browser as an RSC payload that React has to render — and these tests record
 * exactly that. As sections move to the server the same assertions should start
 * finding content in the markup instead, with no test rewritten to make it so.
 *
 * ON NOT ASSERTING VISIBILITY
 * ---------------------------
 * Content being present is a weaker claim than content being *visible* without
 * JavaScript, and deliberately so. `Reveal` and `motion.main` server-render with
 * `opacity: 0`, so a no-JavaScript visitor gets markup they cannot see. That is a
 * real gap, it is scheduled for the animation work, and it is not something a
 * server-first split fixes on its own. Overstating it here would hide it.
 */

/** Entities the renderer emits that would otherwise break naive matching. */
function decodeEntities(html: string): string {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&apos;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&ndash;/g, "\u2013")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/**
 * The human-readable text of the document, with every `<script>` removed first.
 *
 * Dropping scripts is the whole point. Next.js inlines the RSC payload into
 * `self.__next_f.push(...)` calls, so the portfolio's prose appears in the raw
 * HTML either way — as flattened JSON inside a script tag. Matching against that
 * would let a fully client-rendered page masquerade as server-rendered. Only
 * text that survives script removal is text a browser could paint without
 * running the app.
 */
function visibleText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip the inline markdown that `Block` strings allow, matching `siteMeta`. */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*/g, "")
    .trim();
}

async function fetchHomeHtml(request: {
  get: (url: string) => Promise<{ ok: () => boolean; text: () => Promise<string> }>;
}): Promise<string> {
  const response = await request.get("/");
  expect(response.ok()).toBe(true);
  return await response.text();
}

test.describe("server response", () => {
  test("serves the homepage as HTML without needing the browser", async ({ request }) => {
    const html = await fetchHomeHtml(request);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html.length).toBeGreaterThan(1000);
  });

  test("carries the document title and meta description", async ({ request }) => {
    const html = await fetchHomeHtml(request);

    // These come from `siteMeta`, which reads the content file. They are
    // server-rendered today and must stay that way — crawlers do not hydrate.
    expect(hero).toBeDefined();
    if (!hero) return;

    expect(decodeEntities(html)).toContain(hero.data.name);
    expect(html).toMatch(/<meta name="description"/);
  });

  test("links are real anchors in the markup, not hydration-only handlers", async ({ request }) => {
    const html = await fetchHomeHtml(request);
    const markupOnly = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ");

    // Socials and the calendar are plain `<a href>` elements. If these ever
    // stop appearing in server markup, the site has become unlinkable to
    // anything that does not execute JavaScript.
    for (const social of portfolio.socials) {
      expect(markupOnly, `missing anchor for ${social.label}`).toContain(social.href);
    }
    expect(markupOnly).toContain(portfolio.meta.calendarUrl);
  });
});

/**
 * The server-rendered content baseline.
 *
 * A correction worth recording, because it reframes what the server-first
 * refactor is actually for: this content is *already* complete in the markup,
 * even though `app/page.tsx` is a Client Component. `"use client"` does not opt
 * a route out of server rendering — Next.js prerenders Client Components too. It
 * only means the same code is *also* shipped to the browser and hydrated there.
 *
 * So moving sections to the server will not make the HTML more complete. These
 * assertions are already green and must stay green; they exist as a regression
 * guard, so that a refactor aimed at shrinking JavaScript cannot quietly cost us
 * server-rendered content. The JavaScript saving is measured separately by
 * `scripts/bundle-report.ts`, and that is where the real win shows up.
 */
test.describe("server-rendered content", () => {
  test("every section heading is present in the markup", async ({ request }) => {
    const text = visibleText(await fetchHomeHtml(request));

    expect(sectionTitles.length).toBeGreaterThan(0);
    for (const title of sectionTitles) {
      expect(text, `heading "${title}" is missing from server HTML`).toContain(title);
    }
  });

  test("every hero paragraph is present in the markup", async ({ request }) => {
    const text = visibleText(await fetchHomeHtml(request));

    expect(hero).toBeDefined();
    if (!hero) return;

    expect(hero.data.intro.length).toBeGreaterThan(0);
    for (const paragraph of hero.data.intro) {
      expect(text).toContain(stripInlineMarkdown(paragraph));
    }
  });

  test("previews each essay's opening paragraph but not the rest of it", async ({ request }) => {
    const text = visibleText(await fetchHomeHtml(request));

    // `ThoughtsSection` deliberately previews the first paragraph of each post,
    // clamped to `max-h-12` with a fade. That is design, not a leak — so the
    // meaningful boundary is the *closing* paragraph, which can only appear
    // here if the entire essay body is being rendered on the homepage.
    for (const post of portfolio.posts) {
      const paragraphs = post.blocks.filter((b) => b.type === "p");
      if (paragraphs.length < 2) continue;

      const last = paragraphs[paragraphs.length - 1];
      if (last.type !== "p") continue;

      const probe = stripInlineMarkdown(last.text).slice(0, 50);
      expect(text, `full essay body for "${post.slug}" is on the homepage`).not.toContain(probe);
    }
  });
});
