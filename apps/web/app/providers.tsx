"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ThemeFromQuery } from "./components/ThemeFromQuery";

/**
 * Theme context for the whole app.
 *
 * There is deliberately no `mounted` guard here, and adding one back would
 * reintroduce two bugs at once.
 *
 * next-themes works by rendering a small blocking inline <script> during the
 * server render. That script reads the stored preference (or the system one) and
 * sets the class on <html> before the first paint, which is the only way to
 * avoid a flash of the wrong theme. Gating this provider behind a mount effect
 * means it never renders on the server, so:
 *
 *   1. The script is absent from the server HTML, and every visitor whose theme
 *      is dark gets a flash of light theme until hydration finishes.
 *   2. The script instead gets rendered on the client, where React 19 refuses to
 *      execute inline scripts and logs "Encountered a script tag while rendering
 *      React component".
 *
 * The hydration mismatch a mount guard is usually reaching for is handled the
 * way next-themes intends: `suppressHydrationWarning` on <html> in layout.tsx.
 * That is scoped to the one attribute the script legitimately changes.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem={true}>
      <ThemeFromQuery />
      {children}
    </NextThemesProvider>
  );
}
