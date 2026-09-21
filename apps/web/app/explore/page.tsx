import type { Metadata } from "next";
import { PostArchive } from "../components/PostArchive";
import { OWNER_NAME } from "../data/siteMeta";

export const metadata: Metadata = {
  title: "Things I Explore",
  description: `Essays and notes by ${OWNER_NAME}.`,
};

export default function ExplorePage() {
  return (
    <PostArchive
      collection="explore"
      label="Things I Explore"
      heading="Essays & notes"
      variant="list"
    />
  );
}
