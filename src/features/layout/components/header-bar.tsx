"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Menu,
  MessageCircle,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";
import { Popover } from "@base-ui/react/popover";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/currency";
import { useCart } from "@/providers/CartProvider";
import { HeaderSearch } from "@/features/search/components/header-search";
import type { NavLink } from "@/lib/site-nav";

export interface HouseLink {
  label: string;
  href: string;
}

export interface HeaderLabels {
  /** Skip link and scroll landmark text. */
  nav: string;
  houses: string;
  search: string;
  searchPlaceholder: string;
  searchSubmit: string;
  searchSuggestions: string;
  searchViewAll: string;
  searchResultsCount: string;
  searchNoResults: string;
  cart: string;
  menu: string;
  closeMenu: string;
  whatsapp: string;
  backToCart: string;
}

export interface HeaderBarProps {
  storeName: string;
  nav: NavLink[];
  houses: HouseLink[];
  labels: HeaderLabels;
  /** Checkout wears a reduced bar: logo + a way back to the cart, nothing else. */
  reduced?: boolean;
  /** wa.me link from data/contact.json; the mobile menu ends with it. */
  whatsappHref?: string;
  /** Cash-on-delivery + shipping note, already resolved from the helpers. */
  menuNote?: string;
}

/** Is this nav link the current route? Query strings never decide it. */
function isActiveRoute(pathname: string, href: string): boolean {
  const path = href.split("?")[0].replace(/\/+$/, "") || "/";
  if (path === "/shop") {
    return pathname === "/shop" || pathname.startsWith("/shop/");
  }
  return pathname === path || pathname === `${path}/`;
}

/**
 * HeaderBar — the site's one header, mounted by the root layout.
 *
 * 56px on phones, 64px from the desktop breakpoint up: translucent with a blur
 * where the browser supports it, a hairline only once the page has scrolled.
 * The bar is TEXT ONLY — the brand mark is the logo file painted as a CSS
 * background, so no <img> (and no product thumbnail) ever sits in the header,
 * its menus or its search suggestions.
 *
 * The smart hide is deliberately not React state: a rAF-throttled scroll
 * listener writes `data-hidden` on the element itself, so scrolling never
 * re-renders the bar. It stays put at the top, while the search/dropdown/sheet
 * is open (`data-locked`), while focus is inside it, and when the visitor asks
 * for reduced motion.
 */
