/** Browser-native animations keep layout/content usable without a runtime library. */
export function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function enterPanel(element: HTMLElement, duration = 350): Animation | undefined {
  if (reducedMotion()) return;
  return element.animate(
    [
      { opacity: 0, transform: "translateY(10px)" },
      { opacity: 1, transform: "none" },
    ],
    { duration, easing: "cubic-bezier(0, 0, 0.58, 1)" },
  );
}

/** Samples the existing mass=1, stiffness=260, damping=15 navbar spring. */
export function enterNavbar(element: HTMLElement): Animation | undefined {
  if (reducedMotion()) return;
  const decay = 15 / 2;
  const frequency = Math.sqrt(260 - decay * decay);
  const frames = Array.from({ length: 61 }, (_, index) => {
    const time = index / 60;
    const remaining =
      index === 60
        ? 0
        : Math.exp(-decay * time) *
          (Math.cos(frequency * time) + (decay / frequency) * Math.sin(frequency * time));
    return {
      offset: time,
      opacity: Math.min(1, Math.max(0, 1 - remaining)),
      transform: `translateX(-50%) translateY(${60 * remaining}px) scale(${1 - 0.2 * remaining})`,
    };
  });
  return element.animate(frames, { duration: 1000, easing: "linear" });
}
