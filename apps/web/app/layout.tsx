import type { Metadata } from "next";
import { preload } from "react-dom";
import "./globals.css";
import { DeferredAnalytics } from "./components/Analytics.client";
import { OWNER_NAME, SITE_DESCRIPTION, SITE_URL } from "./data/siteMeta";
import { ThemeProvider } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: OWNER_NAME,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: OWNER_NAME,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: OWNER_NAME,
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: OWNER_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: OWNER_NAME,
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  for (const href of [
    "/fonts/dm-sans-latin-13971731025ec697.woff2",
    "/fonts/dm-sans-latin-ext-7ab938503e4547a1.woff2",
  ]) {
    preload(href, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  }
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply shared theme links before next-themes reads storage, avoiding
            a full-page repaint from the system theme after hydration. */}
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static source; no user values are interpolated into executable code
          dangerouslySetInnerHTML={{
            __html: `try{var t=new URLSearchParams(location.search).get("theme");if(t==="light"||t==="dark")localStorage.setItem("theme",t)}catch{}`,
          }}
        />
      </head>
      <body className="antialiased transition-colors duration-300">
        <ThemeProvider>{children}</ThemeProvider>
        {process.env.VERCEL === "1" && <DeferredAnalytics />}
      </body>
    </html>
  );
}
