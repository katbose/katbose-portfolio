"use client";

import { Menu } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { SITE_MENU_TRIGGER_CLASS, SITE_MENU_TRIGGER_LABEL } from "./siteMenuTrigger";

/** Resolved once; both `lazy` and the warm-up below share this module promise. */
const importPopup = () => import("./SiteMenuPopup.client");

const SiteMenuPopup = lazy(importPopup);

/**
 * The floating Menu button, present on every page.
 *
 * Only the button ships in the initial bundle. `@base-ui/react`'s Menu is the
 * heaviest client dependency here, and because this button appears on every
 * route, importing it eagerly pushed `/` and `/explore` over their client
 * JavaScript budgets (`scripts/bundle-report.ts`). Deferring it follows the
 * pattern already used for `QRDialog`, `GithubGraph`, the water shader, and the
 * animated theme toggler.
 *
 * The placeholder is a real `<button>` with the trigger's exact classes and
 * accessible name, so the swap to Base UI's trigger is invisible and the control
 * is keyboard-reachable before the chunk arrives.
 *
 * Note what hovering does and does not do. It only warms the module cache — it
 * must not mount the popup. Mounting on hover replaces the placeholder mid-
 * gesture, and since a mouse click fires `pointerenter` immediately before
 * `click`, the placeholder would unmount before its own click handler ran and the
 * first click would be swallowed. Warming leaves the placeholder in place, so the
 * click always lands, and by then the chunk is usually already parsed.
 */
export function SiteMenu() {
  const [opened, setOpened] = useState(false);

  // Fire-and-forget: the returned promise is the same one `lazy` will await, so
  // this only moves the network and parse cost earlier.
  const warm = () => {
    void importPopup();
  };

  if (!opened) {
    return (
      <button
        type="button"
        aria-label={SITE_MENU_TRIGGER_LABEL}
        className={SITE_MENU_TRIGGER_CLASS}
        onPointerEnter={warm}
        onFocus={warm}
        onClick={() => setOpened(true)}
      >
        <Menu className="h-4 w-4" />
        <span className="hidden sm:inline">Menu</span>
      </button>
    );
  }

  return (
    <Suspense
      fallback={
        <button
          type="button"
          aria-label={SITE_MENU_TRIGGER_LABEL}
          className={SITE_MENU_TRIGGER_CLASS}
        >
          <Menu className="h-4 w-4" />
          <span className="hidden sm:inline">Menu</span>
        </button>
      }
    >
      {/* Opens on mount: the click that got us here landed on the placeholder,
          not on the Base UI trigger that did not exist yet. */}
      <SiteMenuPopup defaultOpen />
    </Suspense>
  );
}
