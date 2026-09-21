import type { MetadataRoute } from "next";
import { canonicalPostPath } from "./data/postRoutes";
import { posts } from "./data/posts";
import { SITE_URL } from "./data/siteMeta";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE_URL;

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${baseUrl}/blogs`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/explore`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // Every post is picked up automatically from app/data/posts.ts. Only the
    // canonical collection is listed: the same post also answers under the other
    // prefix, and submitting both would be submitting duplicates.
    ...posts.map((post) => ({
      url: `${baseUrl}${canonicalPostPath(post.slug)}`,
      lastModified: new Date(post.date),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
