import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { SiteMenu } from "./SiteMenu.client";
import { ThemeToggle } from "./ThemeToggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";

export function ArchiveShell({
  label,
  heading,
  breadcrumb,
  children,
}: {
  label: string;
  heading: string;
  breadcrumb: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center bg-white dark:bg-black px-3 pt-16 text-black dark:text-white selection:bg-black dark:selection:bg-white selection:text-white dark:selection:text-black pb-32 sm:px-4 sm:pt-24 sm:pb-40 overflow-x-hidden transition-colors duration-300">
      {/* Theme Toggle in Top Right */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Menu sits top left on mobile and bottom right on desktop. */}
      <div className="fixed top-6 left-4 z-40 flex sm:top-auto sm:bottom-6 sm:left-auto sm:right-6">
        <SiteMenu />
      </div>

      {/* max-w-2xl matches the portfolio's own column, so the media rows keep the
          same proportions as the homepage podcast cards they're modelled on. */}
      <main className="flex w-full max-w-2xl flex-col text-left">
        {/* Replaces the old "← Back to portfolio" link: the trail already leads
            home, and the bottom island nav still offers the one-tap route. */}
        <Breadcrumb className="mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{breadcrumb}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <span className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
          {label}
        </span>
        <h1 className="mb-12 text-3xl font-bold tracking-tight sm:text-4xl">{heading}</h1>

        {children}
      </main>

      {/* Bottom island nav, matching the portfolio */}
      <nav className="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full border border-gray-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-900/80 px-5 py-3 shadow-sm backdrop-blur-md transition-all hover:bg-white/90 dark:hover:bg-zinc-900">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-300 transition-colors hover:text-black dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Portfolio
        </a>
      </nav>
    </div>
  );
}
