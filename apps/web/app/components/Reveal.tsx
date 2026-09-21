"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { reducedMotion } from "./animations";

/**
 * Scroll reveal: a section drifts up while it sharpens from a soft blur and
 * fades in — a focus-pull rather than a slide. Fires once, when ~15% of the
 * block enters the viewport. Above-the-fold content is immediately readable.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  id,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  /**
   * Anchor id for the site menu's `/#<id>` links. `scroll-mt-24` (applied by the
   * caller) keeps the target clear of the fixed menu; the id lives on the same
   * element the IntersectionObserver watches, which the browser forces layout on
   * when scrolling to a hash, so a `content-visibility:auto` section still lands
   * correctly.
   */
  id?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (reducedMotion() || !("IntersectionObserver" in window)) {
      element.style.contentVisibility = "visible";
      return;
    }
    let observed = false;
    let animation: Animation | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        // IntersectionObserver batches geometry reads after layout. Measuring
        // each section and then changing its style during hydration forced a
        // separate synchronous layout for every section before the first paint.
        if (!observed) {
          observed = true;
          if (entry.boundingClientRect.top < window.innerHeight) {
            element.style.contentVisibility = "visible";
            observer.disconnect();
            return;
          }
          element.style.opacity = "0";
        }
        if (!entry.isIntersecting) return;
        element.style.contentVisibility = "visible";
        observer.disconnect();
        element.style.opacity = "1";
        animation = element.animate(
          [
            { opacity: 0, transform: "translateY(32px) scale(0.985)", filter: "blur(12px)" },
            { opacity: 1, transform: "none", filter: "blur(0px)" },
          ],
          {
            duration: 1100,
            delay: delay * 1000,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "backwards",
          },
        );
      },
      { threshold: 0.15 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      animation?.cancel();
      element.style.opacity = "1";
    };
  }, [delay]);
  return (
    <div id={id} ref={ref} className={`w-full ${id ? "scroll-mt-24" : ""} ${className}`}>
      {children}
    </div>
  );
}
