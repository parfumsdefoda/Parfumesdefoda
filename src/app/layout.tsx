import type { Metadata, Viewport } from "next";
import { cairo } from "./fonts";
import { Providers } from "./providers";
import { loadTheme } from "@/services/theme";
import { ChatAssistant } from "@/features/chat-assistant/components/chat-assistant";
import "./globals.css";

/**
 * Root layout for Parfums De Foda.
 *
 * Architecture decisions:
 * - Arabic-first RTL layout using dir="rtl"
 * - Cairo font loaded via next/font for optimal performance
 * - Metadata and viewport are static (JSON-driven metadata is set server-side)
 * - Theme data loaded server-side via loadTheme() and passed to Providers
 * - Providers wrap children for cart state, theme, and translations
 * - JSON-LD structured data for rich search results
 */

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // themeColor is emitted from data/theme.json in <head> below, so no brand
  // colour is ever hardcoded here.
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parfumsdefoda.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Parfums De Foda",
    template: "%s | Parfums De Foda",
  },
  description: "اكتشف تشكيلتنا الفاخرة من العطور العربية الأصيلة والمسك والعود",
  keywords: ["عطور", "عربية", "فاخرة", "بارفان", "مسك", "عود", "برفانات", "عطور أصلية"],
  authors: [{ name: "Parfums De Foda" }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "ar_AR",
    url: siteUrl,
    siteName: "Parfums De Foda",
    title: "Parfums De Foda — عطور فاخرة",
    description: "اكتشف تشكيلتنا الفاخرة من العطور العربية الأصيلة والمسك والعود",
    images: [
      {
        // Social platforms do not render SVG — this is a real 1200x630 PNG
        // (regenerate with `node scripts/generate-og-image.mjs`).
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Parfums De Foda — عطور فاخرة",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Parfums De Foda — عطور فاخرة",
    description: "اكتشف تشكيلتنا الفاخرة من العطور العربية الأصيلة والمسك والعود",
    images: ["/og-image.png"],
  },
  // No site-wide canonical here: a root canonical is inherited by every page,
  // which pointed all 40 product pages at the homepage. Each route declares
  // its own canonical instead.
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

/**
 * JSON-LD structured data for Organization and WebSite schemas.
 * Helps search engines understand the business and site structure.
 */
function JsonLd() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Parfums De Foda",
    url: siteUrl,
    logo: `${siteUrl}/logos/logo.svg`,
    description: "متجر عطور فاخرة — عطور عربية أصيلة بجودة استثنائية",
    address: {
      "@type": "PostalAddress",
      addressCountry: "EG",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: "Arabic",
    },
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Parfums De Foda",
    url: siteUrl,
    description: "اكتشف تشكيلتنا الفاخرة من العطور العربية الأصيلة",
    inLanguage: "ar",
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const storeSchema = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: "Parfums De Foda",
    url: siteUrl,
    description: "متجر عطور فاخرة — عطور عربية أصيلة",
    priceRange: "$$",
    openingHours: "Mo-Su 09:00-23:00",
    areaServed: {
      "@type": "Country",
      name: "Egypt",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storeSchema) }}
      />
    </>
  );
}

/**
 * Root layout — Server Component.
 * Loads theme data server-side and passes it to the client Provider tree.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await loadTheme();

  /* Brand inputs from data/theme.json, applied on the server render so the
     derived token scales are correct before the first paint (no flash). */
  const brandStyle = {
    ...(theme.colors.accent ? { "--brand-purple": theme.colors.accent } : {}),
    ...(theme.colors.gold ? { "--brand-gold": theme.colors.gold } : {}),
    ...(theme.colors.secondary ? { "--brand-green": theme.colors.secondary } : {}),
    ...(theme.colors.primary ? { "--brand-white": theme.colors.primary } : {}),
  } as React.CSSProperties;

  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} h-full`}
      style={brandStyle}
      suppressHydrationWarning
    >
      <head>
        <JsonLd />
        {theme.colors.primary && (
          <meta name="theme-color" content={theme.colors.primary} />
        )}
      </head>
      <body className="min-h-full flex flex-col font-sans antialiased">
        {/* Skip to content link for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-[9999] focus:rounded-lg focus:bg-[var(--color-accent)] focus:px-4 focus:py-2 focus:text-white focus:outline-none"
        >
          انتقل إلى المحتوى الرئيسي
        </a>
        <Providers theme={theme}>
          {children}
          {/* AI chat assistant — INSIDE Providers so it can read cart/drawer
              state (useCart) and unmount itself while the cart drawer or the
              checkout page is open (prevents overlap with the checkout
              button). Still wrapped in its own error boundary so a failure
              here never takes down the rest of the site. */}
          <ChatAssistant />
        </Providers>
      </body>
    </html>
  );
}
