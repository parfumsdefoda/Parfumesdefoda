"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { isCheckoutPath } from "@/lib/route-shell";
import { HeaderBar, type HeaderBarProps } from "./header-bar";
import { Footer, type FooterProps } from "./footer";

export interface SiteShellProps {
  /** Everything the header needs except the route-derived `reduced` flag. */
  header: Omit<HeaderBarProps, "reduced">;
  footer: Omit<FooterProps, "reduced">;
  children: ReactNode;
}

/**
 * SiteShell — the header and footer every route wears.
 *
 * Mounted once by the root layout, so a product page, a category page and the
 * homepage all get the same navigation (before this, only the homepage had a
 * header at all). The checkout flow is the only exception: it keeps the logo
 * and a way back to the cart, and drops the navigation and the footer links.
 */
export function SiteShell({ header, footer, children }: SiteShellProps) {
  const pathname = usePathname() ?? "/";
  const reduced = isCheckoutPath(pathname);

  return (
    <div className="flex min-h-screen flex-col">
      <HeaderBar {...header} reduced={reduced} />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer {...footer} reduced={reduced} />
    </div>
  );
}
