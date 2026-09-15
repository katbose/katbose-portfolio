import type { NextConfig } from "next";

/**
 * There is deliberately no handling for `/docs` here.
 *
 * The documentation is a Mintlify site on its own subdomain
 * (`docs.katbose.dev`), which Mintlify serves directly. Nothing on this domain
 * proxies, rewrites, or redirects to it, and `/docs` is not a route in this app.
 *
 * An earlier arrangement served the docs at `katbose.dev/docs`, which required a
 * rewrite at the hosting layer in production plus a dev-only redirect to
 * `mint dev` here. A subdomain removes both: the Menu badge links straight to
 * the right origin via `DOCS_URL` in `app/data/siteMeta.ts`, which swaps in the
 * local Mintlify port during development.
 */
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
};

export default nextConfig;
