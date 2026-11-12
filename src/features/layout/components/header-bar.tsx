"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, MessageCircle, Search, ShoppingCart, X } from "lucide-react";
import { Popover } from "@base-ui/react/popover";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/currency";
import { useCart } from "@/providers/CartProvider";
import { preloadCartDrawer } from "@/features/cart/components/cart-shell";
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
  const [rawPath, query] = href.split("?");
  if (query) return false;
  const path = rawPath.replace(/\/+$/, "") || "/";
  if (path === "/shop") {
    return pathname === "/shop" || pathname.startsWith("/shop/");
  }
  return pathname === path || pathname === `${path}/`;
}

/**
 * HeaderBar — the site's one header, mounted by the root layout.
 *
 * Flat, full width, solid paper, one hairline underneath. Two tiers on desktop:
 * a 56px row with the wordmark centred between the contact link and the
 * search/cart tools, and a 40px row of small navigation links, so the bar reads
 * like the masthead of a printed catalogue rather than an app chrome. Phones get
 * one row (hamburger, centred wordmark, search + cart).
 *
 * There is no tone switching: the bar sits in the flow as a sticky element on
 * paper everywhere, so nothing has to observe the hero and no page needs a
 * header offset.
 *
 * TEXT ONLY — the brand mark is the logo file painted as a CSS background, so no
 * <img> (and never a product thumbnail) sits in the header, its menus or its
 * suggestions.
 *
 * The smart hide writes `data-hidden` on the element from a rAF-throttled scroll
 * listener, so scrolling never re-renders the bar. It stays put at the top,
 * whenever the search, dropdown or sheet is open, while focus is inside the
 * header, and under reduced motion.
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
   * The mobile menu is a modal sheet, so it must take focus when it opens, keep
   * Tab inside it and hand focus back to the button that opened it. Base UI's
   * dialog parts do not move focus in this build, so the small amount of
   * behaviour a keyboard user needs lives here.
   */
  useEffect(() => {
    if (!menuOpen) return;
    const trigger = menuTriggerRef.current;
    const getPanel = () => document.querySelector<HTMLElement>('[data-slot="sheet-content"]');

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

  const searchLabels = {
    placeholder: labels.searchPlaceholder,
    submit: labels.searchSubmit,
    suggestions: labels.searchSuggestions,
    viewAll: labels.searchViewAll,
    resultsCount: labels.searchResultsCount,
    noResults: labels.searchNoResults,
  };

  const navLinkClass = (active: boolean) =>
    cn(
      "group/nav relative inline-flex h-10 items-center px-3 text-[14px] font-medium transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]",
      active ? "text-[var(--ink)]" : "text-[var(--ink-muted)] hover:text-[var(--ink)]",
    );

  const underline = (active: boolean) => (
    <span
      aria-hidden="true"
      className={cn(
        "absolute inset-x-3 -bottom-px h-[2px] origin-center bg-[var(--color-brand)]",
        "transition-transform duration-200 ease-[var(--ease-apple)]",
        active ? "scale-x-100" : "scale-x-0 group-hover/nav:scale-x-100",
      )}
    />
  );

  return (
    <header
      ref={headerRef}
      data-locked={locked ? "true" : "false"}
      data-hidden="false"
      className={cn(
        "site-header sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--paper)]",
        "transition-[translate] duration-[var(--duration-base)] ease-[var(--ease-apple)]",
        "data-[hidden=true]:-translate-y-full",
        "motion-reduce:transition-none motion-reduce:data-[hidden=true]:translate-y-0",
      )}
    >
      {/* ─── Row 1 — the masthead ─── */}
      <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-2 px-4 lg:px-6">
        {reduced ? (
          <>
            <Link
              href="/checkout"
              className="text-[14px] font-medium text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]"
            >
              {labels.backToCart}
            </Link>
            <span className="mx-auto flex items-center gap-2">
              <span
                aria-hidden="true"
                className="block size-7 bg-contain bg-center bg-no-repeat"
                style={{ backgroundImage: "url(/logos/logo.svg)" }}
              />
              <span className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[var(--ink)]">
                PARFUMS DE FODA
              </span>
            </span>
            <span aria-hidden="true" className="w-16" />
          </>
        ) : (
          <>
            {/* inline-start: contact on desktop, menu on phones */}
            <div className="flex flex-1 items-center">
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
                className="text-[var(--ink)] hover:bg-[var(--paper-deep)] lg:hidden"
              >
                <Menu aria-hidden="true" />
              </Button>
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden items-center gap-1.5 text-[14px] text-[var(--ink-muted)] transition-colors hover:text-[var(--color-brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)] lg:inline-flex"
                >
                  <MessageCircle aria-hidden="true" className="size-4" />
                  {labels.whatsapp}
                </a>
              )}
            </div>

            {/* centre: the lockup */}
            <Link
              href="/"
              aria-label={storeName}
              className="flex shrink-0 items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)] max-lg:absolute max-lg:left-1/2 max-lg:-translate-x-1/2"
            >
              <span
                aria-hidden="true"
                className="block size-7 shrink-0 bg-contain bg-center bg-no-repeat sm:size-8 max-[400px]:size-7"
                style={{ backgroundImage: "url(/logos/logo.svg)" }}
              />
              <span className="hidden text-[14px] font-semibold uppercase tracking-[0.18em] text-[var(--ink)] sm:inline">
                PARFUMS DE FODA
              </span>
            </Link>

            {/* inline-end: search + cart */}
            <div className="flex flex-1 items-center justify-end gap-1">
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
                aria-controls="header-search-panel"
                className="gap-2 text-[var(--ink)] hover:bg-[var(--paper-deep)] px-3 lg:w-auto"
              >
                <Search aria-hidden="true" className="size-4" />
                <span className="hidden text-[14px] font-medium lg:inline">{labels.search}</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={cart.openDrawer}
                onPointerEnter={preloadCartDrawer}
                onPointerDown={preloadCartDrawer}
                onFocus={preloadCartDrawer}
                aria-label={`${labels.cart}${cart.totalItems > 0 ? ` (${formatNumber(cart.totalItems)})` : ""}`}
                className="relative text-[var(--ink)] hover:bg-[var(--paper-deep)]"
              >
                <ShoppingCart aria-hidden="true" className="size-4" />
                {cart.totalItems > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-0.5 -start-0.5 flex h-4 min-w-4 items-center justify-center bg-[var(--color-brand)] px-1 text-[14px] font-bold leading-none tabular-nums text-[var(--color-on-brand)]"
                  >
                    {cart.totalItems > 99 ? "٩٩+" : formatNumber(cart.totalItems)}
                  </span>
                )}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* ─── Row 2 — the navigation, desktop only ─── */}
      {!reduced && (
        <div className="hidden border-t border-[var(--line-soft)] lg:block">
          <nav
            aria-label={labels.nav}
            className="mx-auto flex h-10 w-full max-w-[1600px] items-stretch justify-center gap-2 px-6"
          >
            {nav.map((item) => {
              const active = isActiveRoute(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={navLinkClass(active)}
                >
                  {item.label}
                  {underline(active)}
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
                  setHousesAnchor((current) => (current ? null : event.currentTarget));
                }}
                className={cn(navLinkClass(false), "gap-1")}
              >
                {labels.houses}
                <ChevronDown aria-hidden="true" className="size-4" />
                {underline(false)}
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
                      className="flex w-44 flex-col border border-[var(--line)] bg-[var(--paper)] py-1 text-[14px] shadow-lifted"
                    >
                      {houses.map((house) => (
                        <Link
                          key={house.href}
                          href={house.href}
                          onClick={() => setHousesAnchor(null)}
                          className="px-3 py-2 text-[14px] text-[var(--ink)] transition-colors hover:bg-[var(--paper-deep)] hover:text-[var(--color-brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
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
        </div>
      )}

      {/* ─── Search panel — full width under the bar ─── */}
      {searchOpen && !reduced && (
        <div
          id="header-search-panel"
          className="border-t border-[var(--line)] bg-[var(--paper)]"
        >
          <div className="mx-auto w-full max-w-[1600px] px-4 py-4 lg:px-6">
            <HeaderSearch variant="panel" autoFocus onClose={closeSearch} labels={searchLabels} />
          </div>
        </div>
      )}

      {/* ─── Mobile menu ─── */}
      {!reduced && (
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent
            side="right"
            showCloseButton={false}
            className="w-[88vw] max-w-sm gap-0 border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
          >
            <SheetHeader className="flex-row items-center justify-between border-b border-[var(--line)] pe-2">
              <SheetTitle className="text-[16px] font-semibold text-[var(--ink)]">
                {labels.nav}
              </SheetTitle>
              <SheetClose
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={labels.closeMenu}
                    className="text-[var(--ink)] hover:bg-[var(--paper-deep)] focus-visible:ring-offset-0"
                  />
                }
              >
                <X aria-hidden="true" />
              </SheetClose>
            </SheetHeader>

            <form
              action="/shop"
              method="get"
              role="search"
              className="border-b border-[var(--line)] p-4"
            >
              <label htmlFor="mobile-menu-search" className="sr-only">
                {labels.search}
              </label>
              <div className="flex items-center gap-2 border border-[var(--line)] bg-[var(--paper)]">
                <Search aria-hidden="true" className="ms-3 size-4 shrink-0 text-[var(--ink-muted)]" />
                <input
                  id="mobile-menu-search"
                  type="search"
                  name="q"
                  autoComplete="off"
                  placeholder={labels.searchPlaceholder}
                  className="h-11 w-full min-w-0 bg-transparent px-1 text-[14px] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus-visible:outline-none"
                />
                <Button
                  type="submit"
                  variant="tertiary"
                  className="me-2 shrink-0 font-bold text-[var(--color-brand)] hover:text-[var(--color-brand)]"
                >
                  {labels.searchSubmit}
                </Button>
              </div>
            </form>

            <nav aria-label={labels.nav} className="flex flex-col px-4">
              {[...nav, ...houses].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-[var(--line-soft)] py-4 text-[18px] font-medium text-[var(--ink)] transition-colors last:border-b-0 hover:text-[var(--color-brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-0"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto flex flex-col gap-3 border-t border-[var(--line)] p-4">
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[14px] text-[var(--ink-muted)] transition-colors hover:text-[var(--color-brand)]"
                >
                  <MessageCircle aria-hidden="true" className="size-4" />
                  {labels.whatsapp}
                </a>
              )}
              {menuNote && (
                <p className="text-[14px] leading-relaxed text-[var(--ink-muted)]">{menuNote}</p>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </header>
  );
}
