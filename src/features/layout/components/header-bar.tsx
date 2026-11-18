"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, MessageCircle, Search, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/currency";
import { useCart } from "@/providers/CartProvider";
import { preloadCartDrawer } from "@/features/cart/components/cart-shell";
import { HeaderSearch } from "@/features/search/components/header-search";
import type { NavLink } from "@/lib/site-nav";

export interface HeaderLabels {
  nav: string;
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
  labels: HeaderLabels;
  /** Checkout wears a reduced bar: logo + a way back to the cart, nothing else. */
  reduced?: boolean;
  /** wa.me link from data/contact.json; the desktop button and the mobile menu end with it. */
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
 * HeaderBar — RUN 1.6 single row.
 *
 * Below 1024px the bar is exactly what it was: 76px, logo at the inline start,
 * search/cart/hamburger at the inline end. From 1024px there is ONE 64px
 * row: nav links at the inline start, the logo lockup dead-centre (a
 * 3-column grid puts it on the geometric centre), and the tools at the
 * inline end — the green WhatsApp button, search, cart. No second row, no
 * hairline crossing the logo, nothing absolutely positioned.
 *
 * The smart-hide, the search panel and the mobile sheet keep their behaviour.
 * The houses (الدور) dropdown and the "المتجر" link are gone; all-products
 * stays reachable through the logo, the "عرض كل المنتجات" row and the
 * breadcrumbs. The logo is `public/logos/logo.svg` — a transparent vector,
 * so it needs no multiply/plate treatment on paper.
 */
export function HeaderBar({
  storeName,
  nav,
  labels,
  reduced = false,
  whatsappHref,
  menuNote,
}: HeaderBarProps) {
  const cart = useCart();
  const pathname = usePathname() ?? "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

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
      if (motion.matches || y <= 8 || focusInside) {
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

  /* Focus for the mobile menu: it is a modal sheet, so it takes focus, keeps
     Tab inside and hands focus back to the button that opened it. */
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

  const logoLockup = (
    <Link
      href="/"
      aria-label={storeName}
      className="flex shrink-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
    >
      <span className="grid size-[42px] shrink-0 place-items-center overflow-hidden lg:size-[44px]">
        <span
          aria-hidden="true"
          className="block size-8 bg-contain bg-center bg-no-repeat lg:size-11"
          style={{ backgroundImage: "url(/logos/logo.svg)" }}
        />
      </span>
      <span
        aria-hidden="true"
        className="hidden font-serif text-[16px] leading-none tracking-[3px] text-[var(--boutique-ink)] sm:block xl:text-[18px] xl:tracking-[4px]"
      >
        PARFUMS DE FODA
      </span>
    </Link>
  );

  const whatsappButton = whatsappHref ? (
    <a
      href={whatsappHref}
      target="_blank"
      rel="noreferrer"
      className="hidden h-10 items-center justify-center gap-2 rounded-none border border-[var(--purple-950)] bg-[var(--brand-green)] px-4 text-[14px] font-bold text-[var(--purple-950)] transition-colors hover:bg-[var(--brand-green)] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 lg:inline-flex"
    >
      <MessageCircle aria-hidden="true" className="size-4 shrink-0" />
      {/* Icon-only below 1180px (label shows from the `min-[1180px]` step). */}
      <span className="hidden min-[1180px]:inline">{labels.whatsapp}</span>
    </a>
  ) : null;

  const searchButton = (
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
      className="size-11 rounded-full text-[var(--boutique-ink)] hover:bg-[var(--cream)] focus-visible:ring-offset-0"
    >
      {searchOpen ? <X aria-hidden="true" /> : <Search aria-hidden="true" />}
    </Button>
  );

  const cartButton = (
    <button
      type="button"
      onClick={cart.openDrawer}
      onPointerEnter={preloadCartDrawer}
      onPointerDown={preloadCartDrawer}
      onFocus={preloadCartDrawer}
      aria-label={`${labels.cart}${cart.totalItems > 0 ? ` (${formatNumber(cart.totalItems)})` : ""}`}
      className="relative inline-flex h-11 items-center gap-2 rounded-full bg-[var(--cream)] px-3 text-[14px] font-medium text-[var(--boutique-ink)] transition-colors hover:bg-[var(--gold-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
    >
      <ShoppingCart aria-hidden="true" className="size-4" />
      <span className="hidden xl:inline">{labels.cart}</span>
      {cart.totalItems > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -start-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--gold-500)] px-1 text-[14px] font-bold tabular-nums text-[var(--boutique-ink)]"
        >
          {cart.totalItems > 99 ? "٩٩+" : formatNumber(cart.totalItems)}
        </span>
      )}
    </button>
  );

  const menuButton = (
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
      className="size-11 rounded-full text-[var(--boutique-ink)] hover:bg-[var(--cream)] focus-visible:ring-offset-0 lg:hidden"
    >
      <Menu aria-hidden="true" />
    </Button>
  );

  const navList = (
    <nav aria-label={labels.nav} className="hidden min-w-0 items-center gap-5 lg:flex 2xl:gap-[30px]">
      {nav.map((item) => {
        const active = isActiveRoute(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative inline-flex shrink-0 items-center pb-1 text-[14px] font-medium transition-colors xl:text-[16px]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2",
              active
                ? "text-[var(--gold-700)]"
                : "text-[var(--boutique-ink)] hover:text-[var(--gold-700)]",
            )}
          >
            {item.label}
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-x-0 bottom-0 h-0.5 origin-center bg-[var(--gold-500)] transition-transform duration-200",
                active ? "scale-x-100" : "scale-x-0",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );

  return (
    <header
      ref={headerRef}
      data-scrolled="false"
      data-hidden="false"
      className={cn(
        "site-header sticky top-0 z-40 h-[76px] border-b border-[var(--boutique-line)] bg-[var(--boutique-white)] lg:h-[64px]",
        "transition-[translate] duration-[var(--duration-base)] ease-[var(--ease-apple)]",
        "data-[hidden=true]:-translate-y-full",
        "motion-reduce:transition-none motion-reduce:data-[hidden=true]:translate-y-0",
      )}
    >
      {reduced ? (
        <div className="mx-auto flex h-full w-full max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:gap-5 lg:px-8">
          {logoLockup}
          <Link
            href="/checkout"
            className="ms-auto text-[14px] font-medium text-[var(--boutique-ink)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
          >
            {labels.backToCart}
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile / tablet row — unchanged (logo inline-start, tools inline-end). */}
          <div className="mx-auto flex h-full w-full max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:hidden">
            {logoLockup}
            <div className="ms-auto flex shrink-0 items-center gap-2">
              {searchButton}
              {cartButton}
              {menuButton}
            </div>
          </div>

          {/* Desktop row — one row: nav inline-start, logo centred, tools inline-end. */}
          <div className="mx-auto hidden h-full w-full max-w-[1920px] grid-cols-[1fr_auto_1fr] items-center px-8 lg:grid 2xl:px-10">
            <div className="flex min-w-0 items-center justify-start gap-5 2xl:gap-[30px]">{navList}</div>
            <div className="justify-self-center">{logoLockup}</div>
            <div className="flex shrink-0 items-center justify-end gap-2 xl:gap-3">
              {whatsappButton}
              {searchButton}
              {cartButton}
            </div>
          </div>
        </>
      )}

      {/* ─── Search panel: full width, under the bar ─── */}
      {searchOpen && (
        <div
          id="mobile-search-panel"
          className="border-t border-[var(--boutique-line)] bg-[var(--boutique-white)] px-4 py-4 lg:px-8"
        >
          <HeaderSearch variant="panel" autoFocus onClose={closeSearch} labels={searchLabels} />
        </div>
      )}

      {/* ─── Mobile menu ─── */}
      {!reduced && (
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent
            side="right"
            showCloseButton={false}
            className="w-[88vw] max-w-sm gap-0 bg-[var(--boutique-white)] text-[var(--boutique-ink)]"
          >
            <SheetHeader className="flex-row items-center justify-between border-b border-[var(--boutique-line)] pe-2">
              <SheetTitle className="text-[16px] font-bold text-[var(--boutique-ink)]">
                {labels.nav}
              </SheetTitle>
              <SheetClose
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={labels.closeMenu}
                    className="size-11 rounded-full text-[var(--boutique-ink)] hover:bg-[var(--cream)] focus-visible:ring-offset-0"
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
              className="border-b border-[var(--boutique-line)] p-4"
            >
              <label htmlFor="mobile-menu-search" className="sr-only">
                {labels.search}
              </label>
              <div className="flex items-center gap-2 rounded-full border border-[var(--boutique-line)] bg-[var(--cream)]">
                <Search
                  aria-hidden="true"
                  className="ms-3 size-4 shrink-0 text-[var(--boutique-ink)]/60"
                />
                <input
                  id="mobile-menu-search"
                  type="search"
                  name="q"
                  autoComplete="off"
                  placeholder={labels.searchPlaceholder}
                  className="h-11 w-full min-w-0 bg-transparent px-1 text-[14px] text-[var(--boutique-ink)] placeholder:text-[var(--boutique-ink)]/50 focus-visible:outline-none"
                />
                <Button
                  type="submit"
                  variant="tertiary"
                  className="me-2 shrink-0 rounded-full text-[14px] font-bold text-[var(--boutique-ink)] hover:text-[var(--gold-700)]"
                >
                  {labels.searchSubmit}
                </Button>
              </div>
            </form>

            <nav aria-label={labels.nav} className="flex flex-col px-4">
              {nav.map((item) => {
                const active = isActiveRoute(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "border-b border-[var(--boutique-line)] py-4 text-[16px] font-medium transition-colors last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]",
                      active ? "text-[var(--gold-700)]" : "text-[var(--boutique-ink)]",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto flex flex-col gap-3 border-t border-[var(--boutique-line)] p-4">
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-none border border-[var(--purple-950)] bg-[var(--brand-green)] text-[14px] font-bold text-[var(--purple-950)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
                >
                  <MessageCircle aria-hidden="true" className="size-4" />
                  {labels.whatsapp}
                </a>
              )}
              {menuNote && (
                <p className="text-[14px] leading-relaxed text-[var(--boutique-ink)]/70">
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
