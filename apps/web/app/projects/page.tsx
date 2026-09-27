import type { Metadata } from "next";
import { ArchiveShell } from "../components/ArchiveShell";
import { MediaArchiveCard } from "../components/MediaArchiveCard";
import { portfolio } from "../data/portfolio";
import { OWNER_NAME } from "../data/siteMeta";

export const metadata: Metadata = {
  title: "My Projects",
  description: `Projects built by ${OWNER_NAME}.`,
};

export default function ProjectsPage() {
  const projects = portfolio.sections.filter((section) => section.type === "project");

  return (
    <ArchiveShell label="My Projects" heading="Projects I've built" breadcrumb="Projects">
      <div className="space-y-4">
        {projects.map(({ data }) => (
          <MediaArchiveCard
            key={data.name}
            href={data.link ?? "/#projects"}
            image={data.cardImage ?? data.image ?? "/blog-cover-placeholder.svg"}
            title={data.name}
            description={data.body.find((block) => typeof block === "string") ?? ""}
            meta={
              <span className="line-clamp-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                {data.subtitle}
              </span>
            }
            action={data.link ? "Visit project" : "View project"}
          />
        ))}
      </div>
    </ArchiveShell>
  );
}
