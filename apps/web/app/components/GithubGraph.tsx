"use client";

import { useTheme } from "next-themes";
import { lazy, Suspense, useEffect, useRef, useState } from "react";

const GitHubCalendar = lazy(() =>
  import("react-github-calendar").then((module) => ({ default: module.GitHubCalendar })),
);

export function GithubGraph({ username }: { username: string }) {
  const { resolvedTheme } = useTheme();
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    // The calendar is far below the fold. Fetch its code and data only as the
    // reader approaches it, without delaying the rest of the portfolio.
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={container} className="w-full overflow-x-auto pb-4 scrollbar-hide">
      <div className="flex min-h-4 min-w-max justify-center text-xs px-4">
        {visible && (
          <Suspense fallback={null}>
            <GitHubCalendar
              username={username}
              colorScheme={resolvedTheme === "dark" ? "dark" : "light"}
              blockSize={10}
              blockMargin={4}
              fontSize={12}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
