import { MapPin } from "lucide-react";
import { Collapsible } from "../Collapsible";
import { ExpandableExperienceItem } from "../ExpandableExperienceItem";
import { RichText } from "../RichText";
import { SectionShell } from "../SectionShell";
import type { Block } from "../types";

export interface ExperienceEntry {
  name: string;
  role: string;
  location?: string;
  link?: string;
  /** Optional logo image URL — rendered as a circular icon before the name. */
  logo?: string;
  /** Optional date range — surfaced in the generated agent-mode markdown. */
  dateRange?: string;
  collapsedHeight?: string;
  body: Block[];
}

export interface ExperienceData {
  featured: ExperienceEntry;
  previousLabel: string;
  previous: ExperienceEntry[];
}

export function ExperienceSection({ title, data }: { title: string; data: ExperienceData }) {
  const { featured, previousLabel, previous } = data;

  return (
    <SectionShell title={title} className="mt-6">
      {/* Featured / Current role */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1">
          {featured.logo && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg">
              {/* object-contain, not object-cover: a logo is not a photo. Cover
                  scales to fill the square and shaves the edges off anything
                  that is not exactly 1:1, which clips most real logos. */}
              {/* biome-ignore lint/performance/noImgElement: logo is an arbitrary remote URL from portfolio.json */}
              <img
                src={featured.logo}
                alt={`${featured.name} logo`}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </span>
          )}
          {featured.link ? (
            <a
              href={featured.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-semibold text-black dark:text-white no-underline hover:underline hover:underline-offset-4 hover:decoration-black dark:hover:decoration-white transition-colors"
            >
              {featured.name}
            </a>
          ) : (
            <span className="text-lg font-semibold text-black dark:text-white">
              {featured.name}
            </span>
          )}
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {featured.role}
          </span>
          {featured.location && (
            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <MapPin className="h-3 w-3" />
              {featured.location}
            </span>
          )}
          {/* Pushed right on wider screens so the card reads name/role on the
              left and dates on the right, the way a CV entry does. */}
          {featured.dateRange && (
            <span className="text-xs text-gray-500 dark:text-gray-400 sm:ml-auto">
              {featured.dateRange}
            </span>
          )}
        </div>

        <Collapsible
          collapsedHeight={featured.collapsedHeight ?? "max-h-48"}
          className="space-y-3 text-base leading-relaxed text-gray-600 dark:text-gray-400"
        >
          <RichText blocks={featured.body} />
        </Collapsible>
      </div>

      {/* Previously — compact titles, expand on click.
          Skipped entirely when there is nothing to list: rendering the heading
          over an empty bordered box looks like a loading bug. */}
      {previous.length > 0 && (
        <div className="mt-10">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {previousLabel}
          </h3>
          <div className="flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 px-6 sm:px-8">
            {previous.map((item) => (
              <ExpandableExperienceItem
                key={item.name}
                title={item.name}
                role={item.role}
                location={item.location}
                link={item.link}
                logo={item.logo}
              >
                <div className="space-y-2">
                  <RichText blocks={item.body} />
                </div>
              </ExpandableExperienceItem>
            ))}
          </div>
        </div>
      )}
    </SectionShell>
  );
}
