import type { Metadata, Viewport } from "next";
import { cairo } from "./fonts";
import { Providers } from "./providers";
import { loadTheme } from "@/services/theme";
import { loadFullSettings } from "@/services/settings";
import { loadLocale } from "@/services/localization";
import { loadVisibleProducts } from "@/services/products";
import type { CartCatalogProduct } from "@/lib/cart-utils";
import { t } from "@/lib/locale";
import { formatPrice } from "@/lib/currency";
import { getShippingFee } from "@/lib/shipping";
import { PUBLIC_TIER_LABELS } from "@/lib/product-labels";
import { buildPrimaryNav, genderCounts, genderPublicLabel, type PrimaryNavLabels } from "@/lib/site-nav";
import { SiteShell } from "@/features/layout";
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
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
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
      // The catalogue moved to /shop; the old `/?search=` target now redirects,
      // which search engines penalise, so the sitelinks box points at the real
      // search route.
      target: `${siteUrl}/shop?q={search_term_string}`,
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
  const [theme, settings, localeMessages, products] = await Promise.all([
    loadTheme(),
    loadFullSettings(),
    loadLocale(),
    loadVisibleProducts(),
  ]);

  /* ─── Shell data ───
     The header and footer live here now, so the links they show are resolved
     once per request rather than by each page. A category with no visible
     products is not rendered as a dead link. */
  const navLabels: PrimaryNavLabels = {
    shop: t(localeMessages, "nav.shop", "المتجر"),
    men: t(localeMessages, "nav.men", "رجالي"),
    women: genderPublicLabel("نسائي"),
    unisex: t(localeMessages, "nav.unisex", "للجنسين"),
    oils: t(localeMessages, "nav.oils", "زيوت عطرية"),
  };

  // "زيوت عطرية" only when the catalogue can fill it — a visible oil product.
  const headerNav = buildPrimaryNav(genderCounts(products), navLabels, {
    hasOil: products.some((product) => product.oily),
  });
  const cartCatalogue: CartCatalogProduct[] = products.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    image: product.image,
    status: product.status,
    inStock: product.inStock,
    hidden: product.hidden,
    sizes: product.sizes.map(({ label, price, inStock }) => ({ label, price, inStock })),
  }));

  const houseLinks = Object.entries(PUBLIC_TIER_LABELS)
    .filter(([, label]) => label !== null)
    .map(([house, label]) => ({
      label: label as string,
      href: `/shop?tier=${encodeURIComponent(house)}`,
    }));

  /* Footer columns: the shop routes, the three help routes, and contact — the
     contact column itself is rendered from data/contact.json by the footer. */
  const footerColumns = [
    {
      title: t(localeMessages, "footer.shopTitle", "المتجر"),
      links: headerNav.map((link) => ({ label: link.label, href: link.href })),
    },
    {
      title: t(localeMessages, "footer.helpTitle", "المساعدة"),
      links: [
        {
          label: t(localeMessages, "footer.faq", "الأسئلة الشائعة"),
          href: "/faq",
        },
        {
          label: t(localeMessages, "footer.shippingReturns", "الشحن والإرجاع"),
          href: "/shipping-returns",
        },
        {
          label: t(localeMessages, "footer.contact", "اتصل بنا"),
          href: "/contact",
        },
      ],
    },
  ];

  /* Cash on delivery is the store's only payment method (content/faq.json) and
     shipping is the flat fee from data/settings.json — no number is typed here. */
  const footerNote = t(
    localeMessages,
    "footer.note",
    "الدفع عند الاستلام · شحن ثابت {fee} لكل الطلبات",
  ).replace("{fee}", formatPrice(getShippingFee(settings)));

  /* Cart chrome text, resolved once here so the drawer mounted by the shell
     never has to guess a label or a shipping fee. */
  const cartLabels = {
    title: t(localeMessages, "cart.title", "سلة التسوق"),
    empty: t(localeMessages, "cart.empty", "سلة التسوق فارغة"),
    emptyDescription: t(
      localeMessages,
      "cart.emptyDescription",
      "أضف منتجات إلى السلة للمتابعة",
    ),
    total: t(localeMessages, "cart.total", "المجموع"),
    checkout: t(localeMessages, "cart.checkout", "إتمام الطلب"),
    remove: t(localeMessages, "cart.remove", "إزالة"),
    quantity: t(localeMessages, "cart.quantity", "الكمية"),
    itemsCount: t(localeMessages, "cart.itemsCount", "عدد القطع"),
    continueShopping: t(localeMessages, "cart.continueShopping", "متابعة التسوق"),
    viewCart: t(localeMessages, "cart.viewCart", "عرض السلة"),
    subtotal: t(localeMessages, "cart.subtotal", "المجموع الفرعي"),
    shipping: t(localeMessages, "cart.shipping", "مصاريف الشحن"),
    grandTotal: t(localeMessages, "cart.grandTotal", "الإجمالي"),
    resolveIssues: t(localeMessages, "cart.resolveIssues", "احذف أو صحح الأسطر غير الصالحة قبل إتمام الطلب."),
    issues: {
      "product-unavailable": t(localeMessages, "cart.productUnavailable", "هذا المنتج لم يعد متاحًا. احذفه للمتابعة."),
      "size-unavailable": t(localeMessages, "cart.sizeUnavailable", "هذا الحجم لم يعد متاحًا. احذفه أو ارجع للمنتج."),
      "price-changed": t(localeMessages, "cart.priceChanged", "تغير السعر منذ إضافة المنتج. احذف السطر وأضفه بالسعر الحالي."),
      "invalid-quantity": t(localeMessages, "cart.invalidQuantity", "الكمية غير صالحة. عدّلها لتكون من ١ إلى ٢٠."),
    },
  };

  const headerLabels = {
    nav: t(localeMessages, "header.nav", "القائمة الرئيسية"),
    houses: t(localeMessages, "nav.houses", "الدور"),
    search: t(localeMessages, "header.search", "بحث"),
    searchPlaceholder: t(
      localeMessages,
      "home.searchPlaceholder",
      "ابحث عن عطرك...",
    ),
    searchSubmit: t(localeMessages, "header.searchSubmit", "ابحث"),
    searchSuggestions: t(
      localeMessages,
      "header.searchSuggestions",
      "اقتراحات البحث",
    ),
    searchViewAll: t(
      localeMessages,
      "header.searchViewAll",
      "عرض كل النتائج",
    ),
    searchResultsCount: t(
      localeMessages,
      "header.searchResultsCount",
      "{n} نتيجة",
    ),
    searchNoResults: t(
      localeMessages,
      "header.searchNoResults",
      "لا توجد نتائج مطابقة",
    ),
    cart: t(localeMessages, "cart.title", "سلة التسوق"),
    menu: t(localeMessages, "header.menu", "القائمة"),
    closeMenu: t(localeMessages, "header.close", "إغلاق"),
    whatsapp: t(localeMessages, "contact.whatsapp", "راسلنا عبر واتساب"),
    backToCart: t(localeMessages, "header.backToCart", "العودة للسلة"),
  };

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
          {/* Header + footer live here, so every route — catalogue, category,
              product, FAQ, contact and checkout — wears the same shell. */}
          <SiteShell
            header={{
              storeName: settings.store.name,
              nav: headerNav,
              houses: houseLinks,
              labels: headerLabels,
              whatsappHref: settings.contact.whatsapp
                ? `https://wa.me/${settings.contact.whatsapp}`
                : undefined,
              menuNote: footerNote,
            }}
            footer={{
              storeName: settings.store.name,
              description: settings.footer.description,
              columns: footerColumns,
              contact: settings.contact,
              note: footerNote,
              contactTitle: t(
                localeMessages,
                "footer.contactTitle",
                "تواصل معنا",
              ),
              rights: t(localeMessages, "footer.rights", "جميع الحقوق محفوظة"),
            }}
            cart={{
              labels: cartLabels,
              shippingFee: getShippingFee(settings),
              catalogue: cartCatalogue,
            }}
          >
            {children}
          </SiteShell>
          {/* AI advisor panel — INSIDE Providers so it can read cart state.
              Nothing floats on the page: the header, the hero and the homepage
              band open it through the advisor bus. Wrapped in its own error
              boundary so a failure here never takes down the rest of the site. */}
          <ChatAssistant
            labels={{
              title: t(localeMessages, "advisor.title", "مساعد العطور"),
              close: t(localeMessages, "advisor.close", "إغلاق"),
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
