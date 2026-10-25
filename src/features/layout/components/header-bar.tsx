"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, MessageCircle, Search, ShoppingCart, Sparkles, X } from "lucide-react";
import { Popover } from "@base-ui/react/popover";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useCart } from "@/providers/CartProvider";
import { openAdvisor } from "@/features/chat-assistant/advisor-bus";
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
  advisor: string;
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
  logoSrc?: string;
  /** wa.me link from data/contact.json; the mobile menu ends with it. */
  whatsappHref?: string;
}

/**
 * HeaderBar — the site's one header, mounted by the root layout.
 *
 * 56px on phones, 64px from the tablet breakpoint up; translucent with a blur
 * where the browser supports it and opaque where it does not; a hairline only
 * once the page has scrolled, so the top of every page starts border-less.
 *
 * Desktop carries the primary links, a houses menu (public tier labels only),
 * search, the advisor entry point and the cart. Below the desktop breakpoint
 * the same links live in a full-height sheet, which is the only navigation a
 * phone gets — including on product pages, which used to have none.
 */
export function HeaderBar({
  storeName,
  nav,
  houses,
  labels,
  reduced = false,
  logoSrc = "/logos/logo.svg",
  whatsappHref,
}: HeaderBarProps) {
  const cart = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [housesAnchor, setHousesAnchor] = useState<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
   * behaviour a keyboard user needs is implemented here — measured with a real
   * Tab/Escape walk-through rather than assumed.
   */
  useEffect(() => {
    if (!menuOpen) return;
    const trigger = menuTriggerRef.current;
    // The panel is portalled and committed after this effect, so it is looked
    // up from the document each time instead of being captured once.
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
        // Tab from outside the panel enters it instead of walking the page.
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
      className={cn(
        "sticky top-0 z-40 w-full",
        "h-14 md:h-16",
        "bg-[var(--color-surface)]",
        "supports-[backdrop-filter]:bg-[var(--color-surface)]/80 supports-[backdrop-filter]:backdrop-blur-md",
        "border-b transition-colors duration-[var(--duration-fast)]",
        scrolled ? "border-[var(--color-border)]" : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-full w-full max-w-[1280px] items-center justify-between gap-3 px-4">
        {/* ─── Logo ─── */}
        <Link
          href="/"
          aria-label={storeName}
          className="flex shrink-0 items-center rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        >
          <Image
            src={logoSrc}
            alt={storeName}
            width={149}
            height={146}
            priority
            className="h-7 w-auto md:h-8"
          />
        </Link>

        {reduced ? (
          <Link
            href="/checkout"
            className="text-caption font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
          >
            {labels.backToCart}
          </Link>
        ) : (
          <>
            {/* ─── Desktop nav ─── */}
            <nav
              aria-label={labels.nav}
              className="hidden flex-1 items-center gap-1 md:flex"
            >
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-control px-3 py-2 text-caption font-medium text-[var(--color-text)] transition-colors hover:text-[var(--color-brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
                >
                  {item.label}
                </Link>
              ))}

              {houses.length > 0 && (
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={housesAnchor !== null}
                  onClick={(event) =>
                    setHousesAnchor((current) =>
                      current ? null : event.currentTarget,
                    )
                  }
                  className="rounded-control px-3 py-2 text-caption font-medium text-[var(--color-text)] transition-colors hover:text-[var(--color-brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
                >
                  {labels.houses}
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
            <div className="flex shrink-0 items-center gap-1">
              <Button
                ref={searchTriggerRef}
                variant="ghost"
                size="icon"
                onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
                aria-label={labels.search}
                aria-expanded={searchOpen}
                className="hidden md:inline-flex"
              >
                <Search aria-hidden="true" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={openAdvisor}
                aria-label={labels.advisor}
                className="hidden md:inline-flex"
              >
                <Sparkles aria-hidden="true" />
                <span className="hidden text-caption font-medium lg:inline">
                  {labels.advisor}
                </span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={cart.openDrawer}
                aria-label={`${labels.cart}${cart.totalItems > 0 ? ` (${cart.totalItems.toLocaleString("ar-EG")})` : ""}`}
                className="relative"
              >
                <ShoppingCart aria-hidden="true" />
                {cart.totalItems > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-0.5 -start-0.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-[var(--color-brand)] px-1 text-caption font-bold text-white"
                  >
                    {cart.totalItems > 99
                      ? "٩٩+"
                      : cart.totalItems.toLocaleString("ar-EG")}
                  </span>
                )}
              </Button>

              <Button
                ref={menuTriggerRef}
                variant="ghost"
                size="icon"
                onClick={() => setMenuOpen(true)}
                aria-label={labels.menu}
                aria-expanded={menuOpen}
                aria-haspopup="dialog"
                className="md:hidden"
              >
                <Menu aria-hidden="true" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* ─── Inline search (desktop) ─── */}
      {searchOpen && !reduced && (
        <div className="absolute inset-x-0 top-full border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-soft">
          <form
            action="/shop"
            method="get"
            role="search"
            onKeyDown={(event) => {
              if (event.key === "Escape") closeSearch();
            }}
            className="mx-auto flex w-full max-w-[720px] items-center gap-2"
          >
            <label htmlFor="site-search" className="sr-only">
              {labels.search}
            </label>
            <input
              ref={searchInputRef}
              id="site-search"
              type="search"
              name="q"
              autoFocus
              autoComplete="off"
              placeholder={labels.searchPlaceholder}
              className="h-11 w-full rounded-pill border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 text-caption text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            />
            <Button type="submit" variant="primary" size="md">
              {labels.searchSubmit}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={closeSearch}
              aria-label={labels.closeMenu}
            >
              <X aria-hidden="true" />
            </Button>
          </form>
        </div>
      )}

      {/* ─── Mobile menu ─── */}
      {!reduced && (
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side="right" className="w-[88vw] max-w-sm gap-0">
            <SheetHeader className="border-b border-[var(--color-border)]">
              <SheetTitle className="text-body font-bold">{labels.nav}</SheetTitle>
            </SheetHeader>

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
              <form action="/shop" method="get" role="search" className="flex gap-2">
                <label htmlFor="mobile-search" className="sr-only">
                  {labels.search}
                </label>
                <input
                  id="mobile-search"
                  type="search"
                  name="q"
                  autoComplete="off"
                  placeholder={labels.searchPlaceholder}
                  className="h-11 w-full rounded-pill border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 text-caption text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
                />
                <Button type="submit" variant="secondary" size="icon" aria-label={labels.searchSubmit}>
                  <Search aria-hidden="true" />
                </Button>
              </form>

              <Button variant="primary" className="w-full font-bold" onClick={() => { setMenuOpen(false); openAdvisor(); }}>
                <Sparkles aria-hidden="true" />
                {labels.advisor}
              </Button>

              {whatsappHref && (
                <Button
                  variant="secondary"
                  className="w-full font-bold"
                  render={
                    <a href={whatsappHref} target="_blank" rel="noopener noreferrer" />
                  }
                  nativeButton={false}
                >
                  <MessageCircle aria-hidden="true" />
                  {labels.whatsapp}
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </header>
  );
}
