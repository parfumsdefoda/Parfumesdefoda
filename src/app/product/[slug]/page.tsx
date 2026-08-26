import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadProducts } from "@/services/products";
import { loadFullSettings } from "@/services/settings";
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
  const products = await loadProducts();
  return products.map((product) => ({
    slug: product.slug,
  }));
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const products = await loadProducts();
  const product = products.find((p) => p.slug === slug);

  if (!product) {
    return {
      title: "المنتج غير موجود",
      description: "عذراً، المنتج الذي تبحث عنه غير موجود.",
    };
  }

  const seoTitle = product.seo?.title || `${product.name} | Parfums De Foda`;
  const seoDescription =
    product.seo?.description ||
    product.description ||
    `${product.name} — ${product.brand}`;

  return {
    title: seoTitle,
    description: seoDescription,
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
  const [products, settings] = await Promise.all([
    loadProducts(),
    loadFullSettings(),
  ]);

  const product = products.find((p) => p.slug === slug);

  if (!product) {
    notFound();
  }

  return (
    <ProductDetailPageClient
      product={product}
      settings={settings}
    />
  );
}
