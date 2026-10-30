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
  // A filtered view is never "the page you are on": `/shop?form=…` must not
  // underline itself beside "المتجر" on the plain catalogue.
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
 * A floating glass capsule, not a full-width bar: it sits 12px below the top
 * edge, inset from the viewport, 52px tall on phones and 60px from 1024px, with
 * a single 1px gold hairline and a soft shadow. The page scrolls underneath it,
 * so the capsule has two tones (`data-tone`):
 *
 *   dark   translucent white-on-purple glass, white text — the homepage while
 *          the hero is behind it
 *   light  ivory at ~0.88 alpha, dark text — every other route, and the
 *          homepage once the hero has scrolled past
 *
 * The server renders the correct tone for the route (no flash); a tiny island
 * here flips it from dark to light with an IntersectionObserver on the hero, so
 * there is no scroll listener and no React state in an effect.
 *
 * The capsule is TEXT ONLY — the brand mark is the logo file painted as a CSS
 * background, so no <img> (and no product thumbnail) ever sits in the header,
 * its menus or its search suggestions. Gold appears only as the hairline.
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
  const isHome = pathname === "/";
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

  /*
   * Tone island: the homepage starts dark because the hero is behind the
   * capsule. Once the hero's bottom edge passes under it, the capsule turns
   * light. One observer, no scroll handler, no React state — the attribute is
   * written straight onto the element, which is what the CSS reads.
   */
  useEffect(() => {
    const header = headerRef.current;
    if (!header || !isHome) return;
    const hero = document.querySelector<HTMLElement>("[data-hero-sentinel]");
    if (!hero || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          header.dataset.tone = entry.isIntersecting ? "dark" : "light";
        }
      },
      // The root's top edge is the capsule's bottom edge, so the flip happens
      // exactly when the hero stops being visible behind the glass.
      { rootMargin: "-88px 0px 0px 0px", threshold: 0 },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, [isHome]);

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

  return (
    <header
      ref={headerRef}
      data-tone={isHome ? "dark" : "light"}
      data-locked={locked ? "true" : "false"}
      data-scrolled="false"
      data-hidden="false"
      className={cn(
        // `pointer-events-none` on the header itself: the page runs underneath
        // the capsule, so the transparent strip around it must not eat clicks.
        "site-header pointer-events-none fixed inset-x-0 top-0 z-30",
        // Tailwind v4 hides with the `translate` property, so that is the
        // property the slide transition must name.
        "transition-[translate] duration-[var(--duration-base)] ease-[var(--ease-apple)]",
        "data-[hidden=true]:-translate-y-[140%]",
        "motion-reduce:transition-none motion-reduce:data-[hidden=true]:translate-y-0",
      )}
    >
      <div className="mx-auto flex w-full max-w-[1280px] flex-col px-3 pt-[var(--header-gap)] lg:px-6">
        {/* ─── The capsule ─── */}
        <div
          className={cn(
            "pointer-events-auto relative flex h-[var(--header-capsule)] items-center gap-1 rounded-pill",
            "border border-[var(--ui-gold-hairline)] bg-[var(--header-surface)] px-2 shadow-soft",
            "supports-[backdrop-filter]:backdrop-blur-md",
          )}
        >
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
              className="text-[var(--header-fg)] hover:bg-[var(--header-hover)] focus-visible:ring-offset-0 lg:hidden"
            >
              <Menu aria-hidden="true" />
            </Button>
          )}

          {/* ─── Brand lockup (CSS background: no <img> in the header) ─── */}
          <Link
            href="/"
            aria-label={storeName}
            // Physical `left` on purpose: centring is symmetric, while
            // `start-1/2` in RTL anchors the right edge and shifts the mark one
            // logo-width off centre.
            className="flex shrink-0 items-center gap-2 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--header-ring)] focus-visible:ring-offset-0 max-lg:absolute max-lg:left-1/2 max-lg:-translate-x-1/2"
          >
            {/* The emblem keeps its own colours; the ivory seat is what makes
                it read on both tones. The asset is never recoloured. */}
            <span className="grid size-9 shrink-0 place-items-center rounded-pill border border-[var(--ui-hairline-soft)] bg-[var(--brand-white)]">
              <span
                aria-hidden="true"
                className="block size-6 bg-contain bg-center bg-no-repeat"
                style={{ backgroundImage: "url(/logos/logo.svg)" }}
              />
            </span>
            <span className="hidden items-baseline gap-1 text-caption font-bold uppercase tracking-[0.18em] text-[var(--header-fg)] sm:flex">
              <span className="hidden xl:inline">PARFUMS DE FODA</span>
              <span className="xl:hidden">FODA</span>
            </span>
          </Link>

          {reduced ? (
            <Link
              href="/checkout"
              className="ms-auto text-caption font-medium text-[var(--header-fg-muted)] transition-colors hover:text-[var(--header-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--header-ring)] focus-visible:ring-offset-0"
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
                        "group/nav relative inline-flex h-10 items-center rounded-control px-3 text-caption font-medium transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--header-ring)] focus-visible:ring-offset-0",
                        active
                          ? "text-[var(--header-fg)]"
                          : "text-[var(--header-fg-muted)] hover:text-[var(--header-fg)]",
                      )}
                    >
                      {item.label}
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute inset-x-3 bottom-1.5 h-0.5 origin-center rounded-pill bg-[var(--header-accent)]",
                          "transition-transform duration-200 ease-[var(--ease-apple)]",
                          active ? "scale-x-100" : "scale-x-0 group-hover/nav:scale-x-100",
                        )}
                      />
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
                    className="group/nav relative inline-flex h-10 items-center gap-1 rounded-control px-3 text-caption font-medium text-[var(--header-fg-muted)] transition-colors hover:text-[var(--header-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--header-ring)] focus-visible:ring-offset-0"
                  >
                    {labels.houses}
                    <ChevronDown aria-hidden="true" className="size-4" />
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-3 bottom-1.5 h-0.5 origin-center scale-x-0 rounded-pill bg-[var(--header-accent)] transition-transform duration-200 ease-[var(--ease-apple)] group-hover/nav:scale-x-100"
                    />
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
                        sideOffset={10}
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

              {/* ─── Tools ─── */}
              <div className="ms-auto flex shrink-0 items-center gap-1 lg:ms-2">
                <HeaderSearch className="hidden xl:block" labels={searchLabels} />

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
                  className="text-[var(--header-fg)] hover:bg-[var(--header-hover)] focus-visible:ring-offset-0 xl:hidden"
                >
                  {searchOpen ? <X aria-hidden="true" /> : <Search aria-hidden="true" />}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={cart.openDrawer}
                  // Warm the drawer chunk before the click so opening feels local.
                  onPointerEnter={preloadCartDrawer}
                  onPointerDown={preloadCartDrawer}
                  onFocus={preloadCartDrawer}
                  aria-label={`${labels.cart}${cart.totalItems > 0 ? ` (${formatNumber(cart.totalItems)})` : ""}`}
                  className="relative text-[var(--header-fg)] hover:bg-[var(--header-hover)] focus-visible:ring-offset-0"
                >
                  <ShoppingCart aria-hidden="true" />
                  {cart.totalItems > 0 && (
                    <span
                      aria-hidden="true"
                      className="header-cart-badge absolute -top-0.5 -start-0.5 flex h-4 min-w-4 items-center justify-center rounded-pill px-1 text-caption font-bold tabular-nums"
                    >
                      {cart.totalItems > 99 ? "٩٩+" : formatNumber(cart.totalItems)}
                    </span>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* ─── Search panel (phones, and 1024–1279 where the pill is an icon) ─── */}
        {searchOpen && !reduced && (
          <div
            id="mobile-search-panel"
            className="pointer-events-auto mt-2 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-lifted xl:hidden"
          >
            <HeaderSearch variant="panel" autoFocus onClose={closeSearch} labels={searchLabels} />
          </div>
        )}
      </div>

      {/* ─── Mobile menu ─── */}
      {!reduced && (
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent
            side="right"
            showCloseButton={false}
            className="w-[88vw] max-w-sm gap-0 bg-[var(--purple-950)] text-[var(--color-on-dark)]"
          >
            <SheetHeader className="flex-row items-center justify-between border-b border-[var(--ui-gold-hairline)] pe-2">
              <SheetTitle className="text-body font-bold text-[var(--color-on-dark)]">
                {labels.nav}
              </SheetTitle>
              <SheetClose
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={labels.closeMenu}
                    className="text-[var(--color-on-dark)] hover:bg-[color-mix(in_srgb,var(--brand-white)_12%,transparent)] hover:text-[var(--color-on-dark)] focus-visible:ring-offset-0"
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
              className="border-b border-[var(--ui-gold-hairline)] p-4"
            >
              <label htmlFor="mobile-menu-search" className="sr-only">
                {labels.search}
              </label>
              <div className="flex items-center gap-2 rounded-pill border border-[var(--color-on-dark-border)] bg-[color-mix(in_srgb,var(--brand-white)_10%,transparent)]">
                <Search
                  aria-hidden="true"
                  className="ms-3 size-4 shrink-0 text-[var(--color-on-dark-muted)]"
                />
                <input
                  id="mobile-menu-search"
                  type="search"
                  name="q"
                  autoComplete="off"
                  placeholder={labels.searchPlaceholder}
                  className="h-11 w-full min-w-0 bg-transparent px-1 text-caption text-[var(--color-on-dark)] placeholder:text-[var(--color-on-dark-muted)] focus-visible:outline-none"
                />
                <Button
                  type="submit"
                  variant="tertiary"
                  className="me-2 shrink-0 font-bold text-[var(--color-on-dark)] hover:text-[var(--color-on-dark)]"
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
                  className="border-b border-[var(--ui-gold-hairline)] py-4 text-title-3 font-bold text-[var(--color-on-dark)] transition-colors last:border-b-0 hover:text-[var(--gold-300)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-on-dark)] focus-visible:ring-offset-0"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto flex flex-col gap-3 border-t border-[var(--ui-gold-hairline)] p-4">
              {whatsappHref && (
                <Button
                  variant="secondary"
                  className="w-full border-[var(--color-on-dark)] bg-[var(--color-on-dark)] font-bold text-[var(--purple-950)] hover:bg-[var(--purple-100)]"
                  render={<a href={whatsappHref} target="_blank" rel="noopener noreferrer" />}
                  nativeButton={false}
                >
                  <MessageCircle aria-hidden="true" />
                  {labels.whatsapp}
                </Button>
              )}
              {menuNote && (
                <p className="text-caption leading-relaxed text-[var(--color-on-dark-muted)]">
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
