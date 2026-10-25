import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadProducts, loadVisibleProducts } from "@/services/products";
import { buildProductTitle, productPath } from "@/lib/seo";
import { ProductDetailPageClient } from "@/features/products/components/product-detail-page";

/**
 * Product Detail Page — Server Component.
 *
 * Generates static params for all products at build time.
 * Loads product data and settings server-side, passes to client component.
 */
interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  // Hidden products are not pre-rendered: their URL returns 404.
  const products = await loadVisibleProducts();
  return products.map((product) => ({
    slug: product.slug,
  }));
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const products = await loadVisibleProducts();
  const product = products.find((p) => p.slug === slug);

  if (!product) {
    return {
      title: "المنتج غير موجود",
      description: "عذراً، المنتج الذي تبحث عنه غير موجود.",
    };
  }

  // The root metadata template appends "| Parfums De Foda" — the value passed
  // here must not already contain it, or the title renders twice.
  const seoTitle = buildProductTitle(product);
  const seoDescription =
    product.seo?.description ||
    product.description ||
    `${product.name} — ${product.brand}`;

  return {
    title: seoTitle,
    description: seoDescription,
    // Each product has ONE canonical URL — without this every PDP inherits the
    // homepage canonical and the 40 pages compete as duplicates.
    alternates: {
      canonical: productPath(product.slug),
    },
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      images: [
        {
          url: product.image,
          width: 800,
          height: 800,
          alt: product.name,
        },
      ],
      type: "website",
      locale: "ar_AR",
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: seoDescription,
      images: [product.image],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const products = await loadProducts();

  const product = products.find((p) => p.slug === slug);

  // Hidden products are indistinguishable from missing ones to a shopper.
  if (!product || product.hidden === true) {
    notFound();
  }

  return (
    <ProductDetailPageClient product={product} />
  );
}
