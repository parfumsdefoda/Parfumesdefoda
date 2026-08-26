"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Loader2, Star, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageLayout } from "@/features/layout";
import { CartDrawer } from "@/features/cart";
import { useCart } from "@/providers/CartProvider";
import { useToast } from "@/features/toast";
import { useSettings } from "@/hooks/use-settings";
import { formatPrice } from "@/lib/currency";
import type { Product } from "@/types";
import type { FullSettings } from "@/types/services";

// ─── Types ──────────────────────────────────────────────────────────────────

type ButtonState = "idle" | "loading" | "success";

export interface ProductDetailPageClientProps {
  product: Product;
  settings: FullSettings;
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * ProductDetailPageClient — client-side product detail page.
 *
 * Displays full product information: gallery, details, size selector,
 * and add-to-cart functionality. Integrates with the existing cart system.
 */
export function ProductDetailPageClient({
  product,
  settings,
}: ProductDetailPageClientProps) {
  const cart = useCart();
  const { showToast } = useToast();
  const settingsData = useSettings(settings);

  // ─── State ───
  const [selectedSizeIndex, setSelectedSizeIndex] = useState<number>(() => {
    // Default to first available size
    const availableIndex = product.sizes.findIndex((s) => s.inStock);
    return availableIndex >= 0 ? availableIndex : 0;
  });
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [buttonState, setButtonState] = useState<ButtonState>("idle");
  const [cartOpen, setCartOpen] = useState(false);

  // ─── Derived ───
  const selectedSize = product.sizes[selectedSizeIndex];
  const isOutOfStock = selectedSize ? !selectedSize.inStock : true;
  const isProductOutOfStock = !product.inStock;
  const gallery = product.gallery?.length > 0 ? product.gallery : [product.image];
  const currentImage = gallery[selectedImageIndex] ?? product.image;

  // ─── Handlers ───
  const handleAddToCart = useCallback(() => {
    if (!selectedSize || isOutOfStock || buttonState !== "idle") return;

    setButtonState("loading");
    cart.addItem({
      productId: product.id,
      sizeLabel: selectedSize.label,
      price: selectedSize.price,
      name: product.name,
      image: product.image,
    });
    showToast(`تمت إضافة ${product.name} إلى السلة`, "success");

    // Brief loading pulse then success
    setTimeout(() => {
      setButtonState("success");
      setTimeout(() => {
        setButtonState("idle");
      }, 1500);
    }, 350);
  }, [selectedSize, isOutOfStock, buttonState, cart, product, showToast]);

  const handleCartCheckout = useCallback(() => {
    setCartOpen(false);
    window.location.href = "/checkout";
  }, []);

  // ─── Cart items mapped to CartDrawer format ───
  const cartDrawerItems = cart.items.map((item) => ({
    productId: item.productId,
    sizeLabel: item.sizeLabel,
    price: item.price,
    quantity: item.quantity,
    name: item.name,
    image: item.image,
  }));

  // ─── Notes ───
  const hasNotes =
    product.notes &&
    ((product.notes.top?.length ?? 0) > 0 ||
      (product.notes.middle?.length ?? 0) > 0 ||
      (product.notes.base?.length ?? 0) > 0);

  return (
    <PageLayout
      headerProps={{
        navItems: settingsData.navigation,
        cartCount: cart.totalItems,
        onCartClick: () => setCartOpen(true),
      }}
      footerProps={{
        description: settingsData.footerDescription,
        columns: settingsData.footerColumns,
      }}
    >
      <div className="container mx-auto px-4 py-6 md:py-10">
        {/* Breadcrumb */}
        <nav aria-label="التنقل" className="mb-6">
          <ol className="flex items-center gap-2 text-sm text-[var(--neutral-500)]">
            <li>
              <Link
                href="/"
                className="hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 rounded"
              >
                الرئيسية
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-4 w-4" />
            </li>
            <li className="text-[var(--neutral-800)] font-medium" aria-current="page">
              {product.name}
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* ─── Image Gallery ─── */}
          <div className="space-y-4">
            {/* Main image */}
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedImageIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="relative h-full w-full"
                >
                  <Image
                    src={currentImage}
                    alt={`${product.name} — صورة ${selectedImageIndex + 1}`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-contain p-6"
                    quality={90}
                    priority
                  />
                </motion.div>
              </AnimatePresence>

              {/* Featured badge */}
              {product.featured && (
                <div className="absolute top-4 start-4 z-10">
                  <span className="inline-flex items-center rounded-full bg-gradient-to-l from-[#d4af37] to-[#f5d060] px-3 py-1.5 text-xs font-bold text-white shadow-md">
                    مميز
                  </span>
                </div>
              )}

              {/* Product badge */}
              {product.badge && (
                <div className="absolute top-4 end-4 z-10">
                  <span className="inline-flex items-center rounded-full bg-[var(--color-gold)] px-3 py-1.5 text-xs font-semibold text-white">
                    {product.badge}
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {gallery.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {gallery.map((img, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    aria-label={`صورة ${index + 1}`}
                    aria-pressed={selectedImageIndex === index}
                    className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                      selectedImageIndex === index
                        ? "border-[var(--color-accent)] shadow-md"
                        : "border-[var(--border-default)] hover:border-[var(--neutral-300)]"
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} — صورة مصغرة ${index + 1}`}
                      fill
                      sizes="80px"
                      className="object-contain p-1"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ─── Product Info ─── */}
          <div className="flex flex-col gap-5">
            {/* House badge */}
            {product.house && (
              <div>
                <span className="inline-flex items-center rounded-full bg-[var(--color-gold)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-gold)]">
                  {product.house}
                </span>
              </div>
            )}

            {/* Product name */}
            <h1 className="text-3xl md:text-4xl font-bold text-[var(--neutral-800)] leading-tight">
              {product.name}
            </h1>

            {/* Brand */}
            <p className="text-lg text-[var(--neutral-500)]">
              {product.brand}
            </p>

            {/* Rating */}
            {product.rating > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.round(product.rating)
                          ? "fill-[var(--color-gold)] text-[var(--color-gold)]"
                          : "fill-[var(--neutral-200)] text-[var(--neutral-200)]"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-[var(--neutral-500)]">
                  ({product.reviews} تقييم)
                </span>
              </div>
            )}

            <Separator />

            {/* Product details grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-[var(--neutral-400)] mb-1">الجنس</span>
                <span className="font-medium text-[var(--neutral-700)]">{product.gender}</span>
              </div>
              <div>
                <span className="block text-[var(--neutral-400)] mb-1">النوع</span>
                <span className="font-medium text-[var(--neutral-700)]">{product.type}</span>
              </div>
              <div>
                <span className="block text-[var(--neutral-400)] mb-1">الدار</span>
                <span className="font-medium text-[var(--neutral-700)]">{product.house}</span>
              </div>
              <div>
                <span className="block text-[var(--neutral-400)] mb-1">الفصل</span>
                <span className="font-medium text-[var(--neutral-700)]">{product.season}</span>
              </div>
              <div className="col-span-2">
                <span className="block text-[var(--neutral-400)] mb-1">الأداء</span>
                <span className="font-medium text-[var(--neutral-700)]">{product.performance}</span>
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h2 className="text-sm font-semibold text-[var(--neutral-800)] mb-2">
                الوصف
              </h2>
              <p className="text-[var(--neutral-600)] leading-relaxed">
                {product.description || "الوصف غير متوفر حالياً"}
              </p>
            </div>

            {/* Fragrance notes */}
            {hasNotes && (
              <>
                <Separator />
                <div>
                  <h2 className="text-sm font-semibold text-[var(--neutral-800)] mb-3">
                    ملاحظات العطر
                  </h2>
                  <div className="space-y-3">
                    {product.notes.top && product.notes.top.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-[var(--color-accent)]">
                          المقدمة
                        </span>
                        <p className="text-sm text-[var(--neutral-600)]">
                          {product.notes.top.join("، ")}
                        </p>
                      </div>
                    )}
                    {product.notes.middle && product.notes.middle.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-[var(--color-accent)]">
                          القلب
                        </span>
                        <p className="text-sm text-[var(--neutral-600)]">
                          {product.notes.middle.join("، ")}
                        </p>
                      </div>
                    )}
                    {product.notes.base && product.notes.base.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-[var(--color-accent)]">
                          القاعدة
                        </span>
                        <p className="text-sm text-[var(--neutral-600)]">
                          {product.notes.base.join("، ")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Size selector */}
            <div>
              <h2 className="text-sm font-semibold text-[var(--neutral-800)] mb-3">
                اختر الحجم
              </h2>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size, index) => {
                  const isSelected = selectedSizeIndex === index;
                  const sizeOutOfStock = !size.inStock;
                  return (
                    <button
                      key={size.label}
                      type="button"
                      disabled={sizeOutOfStock}
                      onClick={() => setSelectedSizeIndex(index)}
                      aria-label={`${size.label} — ${formatPrice(size.price)}${sizeOutOfStock ? " — غير متوفر" : ""}`}
                      aria-pressed={isSelected}
                      className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
                        isSelected
                          ? "bg-[var(--color-accent)] text-white shadow-md"
                          : sizeOutOfStock
                            ? "bg-[var(--bg-secondary)] text-[var(--neutral-300)] cursor-not-allowed line-through"
                            : "bg-[var(--bg-secondary)] text-[var(--neutral-600)] border border-transparent hover:border-[var(--color-gold)] hover:text-[var(--neutral-800)]"
                      }`}
                    >
                      {size.label}
                      {!sizeOutOfStock && (
                        <span className="ms-2 text-xs opacity-75">
                          {formatPrice(size.price)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price */}
            {selectedSize && (
              <div className="flex items-baseline gap-3">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={selectedSize.label}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="text-3xl font-bold tracking-tight text-[var(--color-accent)]"
                  >
                    {formatPrice(selectedSize.price)}
                  </motion.span>
                </AnimatePresence>
                <span className="text-xs text-[var(--neutral-400)]">
                  شامل الضريبة
                </span>
              </div>
            )}

            {/* Stock status */}
            {(isOutOfStock || isProductOutOfStock) && (
              <div className="flex items-center gap-2 rounded-lg bg-[var(--color-error)]/10 px-4 py-2.5 text-sm text-[var(--color-error)]">
                <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-error)]" />
                غير متوفر حالياً
              </div>
            )}

            {/* Add to cart button */}
            <Button
              onClick={handleAddToCart}
              disabled={isOutOfStock || isProductOutOfStock || buttonState !== "idle"}
              variant="default"
              className={`h-12 w-full rounded-full text-sm font-semibold ${
                buttonState === "success"
                  ? "!bg-[var(--color-success)] !text-white hover:!bg-[var(--color-success)]"
                  : ""
              }`}
              aria-label={
                isOutOfStock || isProductOutOfStock
                  ? "غير متوفر"
                  : buttonState === "success"
                    ? "تمت الإضافة"
                    : "أضف إلى السلة"
              }
            >
              {isOutOfStock || isProductOutOfStock ? (
                "غير متوفر"
              ) : buttonState === "loading" ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>جاري الإضافة...</span>
                </span>
              ) : buttonState === "success" ? (
                <span className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  <span>تمت الإضافة إلى السلة</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                  <span>أضف إلى السلة</span>
                </span>
              )}
            </Button>

            {/* Continue shopping link */}
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 text-sm text-[var(--neutral-500)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 rounded"
            >
              <ChevronRight className="h-4 w-4" />
              متابعة التصفح
            </Link>
          </div>
        </div>
      </div>

      {/* Cart Drawer */}
      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        items={cartDrawerItems}
        title="سلة التسوق"
        emptyTitle="سلة التسوق فارغة"
        emptyDescription="أضف منتجات إلى السلة للمتابعة"
        totalLabel="المجموع"
        checkoutLabel="إتمام الطلب"
        removeLabel="إزالة"
        quantityLabel="الكمية"
        onUpdateQuantity={cart.updateQuantity}
        onRemoveItem={cart.removeItem}
        onCheckout={handleCartCheckout}
      />
    </PageLayout>
  );
}
