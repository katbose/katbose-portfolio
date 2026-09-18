import type { Page } from "@playwright/test";
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
 * The homepage now renders its static sections on the server. Script payloads
 * are stripped before checking prose so they cannot conceal a regression.
 * These markup checks complement the browser visibility and animation tests.
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
async function parseServerHtml(page: Page, html: string) {
  return page.evaluate((source) => {
    // DOMParser creates an inert document: application scripts never execute.
    const document = new DOMParser().parseFromString(source, "text/html");
    for (const element of document.querySelectorAll("script, style, template")) element.remove();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const parts: string[] = [];
    while (walker.nextNode()) parts.push(walker.currentNode.textContent ?? "");
    return {
      text: parts.join(" ").replace(/\s+/g, " ").trim(),
      links: Array.from(document.querySelectorAll("a[href]"), (anchor) =>
        anchor.getAttribute("href"),
      ),
    };
  }, html);
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
  test("preloads both hero font subsets before JavaScript runs", async ({ request }) => {
    const html = await fetchHomeHtml(request);
    const links = html.match(/<link\b[^>]+>/g) ?? [];
    const fonts = links.filter((link) => /rel="preload"/.test(link) && /as="font"/.test(link));
    expect(fonts).toHaveLength(2);
    for (const link of fonts) {
      // Empty crossorigin is the anonymous mode emitted by React's preload API.
      expect(link).toMatch(/crossorigin="(?:anonymous)?"/);
      const url = link.match(/href="([^"]+)"/)?.[1];
      expect(url).toMatch(/^\/fonts\/dm-sans-latin(?:-ext)?-[a-f0-9]+\.woff2$/);
      const response = await request.get(url as string);
      expect(response.ok()).toBe(true);
      expect(response.headers()["content-type"]).toContain("font/woff2");
      expect((await response.body()).subarray(0, 4).toString()).toBe("wOF2");
    }
  });

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

  test("links are real anchors in the markup, not hydration-only handlers", async ({
    request,
    page,
  }) => {
    const html = await fetchHomeHtml(request);
    const { links } = await parseServerHtml(page, html);

    // Socials and the calendar are plain `<a href>` elements. If these ever
    // stop appearing in server markup, the site has become unlinkable to
    // anything that does not execute JavaScript.
    for (const social of portfolio.socials) {
      expect(links, `missing anchor for ${social.label}`).toContain(social.href);
    }
    expect(links).toContain(portfolio.meta.calendarUrl);
  });
});

/** Guard server-rendered prose independently of client hydration payloads. */
test.describe("server-rendered content", () => {
  test("every section heading is present in the markup", async ({ request, page }) => {
    const { text } = await parseServerHtml(page, await fetchHomeHtml(request));

    expect(sectionTitles.length).toBeGreaterThan(0);
    for (const title of sectionTitles) {
      expect(text, `heading "${title}" is missing from server HTML`).toContain(title);
    }
  });

  test("every hero paragraph is present in the markup", async ({ request, page }) => {
    const { text } = await parseServerHtml(page, await fetchHomeHtml(request));

    expect(hero).toBeDefined();
    if (!hero) return;

    expect(hero.data.intro.length).toBeGreaterThan(0);
    for (const paragraph of hero.data.intro) {
      expect(text).toContain(stripInlineMarkdown(paragraph));
    }
  });

  test("previews each essay's opening paragraph but not the rest of it", async ({
    request,
    page,
  }) => {
    const { text } = await parseServerHtml(page, await fetchHomeHtml(request));

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

// These strings exercise browser parsing, not a production HTML sanitizer.
for (const ending of ["</script >", '</ScRiPt data-test="value">']) {
  test(`server HTML parsing excludes payloads with ${ending}`, async ({ page }) => {
    const { text, links } = await parseServerHtml(
      page,
      `<body><script>const payload = '<a href="/payload-only">Payload prose</a>';${ending}
      <style>.example { content: "Style prose"; }</style>
      <!-- Comment prose --><template>Template prose</template>
      <p>Actual &amp; rendered &#x1F30A; text</p><a href="/real?x=1&amp;y=2">Real link</a></body>`,
    );
    expect(text).toBe("Actual & rendered 🌊 text Real link");
    expect(links).toEqual(["/real?x=1&y=2"]);
  });
}
