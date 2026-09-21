import { describe, expect, test } from "bun:test";
import { chatGptUrl, postMarkdownUrl, postToMarkdown, postUrl, readingTime } from "./postHelpers";
import { CANONICAL_COLLECTION, canonicalPostPath } from "./postRoutes";
import { posts } from "./posts";
import { OWNER_NAME, SITE_URL } from "./siteMeta";

/**
 * Characterization tests for everything derived from a post.
 *
 * Expectations are computed from `portfolio.json`, so rewriting content cannot
 * break these tests — only a change in derivation behaviour can.
 */

const FIRST = posts[0];

describe("postUrl / postMarkdownUrl", () => {
  test("builds the canonical url from SITE_URL and the canonical collection path", () => {
    for (const post of posts) {
      expect(postUrl(post)).toBe(`${SITE_URL}${canonicalPostPath(post.slug)}`);
    }
  });

  test("produces absolute https urls with no double slash in the path", () => {
    for (const post of posts) {
      const url = new URL(postUrl(post));
      expect(url.protocol).toBe("https:");
      expect(url.pathname).toBe(`/${CANONICAL_COLLECTION}/${post.slug}`);
      expect(url.pathname).not.toContain("//");
    }
  });

  test("markdown url appends the format query the proxy matches on", () => {
    for (const post of posts) {
      expect(postMarkdownUrl(post)).toBe(`${postUrl(post)}?format=markdown`);
      expect(new URL(postMarkdownUrl(post)).searchParams.get("format")).toBe("markdown");
    }
  });
});

describe("postToMarkdown", () => {
  test("starts with the title as an h1", () => {
    for (const post of posts) {
      expect(postToMarkdown(post).startsWith(`# ${post.title}`)).toBe(true);
    }
  });

  test("maps h2 blocks to '### ' and list items to '* ' bullets", () => {
    for (const post of posts) {
      const md = postToMarkdown(post);
      for (const block of post.blocks) {
        if (block.type === "h2") {
          expect(md).toContain(`### ${block.text}`);
        } else if (block.type === "list") {
          for (const item of block.items) {
            expect(md).toContain(`* ${item}`);
          }
        } else {
          expect(md).toContain(block.text);
        }
      }
    }
  });

  test("separates blocks with a blank line", () => {
    expect(FIRST).toBeDefined();
    if (FIRST) {
      const md = postToMarkdown(FIRST);
      expect(md).toContain("\n\n");
    }
  });
});

describe("readingTime", () => {
  test("is formatted as 'N min read' with N at least 1", () => {
    for (const post of posts) {
      const label = readingTime(post);
      expect(label).toMatch(/^\d+ min read$/);
      const minutes = Number.parseInt(label, 10);
      expect(minutes).toBeGreaterThanOrEqual(1);
    }
  });

  test("grows with content length", () => {
    expect(FIRST).toBeDefined();
    if (!FIRST) return;
    const longer = {
      ...FIRST,
      blocks: [...FIRST.blocks, ...FIRST.blocks, ...FIRST.blocks],
    };
    const short = Number.parseInt(readingTime(FIRST), 10);
    const long = Number.parseInt(readingTime(longer), 10);
    expect(long).toBeGreaterThanOrEqual(short);
  });
});

describe("chatGptUrl", () => {
  test("points at chatgpt.com with the prompt in the q parameter", () => {
    expect(FIRST).toBeDefined();
    if (!FIRST) return;
    const url = new URL(chatGptUrl(FIRST));
    expect(url.origin).toBe("https://chatgpt.com");
    expect(url.searchParams.get("q")).toBeTruthy();
  });

  test("embeds the markdown url, the title and the owner name", () => {
    for (const post of posts) {
      const q = new URL(chatGptUrl(post)).searchParams.get("q") ?? "";
      expect(q).toContain(postMarkdownUrl(post));
      expect(q).toContain(post.title);
      expect(q).toContain(OWNER_NAME);
    }
  });

  test("percent-encodes the prompt so the url stays valid", () => {
    expect(FIRST).toBeDefined();
    if (!FIRST) return;
    const raw = chatGptUrl(FIRST);
    expect(raw).not.toContain(" ");
    expect(() => new URL(raw)).not.toThrow();
  });
});
