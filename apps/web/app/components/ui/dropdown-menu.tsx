"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";

/**
 * Dropdown menu, ported from shadcn/ui's Base UI component over the installed
 * `@base-ui/react` Menu primitive (already a dependency).
 *
 * Same adaptation as `ui/breadcrumb.tsx`: every `data-slot` is preserved so the
 * DOM contract matches upstream, but the `cn()` helper and the `cn-dropdown-*`
 * classes from shadcn's CSS layer are replaced with inline Tailwind in this
 * project's idiom, since the repo ships neither `cn` nor that stylesheet.
 *
 * Only the parts this site uses are included — Root, Trigger, Positioner +
 * Popup (as `Content`), Item, LinkItem, GroupLabel, Separator. The checkbox,
 * radio, submenu, and shortcut parts from upstream are omitted; add them back
 * from the registry if a future menu needs them.
 *
 * `DropdownMenuContent` exposes `side`/`align`/`sideOffset` so a caller can open
 * the menu upward (desktop, anchored bottom-right) or downward (mobile,
 * anchored top-left). The popup animates from its transform origin and is
 * capped to the available height Base UI computes.
 */
/**
 * Left modal (Base UI's default), so opening the menu locks page scroll.
 *
 * Do not reach for `modal={false}` to avoid the scrollbar-width layout shift.
 * Base UI's own scroll lock already compensates: it detects whether scrollbars
 * occupy layout space and, when they do, applies `scrollbar-gutter: stable` for
 * the duration of the lock. Disabling the modal state only trades the shift for
 * a worse problem — a page that scrolls underneath an open menu.
 */
export function DropdownMenu(props: ComponentProps<typeof MenuPrimitive.Root>) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

export function DropdownMenuTrigger(props: ComponentProps<typeof MenuPrimitive.Trigger>) {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

/**
 * Popup shell.
 *
 * `w-max` sizes to the widest row and nothing more. There is deliberately no
 * `min-w-*`: any floor wider than the content reintroduces the dead space beside
 * short labels that this menu is meant to avoid (a `min-w-32` floor left ~33px
 * empty next to "Experience"). The `max-w` clamp keeps it inside the viewport on
 * a 320px phone, and `max-h` + scroll covers short/landscape viewports.
 */
const POPUP_CLASS =
  "z-50 w-max max-w-[calc(100vw-2rem)] max-h-[min(24rem,var(--available-height))] origin-(--transform-origin) overflow-y-auto rounded-lg border border-gray-200 bg-white/95 p-1 text-[13px] shadow-lg backdrop-blur-md outline-none dark:border-zinc-700 dark:bg-zinc-900/95 " +
  "transition-[opacity,transform] duration-150 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:scale-95";

export function DropdownMenuContent({
  className = "",
  side = "bottom",
  align = "start",
  sideOffset = 8,
  ...props
}: ComponentProps<typeof MenuPrimitive.Popup> &
  Pick<ComponentProps<typeof MenuPrimitive.Positioner>, "side" | "align" | "sideOffset">) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        side={side}
        align={align}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={`${POPUP_CLASS} ${className}`}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

/**
 * Row styling, shared by items, link-items, and the submenu trigger so every
 * row lines up on the same grid.
 *
 * Row height is 32px on touch (`py-2`) and 28px from `sm` up (`sm:py-1.5`). The
 * 4px difference is deliberately small: an earlier `py-2.5` gave 36px rows, which
 * made the mobile menu visibly airier than the desktop one for no real gain.
 * 32px still clears the 24px WCAG 2.5.8 AA target minimum with margin, which
 * matters here because adjacent rows are navigation links and a mis-tap sends you
 * to the wrong page.
 *
 * `whitespace-nowrap` keeps labels on one line so `w-max` on the popup can
 * measure them and size to fit.
 */
const ITEM_CLASS =
  "flex cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-md px-2.5 py-2 leading-tight text-gray-600 outline-none transition-colors data-[highlighted]:bg-gray-100 data-[highlighted]:text-black data-[popup-open]:bg-gray-100 data-[popup-open]:text-black sm:py-1.5 dark:text-gray-300 dark:data-[highlighted]:bg-zinc-800 dark:data-[highlighted]:text-white dark:data-[popup-open]:bg-zinc-800 dark:data-[popup-open]:text-white [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0";

export function DropdownMenuItem({
  className = "",
  ...props
}: ComponentProps<typeof MenuPrimitive.Item>) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={`${ITEM_CLASS} ${className}`}
      {...props}
    />
  );
}

