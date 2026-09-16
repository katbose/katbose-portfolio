"use client";

import { lazy, Suspense, useEffect, useState } from "react";

// Analytics does not contribute to the server document or its first paint.
const Analytics = lazy(() =>
  import("@vercel/analytics/next").then((module) => ({ default: module.Analytics })),
);

export function DeferredAnalytics() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? (
    <Suspense fallback={null}>
      <Analytics />
    </Suspense>
  ) : null;
}
