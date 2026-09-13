import type { NextConfig } from "next";

/**
 * Where the Mintlify dev server runs. Must match the `--port` in
 * apps/docs/package.json.
 */
const DOCS_DEV_ORIGIN = "http://localhost:7003";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.simpleicons.org",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
    ],
  },

  /**
   * `/docs` is not a route in this app. It is a separate Mintlify site, mapped
   * onto this domain at the hosting layer in production.
   *
   * In development there is no hosting layer, so send the browser to the
   * Mintlify dev server instead. Two deliberate choices here:
   *
   * - A redirect, not a rewrite. `mint dev` serves its pages at the root and
   *   references its assets with root-absolute URLs (`/_next/...`,
   *   `/style.css`). Proxying `/docs` to it would return HTML whose assets
   *   resolve against :7000, 404, and render an unstyled page. Redirecting
   *   moves the browser's origin so the assets resolve correctly.
   *
   * - Temporary (307), never permanent. A 308 is cached by the browser against
   *   this origin, so a single visit in development would keep sending the
   *   production `/docs` to localhost long after the dev server was gone.
   *
   * Guarded on NODE_ENV so it can never shadow the production mapping.
   */
  async redirects() {
    if (process.env.NODE_ENV !== "development") return [];

    return [
      { source: "/docs", destination: DOCS_DEV_ORIGIN, permanent: false },
      { source: "/docs/:path*", destination: `${DOCS_DEV_ORIGIN}/:path*`, permanent: false },
    ];
  },
};

export default nextConfig;
