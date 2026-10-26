import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadProducts, loadVisibleProducts } from "@/services/products";
import { loadFullSettings } from "@/services/settings";
import { loadLocale } from "@/services/localization";
import { buildProductTitle, getSiteUrl, productPath } from "@/lib/seo";
import { buildProductImageSources } from "@/lib/product-image";
import { buildProductJsonLd } from "@/lib/product-jsonld";
import { selectRelatedProducts } from "@/lib/related-products";
import { getShippingFee } from "@/lib/shipping";
import { formatPrice } from "@/lib/currency";
import { t } from "@/lib/locale";
import { CATEGORY_ROUTES } from "@/lib/site-nav";
import { buildCardLabels } from "@/features/catalog/catalog-props";
import { ProductDetailPage } from "@/features/products/components/product-detail-page";

/**
 * Product Detail Page — Server Component.
 *
 * The whole page is decided here from the catalogue; the two client islands
 * (gallery, purchase) receive plain data, never a service or a file handle.
 */
interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  // Hidden products are not pre-rendered: their URL returns 404.
  const products = await loadVisibleProducts();
  return products.map((product) => ({ slug: product.slug }));
}

/** Absolute Open Graph image: the derived 2000px frame when one exists. */
function ogImage(product: { slug: string; image: string }): {
  url: string;
  width: number;
  height: number;
} {
  const sources = buildProductImageSources(product.slug, "pdp");
  return {
    url: sources ? `${getSiteUrl()}${sources.src}` : product.image,
    width: sources?.width ?? 800,
    height: sources?.height ?? 800,
  };
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const products = await loadVisibleProducts();
  const product = products.find((p) => p.slug === slug);

  if (!product) {
    return { title: "المنتج غير موجود", description: "المنتج غير موجود." };
  }

  // The root metadata template appends "| Parfums De Foda" — the value passed
  // here must not already contain it, or the title renders twice.
  const seoTitle = buildProductTitle(product);
  const seoDescription =
    product.seo?.description ||
    product.description ||
    `${product.name} — ${product.brand}`;
  const image = ogImage(product);

  return {
    title: seoTitle,
    description: seoDescription,
    alternates: { canonical: productPath(product.slug) },
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      images: [{ ...image, alt: product.name }],
      type: "website",
      locale: "ar_AR",
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: seoDescription,
      images: [image.url],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const [products, settings, locale] = await Promise.all([
    loadProducts(),
    loadFullSettings(),
    loadLocale(),
  ]);

  const product = products.find((entry) => entry.slug === slug);

  // Hidden products are indistinguishable from missing ones to a shopper.
  if (!product || product.hidden === true) {
    notFound();
  }

  const siteUrl = getSiteUrl();
  const shippingFee = formatPrice(getShippingFee(settings));
  const category = CATEGORY_ROUTES.find(
    (route) => route.gender === product.gender,
  );
  const categoryLabel = category
    ? t(
        locale,
        category.slug === "men"
          ? "nav.men"
          : category.slug === "women"
            ? "nav.women"
            : "nav.unisex",
        category.slug === "men" ? "رجالي" : category.slug === "women" ? "حريمي" : "للجنسين",
      )
    : undefined;

  const jsonLd = buildProductJsonLd(product, siteUrl);
  const related = selectRelatedProducts(product, products);

  return (
    <>
      <script
        type="application/ld+json"
        // Structured data built from the catalogue's own fields — no rating,
        // no reviews, no brand claim the store cannot support.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <ProductDetailPage
        product={product}
        related={related}
        siteUrl={siteUrl}
        categoryLabel={categoryLabel}
        shippingFee={shippingFee}
        whatsapp={settings.contact.whatsapp || undefined}
        cardLabels={buildCardLabels(locale)}
        labels={{
          breadcrumbHome: t(locale, "product.breadcrumbHome", "الرئيسية"),
          breadcrumbShop: t(locale, "product.breadcrumbShop", "المتجر"),
          description: t(locale, "product.descriptionTitle", "وصف العطر"),
          pyramid: t(locale, "product.pyramid", "هرم العطر"),
          notesTop: t(locale, "product.notesTop", "المقدمة"),
          notesMiddle: t(locale, "product.notesMiddle", "القلب"),
          notesBase: t(locale, "product.notesBase", "القاعدة"),
          seasonPerformance: t(
            locale,
            "product.seasonPerformance",
            "الفصل والأداء",
          ),
          shippingReturns: t(locale, "product.shippingReturns", "الشحن والاسترجاع"),
          shippingBody: t(
            locale,
            "product.shippingBody",
            "شحن ثابت {fee} لكل الطلبات، والدفع عند الاستلام.",
          ),
          readPolicy: t(
            locale,
            "product.readPolicy",
            "اقرأ سياسة الشحن والاسترجاع",
          ),
          trustCod: t(locale, "product.trustCod", "الدفع عند الاستلام"),
          trustShipping: t(
            locale,
            "product.trustShipping",
            "شحن ثابت {fee} لكل الطلبات",
          ),
          trustConfirm: t(
            locale,
            "product.trustConfirm",
            "تأكيد الطلب عبر واتساب",
          ),
          askAbout: t(locale, "product.askAbout", "اسأل عن هذا العطر"),
          notifyMe: t(locale, "product.notifyMe", "أبلغني عند التوفر"),
          backToShop: t(locale, "product.backToShop", "تصفّح المتجر"),
          related: t(locale, "product.related", "عطور مشابهة"),
          comingSoonTitle: t(locale, "product.comingSoonTitle", "قريبًا"),
          comingSoonBody: t(
            locale,
            "product.comingSoonBody",
            "سيتوفر هذا المنتج قريباً. تصفّح التشكيلة الحالية في المتجر.",
          ),
          purchase: {
            chooseSize: t(locale, "product.selectSize", "اختر الحجم"),
            addToCart: t(locale, "product.addToCart", "أضف إلى السلة"),
            addedToast: t(
              locale,
              "product.addedToCart",
              "تمت إضافة {name} إلى السلة",
            ),
            inStock: t(locale, "product.inStock", "متوفر"),
            outOfStock: t(locale, "product.outOfStock", "غير متوفر"),
            sizeUnavailable: t(
              locale,
              "product.sizeUnavailable",
              "غير متوفر",
            ),
          },
          gallery: {
            thumbnail: t(locale, "product.gallery.thumbnail", "صورة {n}"),
            zoom: t(locale, "product.gallery.zoom", "تكبير الصورة"),
            zoomTitle: product.name,
            slides: t(locale, "product.gallery.slides", "صور المنتج"),
            comingSoon: t(locale, "product.gallery.comingSoon", "قريبًا"),
          },
        }}
      />
    </>
  );
}
