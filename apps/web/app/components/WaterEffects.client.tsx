"use client";

import { useTheme } from "next-themes";
import { lazy, Suspense, useEffect, useRef, useState } from "react";

function useMotionAllowed() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setAllowed(!preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  return allowed;
}

const FINE_POINTER = "(hover: hover) and (pointer: fine)";

function useFinePointer() {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia(FINE_POINTER);
    const update = () => setFine(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  return fine;
}

// WebGL shader — client-only, no SSR. The plain <img> underneath acts as the
// fallback until the canvas mounts.
const Water = lazy(() => import("./WaterShader.client"));

/** Theme-aware navbar water surface. Fills its positioned parent. */
export function WaterOverlay({
  onReady,
}: {
  /** Fires once the shader is initialized and its render loop is running. */
  onReady?: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const motionAllowed = useMotionAllowed();
  const finePointer = useFinePointer();

  // The library stamps `data-paper-shader` on its mount element at the exact
  // moment WebGL init completes and frames start rendering — watch for it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: must observe once on mount; re-running on a new onReady identity would re-fire the callback
  useEffect(() => {
    if (!onReady) return;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !window.matchMedia(FINE_POINTER).matches
    ) {
      onReady();
      return;
    }
    const el = wrapRef.current;
    if (!el) return;
    if (el.querySelector("[data-paper-shader]")) {
      onReady();
      return;
    }
    const observer = new MutationObserver(() => {
      if (el.querySelector("[data-paper-shader]")) {
        observer.disconnect();
        onReady();
      }
    });
    observer.observe(el, { subtree: true, attributes: true, childList: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      data-testid="water-overlay"
      className="pointer-events-none absolute inset-0 -z-10"
    >
      {motionAllowed && finePointer ? (
        <Suspense fallback={null}>
          <Water
            className="absolute inset-0 [&_canvas]:absolute [&_canvas]:inset-0 [&_canvas]:block [&_canvas]:h-full [&_canvas]:w-full"
            colorBack="#00000000"
            colorHighlight={resolvedTheme === "dark" ? "#475569" : "#2563eb"}
            highlights={resolvedTheme === "dark" ? 0.22 : 0.45}
            layering={0.4}
            edges={0}
            waves={0.15}
            caustic={0.15}
            size={0.4}
            speed={0.35}
            fit="cover"
          />
        </Suspense>
      ) : (
        // CSS follows the pre-paint root theme without changing SSR attributes.
        // resolvedTheme is browser-only and is safe only in the mounted shader.
        <div className="water-sheen absolute inset-0 text-[#2563eb] opacity-45 dark:text-[#475569] dark:opacity-[0.22]" />
      )}
    </div>
  );
}

/** Image with an animated water effect over it. Must be placed inside a
 *  `relative` container that defines the size. */
export function WaterImageEffect({ src, alt }: { src: string; alt: string }) {
  const image = useRef<HTMLImageElement>(null);
  const [visible, setVisible] = useState(false);
  const motionAllowed = useMotionAllowed();
  useEffect(() => {
    const element = image.current;
    if (!element) return;
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
    <>
      {/* biome-ignore lint/performance/noImgElement: same src is handed to the WebGL shader; next/image would rewrite the URL */}
      <img
        ref={image}
        src={visible ? src : undefined}
        alt={alt}
        data-testid="water-image"
        className="h-full w-full object-cover"
        loading="lazy"
      />
      <noscript>
        {/* biome-ignore lint/performance/noImgElement: server-optimized URL; native fallback for JavaScript-disabled readers */}
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      </noscript>
      {visible && motionAllowed && (
        <Suspense fallback={null}>
          <Water
            className="absolute inset-0 h-full w-full [&_canvas]:absolute [&_canvas]:inset-0 [&_canvas]:block [&_canvas]:h-full [&_canvas]:w-full"
            image={src}
            scale={1}
            colorBack="#00000000"
            colorHighlight="#ffffff"
            highlights={0.12}
            layering={0}
            edges={0}
            waves={0}
            caustic={0.07}
            size={0.7}
            speed={0.35}
            fit="cover"
          />
        </Suspense>
      )}
    </>
  );
}
