import { notFound } from "next/navigation";
import { ProductCard } from "@/features/products";
import type { Product, ProductSize } from "@/types";

/**
 * /dev/product-card — the card in every state it can be in.
 *
 * Development only (`notFound()` in production). The fixtures below are
 * synthetic on purpose: they exercise states the current catalogue cannot show
 * yet (a single size, a long name) without touching data/products.json.
 *
 * Deliberately static: the guard must run at build time, because a dynamic
 * route has already streamed a 200 by the time the page throws notFound().
 */

function size(label: string, price: number, inStock = true): ProductSize {
  return { label, price, inStock };
}

function fixture(overrides: Partial<Product> & { id: string; name: string }): Product {
  return {
    sku: overrides.id,
    slug: `dev-${overrides.id}`,
    brand: "Parfums De Foda",
    description: "سطر تجريبي لصفحة المراجعة فقط.",
    image: "/products/PF020.png",
    gender: "للجنسين",
    type: "شرقي",
    house: "نيش",
    oily: false,
    fodaOriginal: false,
    season: "شتوي",
    performance: "أداء قوي",
    featured: false,
    badge: "",
    rating: 0,
    reviews: 0,
    status: "active",
    sortOrder: 0,
    sizes: [size("10 مل", 120), size("30 مل", 350)],
    inStock: true,
    notes: { top: [], middle: [], base: [] },
    seo: { title: "", description: "" },
    ...overrides,
  } as Product;
}

const STATES: { label: string; product: Product }[] = [
  {
    label: "عادي · أحجام متعددة",
    product: fixture({ id: "normal", name: "منتج عادي" }),
  },
  {
    label: "فاخر",
    product: fixture({ id: "featured", name: "منتج فاخر", featured: true }),
  },
  {
    label: "حجم واحد",
    product: fixture({
      id: "single",
      name: "حجم واحد",
      sizes: [size("50 مل", 500)],
    }),
  },
  {
    label: "غير متوفر",
    product: fixture({
      id: "sold-out",
      name: "غير متوفر",
      inStock: false,
      sizes: [size("50 مل", 500, false)],
    }),
  },
  {
    label: "قريبًا (لا صورة)",
    product: fixture({
      id: "soon",
      name: "قريبًا",
      image: "/products/placeholder-unavailable.webp",
      inStock: false,
      sizes: [size("50 مل", 500, false)],
    }),
  },
  {
    label: "اسم طويل",
    product: fixture({
      id: "long",
      name: "اسم طويل جدًا لاختبار القص على سطرين داخل البطاقة",
    }),
  },
  {
    label: "بلا دار (دووب)",
    product: fixture({ id: "dupe", name: "بلا دار", house: "دووب" }),
  },
  {
    label: "مع التركيز",
    product: fixture({
      id: "edp",
      name: "مع التركيز",
      concentration: "edp",
    }),
  },
  {
    label: "بلا صورة",
    product: fixture({ id: "no-image", name: "بلا صورة", image: "" }),
  },
  {
    label: "بلا أحجام",
    product: fixture({ id: "no-sizes", name: "بلا أحجام", sizes: [] }),
  },
];

export default function DevProductCardPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="container mx-auto px-4 py-16">
      <h1 className="text-title-2 font-bold text-[var(--color-text)]">
        بطاقة المنتج — كل الحالات
      </h1>
      <p className="mt-2 mb-10 text-body text-[var(--color-text-muted)]">
        صفحة تطوير فقط. الشبكة هي نفسها المستخدمة في الكتالوج (٢ / ٣ / ٤).
      </p>

      <div className="grid grid-cols-2 gap-[var(--space-6)] sm:grid-cols-3 xl:grid-cols-4">
        {STATES.map(({ label, product }) => (
          <div key={product.id} className="flex flex-col gap-2">
            <ProductCard product={product} loading="eager" />
            <p className="text-caption text-[var(--color-text-muted)]">{label}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
