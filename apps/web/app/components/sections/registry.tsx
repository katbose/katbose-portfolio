import type { Post } from "../../data/posts";
import type { PortfolioMeta, Social } from "../types";
import { type ContactData, ContactSection } from "./ContactSection";
import { type EducationData, EducationSection } from "./EducationSection";
import { type ExpandableCardData, ExpandableCardSection } from "./ExpandableCardSection";
import { type ExperienceData, ExperienceSection } from "./ExperienceSection";
import { type GithubData, GithubSection } from "./GithubSection";
import { Hero, type HeroData } from "./Hero";
import { type PodcastData, PodcastSection } from "./PodcastSection";
import { type ProjectData, ProjectSection } from "./ProjectSection";
import { type PublicationsData, PublicationsSection } from "./PublicationsSection";
import { type RecommendationsData, RecommendationsSection } from "./RecommendationsSection";
import { type TechStackData, TechStackSection } from "./TechStackSection";
import { type ThoughtsData, ThoughtsSection } from "./ThoughtsSection";
import { type YouTubeData, YouTubeSection } from "./YouTubeSection";

/**
 * Discriminated union of every section. Each variant pairs a `type` tag with
 * the data shape its component declares. Adding a section = add a component
 * (with its exported `*Data` interface), a variant here, and a case in
 * `SectionRenderer`.
 */
export type Section =
  | { type: "hero"; data: HeroData }
  | { type: "experience"; title: string; data: ExperienceData }
  | { type: "techStack"; title: string; data: TechStackData }
  | { type: "expandableCard"; title: string; data: ExpandableCardData }
  | { type: "project"; title: string; data: ProjectData }
  | { type: "youtube"; title: string; data: YouTubeData }
  | { type: "education"; title: string; data: EducationData }
  | { type: "github"; title: string; data: GithubData }
  | { type: "publications"; title: string; data: PublicationsData }
  | { type: "recommendations"; title: string; data: RecommendationsData }
  | { type: "contact"; title: string; data: ContactData }
  | { type: "thoughts"; title: string; data: ThoughtsData }
  | { type: "podcast"; title: string; data: PodcastData };

/**
 * Top-level shape of `portfolio.json`.
 *
 * `posts` is part of this contract even though no section renders it directly:
 * the file has always carried it, the `/[slug]` routes are generated from it,
 * and the agent-mode markdown lists it. Leaving it undeclared is what forced
 * `posts.ts` to reach for the JSON separately with its own cast.
 */
export interface PortfolioData {
  meta: PortfolioMeta;
  socials: Social[];
  posts: Post[];
  sections: Section[];
}

/** Context the page threads into sections that need page-level state/data. */
export interface SectionContext {
  socials: Social[];
}

/** Render a single section by mapping its `type` to the matching component. */
export function SectionRenderer({ section, ctx }: { section: Section; ctx: SectionContext }) {
  switch (section.type) {
    case "hero":
      return <Hero data={section.data} />;
    case "experience":
      return <ExperienceSection title={section.title} data={section.data} />;
    case "techStack":
      return <TechStackSection title={section.title} data={section.data} />;
    case "expandableCard":
      return <ExpandableCardSection title={section.title} data={section.data} />;
    case "project":
      return <ProjectSection title={section.title} data={section.data} />;
    case "youtube":
      return <YouTubeSection title={section.title} data={section.data} />;
    case "education":
      return <EducationSection title={section.title} data={section.data} />;
    case "github":
      return <GithubSection title={section.title} data={section.data} />;
    case "publications":
      return <PublicationsSection title={section.title} data={section.data} />;
    case "recommendations":
      return <RecommendationsSection title={section.title} data={section.data} />;
    case "contact":
      return <ContactSection title={section.title} data={section.data} socials={ctx.socials} />;
    case "thoughts":
      return <ThoughtsSection title={section.title} data={section.data} />;
    case "podcast":
      return <PodcastSection title={section.title} data={section.data} />;
  }
}
