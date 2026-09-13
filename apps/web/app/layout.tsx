import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { OWNER_NAME, SITE_DESCRIPTION, SITE_URL } from "./data/siteMeta";
import { ThemeProvider } from "./providers";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

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
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} antialiased transition-colors duration-300`}>
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