export function HeaderBar({
  storeName,
  nav,
  houses,
  labels,
  reduced = false,
  whatsappHref,
  menuNote,
}: HeaderBarProps) {
  const cart = useCart();
  const pathname = usePathname() ?? "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [housesAnchor, setHousesAnchor] = useState<HTMLButtonElement | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  const locked = searchOpen || menuOpen || housesAnchor !== null;

  /* Show the bar immediately when something inside it takes over. */
  const reveal = useCallback(() => {
    const header = headerRef.current;
    if (header) header.dataset.hidden = "false";
  }, []);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let lastY = Math.max(0, window.scrollY);

    const update = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      header.dataset.scrolled = y > 4 ? "true" : "false";

      const focusInside = header.contains(document.activeElement);
      if (motion.matches || y <= 8 || header.dataset.locked === "true" || focusInside) {
        header.dataset.hidden = "false";
        lastY = y;
        return;
      }

      if (y > lastY + 4) header.dataset.hidden = "true";
      else if (y < lastY - 4) header.dataset.hidden = "false";
      lastY = y;
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    motion.addEventListener("change", schedule);
    header.addEventListener("focusin", reveal);

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      motion.removeEventListener("change", schedule);
      header.removeEventListener("focusin", reveal);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [reveal]);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    searchTriggerRef.current?.focus();
  }, []);

  /*
   * Focus for the mobile menu, done explicitly.
   *
   * The menu is a modal sheet, so it must take focus when it opens, keep Tab
   * inside it and hand focus back to the button that opened it. Base UI's
   * dialog parts do not move focus in this build, so the small amount of
   * behaviour a keyboard user needs is implemented here.
   */
  useEffect(() => {
    if (!menuOpen) return;
    const trigger = menuTriggerRef.current;
    const getPanel = () =>
      document.querySelector<HTMLElement>('[data-slot="sheet-content"]');

    const focusable = () => {
      const panel = getPanel();
      if (!panel) return [];
      return Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);
    };

    const inside = () => {
      const panel = getPanel();
      return panel ? panel.contains(document.activeElement) : false;
    };

    let frame = 0;
    const focusFirst = () => {
      if (!inside()) focusable()[0]?.focus();
      frame += 1;
      if (frame < 20 && !inside()) requestAnimationFrame(focusFirst);
    };
    focusFirst();
    const settle = setTimeout(() => {
      if (!inside()) focusable()[0]?.focus();
    }, 120);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!inside()) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      clearTimeout(settle);
      document.removeEventListener("keydown", onKeyDown, true);
      trigger?.focus();
    };
  }, [menuOpen]);

  return (
    <header
      ref={headerRef}
      data-locked={locked ? "true" : "false"}
      data-scrolled="false"
      data-hidden="false"
      className={cn(
        "sticky top-0 z-40 w-full",
        "h-14 lg:h-16",
        "border-b border-transparent",
        "bg-[var(--color-surface)]",
        "supports-[backdrop-filter]:bg-[var(--color-surface)]/80 supports-[backdrop-filter]:backdrop-blur-md",
        // Tailwind v4 hides with the `translate` property, so that is the
        // property the slide transition must name.
        "transition-[translate,background-color,border-color] duration-[var(--duration-base)] ease-[var(--ease-apple)]",
        "data-[scrolled=true]:border-[var(--color-border)]",
        "data-[hidden=true]:-translate-y-full",
        "motion-reduce:transition-none motion-reduce:data-[hidden=true]:translate-y-0",
      )}
    >
      <div className="relative mx-auto flex h-full w-full max-w-[1280px] items-center gap-3 px-4">
        {!reduced && (
          <Button
            ref={menuTriggerRef}
            variant="ghost"
            size="icon"
            onClick={() => {
              reveal();
              setMenuOpen(true);
            }}
            aria-label={labels.menu}
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            className="lg:hidden"
          >
            <Menu aria-hidden="true" />
          </Button>
        )}

        {/* ─── Brand mark (CSS background: text-only header, no <img>) ─── */}
        <Link
          href="/"
          aria-label={storeName}
          // Physical `left` on purpose: centring is symmetric, while
          // `start-1/2` in RTL anchors the right edge and shifts the mark one
          // logo-width off centre.
          className="flex shrink-0 items-center rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 max-lg:absolute max-lg:left-1/2 max-lg:-translate-x-1/2"
        >
          <span
            aria-hidden="true"
            className="block h-7 w-7 bg-contain bg-center bg-no-repeat lg:h-8 lg:w-8"
            style={{ backgroundImage: "url(/logos/logo.svg)" }}
          />
        </Link>

        {reduced ? (
          <Link
            href="/checkout"
            className="ms-auto text-caption font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
          >
            {labels.backToCart}
          </Link>
        ) : (
          <>
            {/* ─── Desktop nav ─── */}
            <nav
              aria-label={labels.nav}
              className="hidden flex-1 items-center justify-center gap-0.5 lg:flex"
            >
              {nav.map((item) => {
                const active = isActiveRoute(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative inline-flex h-10 items-center rounded-control px-3 text-caption font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2",
                      active
                        ? "text-[var(--color-brand)]"
                        : "text-[var(--color-text)] hover:text-[var(--color-brand)]",
                    )}
                  >
                    {item.label}
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-3 bottom-1 h-0.5 rounded-pill bg-[var(--color-brand)]"
                      />
                    )}
                  </Link>
                );
              })}

              {houses.length > 0 && (
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={housesAnchor !== null}
                  onClick={(event) => {
                    reveal();
                    setHousesAnchor((current) =>
                      current ? null : event.currentTarget,
                    );
                  }}
                  className="inline-flex h-10 items-center gap-1 rounded-control px-3 text-caption font-medium text-[var(--color-text)] transition-colors hover:text-[var(--color-brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
                >
                  {labels.houses}
                  <ChevronDown aria-hidden="true" className="size-4" />
                </button>
              )}

              {housesAnchor && (
                <Popover.Root
                  open
                  onOpenChange={(open) => {
                    if (!open) setHousesAnchor(null);
                  }}
                >
                  <Popover.Portal>
                    <Popover.Positioner
                      anchor={housesAnchor}
                      side="bottom"
                      align="start"
                      sideOffset={6}
                      className="z-50"
                    >
                      <Popover.Popup
                        initialFocus
                        finalFocus={() => housesAnchor}
                        className="flex w-44 flex-col gap-1 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-caption shadow-lifted"
                      >
                        {houses.map((house) => (
                          <Link
                            key={house.href}
                            href={house.href}
                            onClick={() => setHousesAnchor(null)}
                            className="rounded-control px-2.5 py-2 text-caption text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
                          >
                            {house.label}
                          </Link>
                        ))}
                      </Popover.Popup>
                    </Popover.Positioner>
                  </Popover.Portal>
                </Popover.Root>
              )}
            </nav>

            {/* ─── Actions ─── */}
            <div className="ms-auto flex shrink-0 items-center gap-1 lg:ms-0">
              <HeaderSearch
                className="hidden lg:block"
                labels={{
                  placeholder: labels.searchPlaceholder,
                  submit: labels.searchSubmit,
                  suggestions: labels.searchSuggestions,
                  viewAll: labels.searchViewAll,
                  resultsCount: labels.searchResultsCount,
                  noResults: labels.searchNoResults,
                }}
              />

              <Button
                ref={searchTriggerRef}
                variant="ghost"
                size="icon"
                onClick={() => {
                  reveal();
                  if (searchOpen) closeSearch();
                  else setSearchOpen(true);
                }}
                aria-label={labels.search}
                aria-expanded={searchOpen}
                aria-controls="mobile-search-panel"
                className="lg:hidden"
              >
                {searchOpen ? (
                  <X aria-hidden="true" />
                ) : (
                  <Search aria-hidden="true" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={cart.openDrawer}
                aria-label={`${labels.cart}${cart.totalItems > 0 ? ` (${formatNumber(cart.totalItems)})` : ""}`}
                className="relative"
              >
                <ShoppingCart aria-hidden="true" />
                {cart.totalItems > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-0.5 -start-0.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-[var(--color-brand)] px-1 text-caption font-bold tabular-nums text-white"
                  >
                    {cart.totalItems > 99 ? "٩٩+" : formatNumber(cart.totalItems)}
                  </span>
                )}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* ─── Search panel (phones) ─── */}
      {searchOpen && !reduced && (
        <div
          id="mobile-search-panel"
          className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 lg:hidden"
        >
          <HeaderSearch
            variant="panel"
            autoFocus
            onClose={closeSearch}
            labels={{
              placeholder: labels.searchPlaceholder,
              submit: labels.searchSubmit,
              suggestions: labels.searchSuggestions,
              viewAll: labels.searchViewAll,
              resultsCount: labels.searchResultsCount,
              noResults: labels.searchNoResults,
            }}
          />
        </div>
      )}

      {/* ─── Mobile menu ─── */}
      {!reduced && (
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side="right" className="w-[88vw] max-w-sm gap-0">
            <SheetHeader className="border-b border-[var(--color-border)]">
              <SheetTitle className="text-body font-bold">{labels.nav}</SheetTitle>
            </SheetHeader>

            <form action="/shop" method="get" role="search" className="border-b border-[var(--color-border)] p-4">
              <label htmlFor="mobile-menu-search" className="sr-only">
                {labels.search}
              </label>
              <div className="flex items-center gap-2 rounded-pill border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                <Search
                  aria-hidden="true"
                  className="ms-3 size-4 shrink-0 text-[var(--color-text-muted)]"
                />
                <input
                  id="mobile-menu-search"
                  type="search"
                  name="q"
                  autoComplete="off"
                  placeholder={labels.searchPlaceholder}
                  className="h-11 w-full min-w-0 bg-transparent px-1 text-caption text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-none"
                />
                <Button type="submit" variant="tertiary" className="me-2 shrink-0 font-bold">
                  {labels.searchSubmit}
                </Button>
              </div>
            </form>

            <nav aria-label={labels.nav} className="flex flex-col px-4 py-2">
              {[...nav, ...houses].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-[var(--color-border)] py-4 text-headline font-bold text-[var(--color-text)] transition-colors last:border-b-0 hover:text-[var(--color-brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto flex flex-col gap-3 border-t border-[var(--color-border)] p-4">
              {whatsappHref && (
                <Button
                  variant="secondary"
                  className="w-full font-bold"
                  render={
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                  nativeButton={false}
                >
                  <MessageCircle aria-hidden="true" />
                  {labels.whatsapp}
                </Button>
              )}
              {menuNote && (
                <p className="text-caption leading-relaxed text-[var(--color-text-muted)]">
                  {menuNote}
                </p>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </header>
  );
}
