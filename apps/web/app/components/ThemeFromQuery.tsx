"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

/**
 * Applies ?theme=dark or ?theme=light from the URL, so links can be shared
 * pinned to a specific theme. Native document navigation applies the initial
 * query before paint; popstate also covers same-document browser history.
 *
 * The lastApplied guard makes this apply only when the param VALUE changes —
 * never on unrelated re-renders — so the user's theme toggle isn't overridden
 * while the old param is still in the URL (ThemeToggle updates the param).
 */
export function ThemeFromQuery() {
  const { setTheme } = useTheme();
  const lastApplied = useRef<string | null>(null);

  useEffect(() => {
    const apply = () => {
      const theme = new URLSearchParams(window.location.search).get("theme");
      if ((theme === "dark" || theme === "light") && lastApplied.current !== theme) {
        lastApplied.current = theme;
        setTheme(theme);
      }
    };
    apply();
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
  }, [setTheme]);

  return null;
}
