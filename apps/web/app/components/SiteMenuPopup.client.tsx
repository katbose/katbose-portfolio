"use client";

import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { SITE_MENU } from "../data/siteMenu";
import { SITE_MENU_TRIGGER_CLASS, SITE_MENU_TRIGGER_LABEL } from "./siteMenuTrigger";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

/**
 * The real menu, loaded on demand by `SiteMenu`.
 *
 * Split into its own module so `@base-ui/react`'s Menu — the single largest
 * client dependency this site has — stays out of every route's initial bundle.
 * The menu appears on every page, so importing it eagerly pushed `/` and
 * `/explore` past their client JavaScript budgets.
 *
 * It renders its own trigger, styled from `siteMenuTrigger` so it is
 * indistinguishable from the placeholder it replaces. Base UI's Positioner
 * anchors to that trigger, which is why the trigger has to live here rather than
 * staying behind in the wrapper.
 */

/**
 * Tracks the one breakpoint this menu cares about: Tailwind's `sm` (640px).
 *
 * That single value drives everything directional, because it is the same
 * breakpoint the caller uses to move the button (`sm:bottom-6 sm:right-6`).
 * Below it the button is top-left, so the menu drops down and reads left to
 * right; at or above it the button is bottom-right, so the menu opens upward and
 * reads right to left. Phones land below; tablets and desktops land above and
 * get identical behaviour, which is why no third branch is needed.
 *
 * It has to be JS rather than CSS: Base UI's Positioner takes a single
 * `side`/`align` value, not a responsive one.
 */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

/**
 * `defaultOpen` is set when the wrapper was activated by a click rather than by
 * hover or focus: the click that mounted this component cannot also reach the
 * trigger that did not exist yet, so the menu opens itself to honour it.
 */
export default function SiteMenuPopup({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const isDesktop = useIsDesktop();

  // One alignment decision, applied to every row in both the menu and its
  // flyout, so nothing can drift out of alignment with the rest.
  const rowAlign = isDesktop ? "justify-end" : "";

  return (
    <DropdownMenu defaultOpen={defaultOpen}>
      <DropdownMenuTrigger aria-label={SITE_MENU_TRIGGER_LABEL} className={SITE_MENU_TRIGGER_CLASS}>
        <Menu className="h-4 w-4" />
        <span className="hidden sm:inline">Menu</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent side={isDesktop ? "top" : "bottom"} align={isDesktop ? "end" : "start"}>
        {SITE_MENU.primary.map((link) => (
          <DropdownMenuLinkItem key={link.href} href={link.href} className={rowAlign}>
            {link.label}
          </DropdownMenuLinkItem>
        ))}

        <DropdownMenuSeparator />

        {/* Secondary links nest in a flyout rather than crowding the main list. */}
        <DropdownMenuSub>
          {/* Chevron sits on the leading edge when right-aligned so it points
              toward the flyout, which opens leftward on desktop. */}
          <DropdownMenuSubTrigger className={rowAlign} chevronSide={isDesktop ? "left" : "right"}>
            More
          </DropdownMenuSubTrigger>
          {/* Opens away from the button: left on desktop (button bottom-right),
              right on mobile (button top-left). Its rows take the same alignment
              as the parent menu's. */}
          <DropdownMenuSubContent side={isDesktop ? "left" : "right"}>
            {SITE_MENU.more.map((link) => (
              <DropdownMenuLinkItem key={link.href} href={link.href} className={rowAlign}>
                {link.label}
              </DropdownMenuLinkItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
