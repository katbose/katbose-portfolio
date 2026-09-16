import type { ReactNode } from "react";
import type { EducationItem } from "./EducationSection";

export function StaticExperienceItem({
  title,
  role,
  link,
  logo,
  children,
}: Omit<EducationItem, "body"> & { children: ReactNode }) {
  return (
    <div className="group">
      <div className="mb-2 flex flex-col justify-between sm:flex-row sm:items-baseline">
        <div className="flex items-center gap-2">
          {logo && (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md">
              {/* biome-ignore lint/performance/noImgElement: logo is an arbitrary remote URL from portfolio.json */}
              <img
                src={logo}
                crossOrigin={
                  logo.startsWith("https://upload.wikimedia.org/") ? "anonymous" : undefined
                }
                alt={`${title} logo`}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </span>
          )}
          <span className="font-medium text-black dark:text-white">{title}</span>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Visit the ${title} website`}
              className="text-xs text-gray-500 dark:text-gray-400 underline underline-offset-2 hover:text-black dark:hover:text-white"
            >
              website
            </a>
          )}
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">{role}</span>
      </div>
      <div className="relative max-w-xl text-sm leading-relaxed text-gray-500 dark:text-gray-400 transition-all duration-300">
        {children}
      </div>
    </div>
  );
}
