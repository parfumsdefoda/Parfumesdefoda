"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ShoppingCart, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export interface HeaderNavItem {
  label: string;
  href: string;
}

export interface HeaderProps {
  /** Store name (for logo fallback text) */
  storeName?: string;
  /** Logo image path */
  logoSrc?: string;
  /** Logo alt text */
  logoAlt?: string;
  /** Navigation items */
  navItems?: HeaderNavItem[];
  /** Number of items in cart (for badge) */
  cartCount?: number;
  /** Cart button label for screen readers */
  cartLabel?: string;
  /** Navigation aria-label */
  navLabel?: string;
  /** Mobile menu button label */
  menuLabel?: string;
  /** Called when cart icon is clicked */
  onCartClick?: () => void;
  className?: string;
}

/**
 * Header — sticky top bar with logo, navigation, and cart icon.
 * Fully RTL-aware via logical properties.
 *
 * Desktop behavior:
 * - Hides on scroll down with translateY(-100%)
 * - Shows on scroll up
 * - Shows when mouse nears top 20px
 * - Always visible when scrollY < 50
 *
 * Mobile behavior:
 * - Always visible (sticky)
 */
export function Header({
  storeName = "Parfums De Foda",
  logoSrc = "/logos/logo.svg",
  logoAlt,
  navItems = [],
  cartCount = 0,
  cartLabel = "سلة التسوق",
  navLabel = "القائمة الرئيسية",
  menuLabel = "القائمة",
  onCartClick,
  className,
}: HeaderProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const headerRef = useRef<HTMLElement>(null);

  // Check if desktop on mount and resize
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    checkDesktop();
    window.addEventListener("resize", checkDesktop, { passive: true });
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  // Scroll handler with throttling
  const handleScroll = useCallback(() => {
    if (!isDesktop || ticking.current) return;

    ticking.current = true;

    requestAnimationFrame(() => {
      const currentScrollY = window.scrollY;

      // Always show near top
      if (currentScrollY < 50) {
        setIsVisible(true);
      }
      // Scrolling down and past threshold
      else if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsVisible(false);
      }
      // Scrolling up
      else if (currentScrollY < lastScrollY.current) {
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
      ticking.current = false;
    });
  }, [isDesktop]);

  // Mouse near top handler
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDesktop) return;

      if (e.clientY <= 20) {
        setIsVisible(true);
      }
    },
    [isDesktop],
  );

  // Attach scroll and mouse listeners
  useEffect(() => {
    if (!isDesktop) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: syncing header visibility with viewport state
      setIsVisible(true);
      return;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isDesktop, handleScroll, handleMouseMove]);

  return (
    <header
      ref={headerRef}
      className={`fixed top-0 left-0 right-0 z-40 border-b border-[var(--border-default)] bg-[var(--bg-primary)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg-primary)]/60 transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      } ${className ?? ""}`}
    >
      <div className="container mx-auto flex h-24 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <Image
            src={logoSrc}
            alt={logoAlt ?? storeName}
            width={96}
            height={96}
            className="h-20 w-auto"
            priority
          />
          <span className="hidden sm:block text-lg font-bold text-[var(--color-accent)]">
            {storeName}
          </span>
        </Link>

        {/* Desktop nav */}
        {navItems.length > 0 && (
          <nav className="hidden md:flex items-center gap-1" aria-label={navLabel}>
            {navItems.map((item, i) => (
              <div key={item.href} className="flex items-center">
                <Button variant="ghost" size="sm" render={<Link href={item.href} />} nativeButton={false}>
                  {item.label}
                </Button>
                {i < navItems.length - 1 && (
                  <Separator orientation="vertical" className="mx-1 h-4" />
                )}
              </div>
            ))}
          </nav>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Cart */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onCartClick}
            aria-label={`${cartLabel} (${cartCount})`}
            className="relative"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <motion.span
                key={cartCount}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute -top-0.5 -left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[10px] font-bold text-white"
              >
                {cartCount > 99 ? "99+" : cartCount}
              </motion.span>
            )}
          </Button>

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={menuLabel}
            aria-expanded="false"
            aria-haspopup="true"
            disabled
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