/**
 * A navigation link styled as a menu item. Renders a real `<a>` (via Base UI's
 * `MenuLinkItem`), so these are crawlable, middle-clickable links rather than
 * JS-only handlers. Defaults to closing the menu on click, which a nav link
 * should.
 */
export function DropdownMenuLinkItem({
  className = "",
  closeOnClick = true,
  ...props
}: ComponentProps<typeof MenuPrimitive.LinkItem>) {
  return (
    <MenuPrimitive.LinkItem
      data-slot="dropdown-menu-link-item"
      closeOnClick={closeOnClick}
      className={`${ITEM_CLASS} ${className}`}
      {...props}
    />
  );
}

/**
 * A non-interactive section heading inside the menu (e.g. "More").
 *
 * Upstream's `DropdownMenuLabel` wraps Base UI's `MenuPrimitive.GroupLabel`,
 * which throws unless it is rendered inside a `Menu.Group`. This menu uses the
 * label as a plain divider heading, not as the label of a grouped set, so it is
 * a styled `<div>` with the same `data-slot` rather than the group-scoped
 * primitive — no group context required.
 */
export function DropdownMenuLabel({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="dropdown-menu-label"
      className={`px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 ${className}`}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className = "",
  ...props
}: ComponentProps<typeof MenuPrimitive.Separator>) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={`-mx-1 my-1 h-px bg-gray-200 dark:bg-zinc-700 ${className}`}
      {...props}
    />
  );
}

/**
 * Submenu (flyout) parts. `DropdownMenuSub` groups a trigger and its content;
 * the trigger opens a nested popup to the side. Reuses the same `POPUP_CLASS`
 * and `ITEM_CLASS` so the flyout matches the parent menu exactly.
 */
export function DropdownMenuSub(props: ComponentProps<typeof MenuPrimitive.SubmenuRoot>) {
  return <MenuPrimitive.SubmenuRoot {...props} />;
}

export function DropdownMenuSubTrigger({
  className = "",
  children,
  // Which side the chevron sits on, so it always points the way the flyout
  // opens: "right" (upstream's default) for a left-aligned menu whose submenu
  // opens rightward, "left" when the menu is right-aligned and opens leftward.
  //
  // The auto margin pushes the chevron to the row's outer edge, away from the
  // label, matching how upstream anchors it and keeping it clear of the text.
  chevronSide = "right",
  ...props
}: ComponentProps<typeof MenuPrimitive.SubmenuTrigger> & { chevronSide?: "left" | "right" }) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      className={`${ITEM_CLASS} ${className}`}
      {...props}
    >
      {chevronSide === "left" && <ChevronLeft className="mr-auto" />}
      {children}
      {chevronSide === "right" && <ChevronRight className="ml-auto" />}
    </MenuPrimitive.SubmenuTrigger>
  );
}

export function DropdownMenuSubContent({
  className = "",
  // A submenu opens to the side of its trigger, aligned to the trigger's top.
  side = "right",
  align = "start",
  sideOffset = 4,
  ...props
}: ComponentProps<typeof MenuPrimitive.Popup> &
  Pick<ComponentProps<typeof MenuPrimitive.Positioner>, "side" | "align" | "sideOffset">) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        side={side}
        align={align}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-sub-content"
          className={`${POPUP_CLASS} ${className}`}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}
