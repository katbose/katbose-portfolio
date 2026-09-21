import type { Metadata } from "next";
import { PostArchive } from "../components/PostArchive";
import { OWNER_NAME } from "../data/siteMeta";

export const metadata: Metadata = {
  title: "Blogs",
  description: `Blogs, essays and notes by ${OWNER_NAME}.`,
};

export default function BlogsPage() {
  return (
    <PostArchive collection="blogs" label="My Blogs" heading="Long-form writing" variant="media" />
  );
}
