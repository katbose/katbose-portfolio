import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostPageView } from "../../components/PostPageView";
import { postMetadata } from "../../data/postRouteShared";
import { getPost, posts } from "../../data/posts";

/** Pre-render every post at build time. */
export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return postMetadata(slug);
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return <PostPageView post={post} collection="blogs" />;
}
