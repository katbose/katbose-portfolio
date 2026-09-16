"use client";

import { ArrowUpRight, Bot, Check, Copy, Menu, QrCode, User } from "lucide-react";
import { useTheme } from "next-themes";
import {
  lazy,
  type ReactNode,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { formatLocalTime, stampMarkdown } from "../data/localTime";
import { enterNavbar, enterPanel, reducedMotion } from "./animations";
import { ThemeToggle } from "./ThemeToggle";
import { WaterOverlay } from "./WaterEffects.client";

const QRDialog = lazy(() => import("./QRDialog.client"));

interface PortfolioShellProps {
  children: ReactNode;
  navigationLinks: ReactNode;
  markdownTemplate: string;
  timezone: string;
  siteUrl: string;
  docsUrl: string;
}

export function PortfolioShell({
  children,
  navigationLinks,
  markdownTemplate,
  timezone,
  siteUrl,
  docsUrl,
}: PortfolioShellProps) {
  const [markdownContent, setMarkdownContent] = useState(markdownTemplate);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );
  const [showQR, setShowQR] = useState(false);
  const [mode, setMode] = useState<"human" | "agent">("human");
  const main = useRef<HTMLElement>(null);
  const navbar = useRef<HTMLElement>(null);
  const exitAnimation = useRef<Animation | null>(null);
  const switching = useRef(false);
  useEffect(
    () => () => {
      exitAnimation.current?.cancel();
    },
    [],
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: mode replaces the keyed main element; animate that new node after the swap
  useLayoutEffect(() => {
    // Initial server content is visible immediately; subsequent mode changes
    // retain the entrance transition after the old view has exited.
    if (!switching.current || !main.current) return;
    switching.current = false;
    const animation = enterPanel(main.current);
    return () => animation?.cancel();
  }, [mode]);
  const [copied, setCopied] = useState(false);
  const { resolvedTheme } = useTheme();

  // Hold the navbar entrance until its water shader is rendering, so it never
  // pops in half-drawn. The timeout is a fallback for browsers without WebGL.
  const [navReady, setNavReady] = useState(false);
  useLayoutEffect(() => {
    if (!navReady || !navbar.current) return;
    const animation = enterNavbar(navbar.current);
    return () => animation?.cancel();
  }, [navReady]);
  useEffect(() => {
    const fallback = setTimeout(() => setNavReady(true), 1600);
    return () => clearTimeout(fallback);
  }, []);

  // Escape closes the QR dialog, which is the behaviour a role="dialog" promises.
  useEffect(() => {
    if (!showQR) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowQR(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showQR]);

  const [copyFailed, setCopyFailed] = useState(false);
  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdownContent);
      setCopyFailed(false);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  };

  const toggleMode = async () => {
    if (switching.current) return;
    switching.current = true;
    if (main.current && !reducedMotion()) {
      const animation = main.current.animate(
        [
          { opacity: 1, transform: "none" },
          { opacity: 0, transform: "translateY(-10px)" },
        ],
        { duration: 350, easing: "cubic-bezier(0, 0, 0.58, 1)", fill: "forwards" },
      );
      exitAnimation.current = animation;
      try {
        await animation.finished;
      } catch {
        switching.current = false;
        return;
      }
    }
    if (mode === "human") {
      setMarkdownContent(stampMarkdown(markdownTemplate, formatLocalTime(timezone)));
      setCopied(false);
      setCopyFailed(false);
    }
    setMode(mode === "human" ? "agent" : "human");
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-white dark:bg-black px-3 pt-16 text-black dark:text-white selection:bg-black dark:selection:bg-white selection:text-white dark:selection:text-black pb-32 sm:px-4 sm:pt-24 sm:pb-40 overflow-x-hidden transition-colors duration-300">
      {/* Theme Toggle in Top Right */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Menu badge, tucked in the lower-right corner. Points at the Mintlify
          docs, which are a separate site on their own subdomain — so this is a
          cross-origin link, not a route in this app. `DOCS_URL` swaps in the
          local `mint dev` server during development.

          The label is hidden below `sm`, so the aria-label carries the accessible
          name on small screens. It opens with the visible word "Menu" so the
          accessible name still contains the visible label. */}
      <a
        href={docsUrl}
        aria-label="Menu — documentation for this site"
        title="Documentation: architecture, local development, and changelog"
        className="group fixed bottom-24 right-4 z-40 inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-900/80 px-2.5 py-2 text-xs font-medium text-gray-500 shadow-sm backdrop-blur-md transition-colors hover:text-black dark:text-gray-400 dark:hover:text-white sm:bottom-6 sm:right-6 sm:px-3"
      >
        <Menu className="h-4 w-4" />
        <span className="hidden sm:inline">Menu</span>
        <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </a>

      {mode === "agent" ? (
        /* Agent Mode - Markdown View */
        <main
          ref={main}
          key="agent"
          className="flex w-full max-w-2xl flex-col items-start text-left px-4 sm:px-0"
        >
          <button
            type="button"
            onClick={copyMarkdown}
            className="mb-6 inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-80 active:scale-95 dark:bg-white dark:text-black"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy Markdown"}
          </button>
          {copyFailed && (
            <p role="status" className="mb-4 text-sm">
              Could not copy. Select the Markdown below and copy it manually.
            </p>
          )}
          <pre className="w-full whitespace-pre-wrap font-sans text-sm leading-relaxed text-black dark:text-gray-300 selection:bg-black dark:selection:bg-white selection:text-white dark:selection:text-black antialiased">
            {markdownContent}
          </pre>
        </main>
      ) : (
        /* Human Mode - Data-driven sections */
        <main
          ref={main}
          key="human"
          className="flex w-full max-w-2xl flex-col items-center text-center"
        >
          {children}
        </main>
      )}

      {/* Glass Island Navbar */}
      <nav
        ref={navbar}
        style={{ opacity: navReady ? 1 : 0, transform: "translateX(-50%)" }}
        className="fixed bottom-6 left-1/2 flex items-center gap-3 overflow-hidden rounded-full border border-gray-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-900/80 px-4 py-3 shadow-sm backdrop-blur-md transition-colors hover:bg-white/90 dark:hover:bg-zinc-900 sm:gap-6 sm:px-6"
      >
        {/* Glass shine — edge highlight replays on load and on theme toggle
            (the key change remounts the span, restarting the CSS animation) */}
        <span
          key={resolvedTheme}
          aria-hidden
          className="nav-edge-shine pointer-events-none absolute inset-0 -z-10 rounded-full"
        />
        {/* Water surface behind the icons — bluish on white, slate on dark */}
        <WaterOverlay onReady={() => setNavReady(true)} />
        {/* Mode Toggle Switch */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={toggleMode}
            className="group relative flex h-7 w-12 cursor-pointer rounded-full bg-gray-200 dark:bg-zinc-700 p-1 transition-colors duration-200 ease-in-out hover:bg-gray-300 dark:hover:bg-zinc-600 focus:outline-none"
            role="switch"
            aria-checked={mode === "agent"}
            title={`Switch to ${mode === "human" ? "agent" : "human"} mode`}
          >
            <div
              className={`flex h-5 w-5 transform items-center justify-center rounded-full bg-white dark:bg-white shadow-sm transition duration-200 ease-in-out ${
                mode === "agent" ? "translate-x-5" : "translate-x-0"
              }`}
            >
              {mode === "human" ? (
                <User className="h-3 w-3 text-black" />
              ) : (
                <Bot className="h-3 w-3 text-black" />
              )}
            </div>
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowQR(true)}
          className="text-gray-500 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors hover:scale-110"
          aria-label="Show QR Code"
        >
          <QrCode className="h-5 w-5" />
        </button>
        <div className="h-6 w-px bg-gray-200 dark:bg-zinc-700" />
        {navigationLinks}
      </nav>

      {showQR && (
        <Suspense fallback={null}>
          <QRDialog
            siteUrl={siteUrl}
            theme={resolvedTheme === "dark" ? "dark" : "light"}
            onClose={() => setShowQR(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
