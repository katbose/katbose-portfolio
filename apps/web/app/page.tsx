import { ArrowUpRight } from "lucide-react";
import { Icon } from "./components/icons";
import { PortfolioShell } from "./components/PortfolioShell.client";
import { Reveal } from "./components/Reveal";
import { SectionRenderer } from "./components/sections/registry";
import { generateMarkdown } from "./data/generateMarkdown";
import { MARKDOWN_TIME_TOKEN } from "./data/localTime";
import { portfolio } from "./data/portfolio";
import { DOCS_URL } from "./data/siteMeta";

export default function Home() {
  const timezone =
    portfolio.sections.find((section) => section.type === "hero")?.data.timezone.tz ??
    "Asia/Kolkata";
  return (
    <PortfolioShell
      siteUrl={portfolio.meta.siteUrl}
      docsUrl={DOCS_URL}
      timezone={timezone}
      markdownTemplate={generateMarkdown(portfolio, MARKDOWN_TIME_TOKEN)}
      navigationLinks={
        <>
          {portfolio.socials.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
              className="text-gray-500 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors hover:scale-110"
            >
              <Icon name={social.icon} className="h-5 w-5" />
            </a>
          ))}
          <a
            href={portfolio.meta.calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Calendar"
            className="text-gray-500 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors hover:scale-110"
          >
            <Icon name="calendar" className="h-5 w-5" />
          </a>
        </>
      }
    >
      {/* Featured pill: small, first thing seen, links to the featured page */}
      {portfolio.meta.featured && (
        <Reveal delay={0} className="mb-10">
          <a
            href={portfolio.meta.featured.href}
            className="group inline-flex max-w-full items-center gap-2 rounded-full border border-gray-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-900/80 py-1.5 pl-1.5 pr-3 shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/90 dark:hover:bg-zinc-900"
          >
            <span className="rounded-full bg-black dark:bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white dark:text-black">
              {portfolio.meta.featured.tag}
            </span>
            <span className="truncate text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors group-hover:text-black dark:group-hover:text-white">
              {portfolio.meta.featured.title}
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-black dark:group-hover:text-white" />
          </a>
        </Reveal>
      )}

      {portfolio.sections.map((section, i) => (
        <Reveal
          key={i}
          delay={section.type === "hero" ? 0 : 0.05}
          className={
            section.type === "hero"
              ? "flex flex-col items-center"
              : "[content-visibility:auto] [contain-intrinsic-size:auto_600px]"
          }
        >
          <SectionRenderer section={section} ctx={{ socials: portfolio.socials }} />
        </Reveal>
      ))}
    </PortfolioShell>
  );
}
