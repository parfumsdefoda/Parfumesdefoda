import Link from "next/link";
import { Banknote, MessageCircle, Truck } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ProductCard, type ProductCardLabels } from "./product-card";
import { ProductGallery, type ProductGalleryLabels } from "./product-gallery";
import {
  ProductPurchase,
  type ProductPurchaseLabels,
} from "./product-purchase";
import { Breadcrumbs } from "@/features/layout";
import { cardMetaParts } from "@/lib/card-presentation";
import { imageSlug } from "@/lib/product-image";
import { isComingSoon } from "@/lib/product-availability";
import { categoryHref, CATEGORY_ROUTES } from "@/lib/site-nav";
import type { Product } from "@/types";

export interface ProductDetailLabels {
  breadcrumbHome: string;
  breadcrumbShop: string;
  purchase: ProductPurchaseLabels;
  gallery: ProductGalleryLabels;
  /** Heading for the details group, announced but not drawn. */
  details: string;
  description: string;
  pyramid: string;
  notesTop: string;
  notesMiddle: string;
  notesBase: string;
  seasonPerformance: string;
  shippingReturns: string;
  shippingBody: string;
  readPolicy: string;
  trustCod: string;
  trustShipping: string;
  trustConfirm: string;
  askAbout: string;
  related: string;
  comingSoonTitle: string;
  comingSoonBody: string;
  backToShop: string;
  notifyMe: string;
}

export interface ProductDetailPageProps {
  product: Product;
  related: Product[];
  labels: ProductDetailLabels;
  cardLabels: ProductCardLabels;
  /** The category label, already resolved by the route's locale. */
  categoryLabel?: string;
  /** Facts the store can stand behind, resolved from settings. */
  shippingFee: string;
  whatsapp?: string;
  siteUrl: string;
}

/**
 * ProductDetailPage — the product, as a Server Component.
 *
 * Only two islands run JavaScript: the gallery (photos, swipe, zoom) and the
 * purchase block (size, price, add to cart, the phone bar). Everything a
 * crawler or a shopper reads first — name, meta, description, notes, details,
 * trust facts, related products — is HTML.
 *
 * The page never states a fact the catalogue does not contain: the pyramid is
 * omitted when there are no notes, the price follows the selected size, and the
 * trust list is cash on delivery, the flat shipping fee and a WhatsApp
 * confirmation.
 */
export function ProductDetailPage({
  product,
  related,
  labels,
  cardLabels,
  categoryLabel,
  shippingFee,
  whatsapp,
  siteUrl,
}: ProductDetailPageProps) {
  const comingSoon = isComingSoon(product);
  const metaParts = cardMetaParts(product);
  const notes = product.notes;
  const hasNotes =
    notes.top.length > 0 || notes.middle.length > 0 || notes.base.length > 0;

  const category = CATEGORY_ROUTES.find(
    (route) => route.gender === product.gender,
  );

  const images = [
    product.image,
    ...(product.gallery ?? []).filter((src) => src !== product.image),
  ].map((src) => ({ slug: imageSlug(src), src }));

  const inquiry = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(
        `${labels.askAbout}: ${product.name}`,
      )}`
    : null;
  const notify = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(
        `${labels.notifyMe}: ${product.name}`,
      )}`
    : null;

  return (
    <article className="mx-auto w-full max-w-[1280px] px-4 py-[var(--space-8)]">
      <Breadcrumbs
        items={[
          { label: labels.breadcrumbHome, href: "/" },
          { label: labels.breadcrumbShop, href: "/shop" },
          ...(category && categoryLabel
            ? [
                {
                  label: categoryLabel,
                  href: categoryHref(category.slug),
                },
              ]
            : []),
          { label: product.name },
        ]}
        siteUrl={siteUrl}
        className="mb-6"
      />

      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="md:sticky md:top-24 md:self-start">
          <ProductGallery
            images={images}
            name={product.name}
            labels={labels.gallery}
            comingSoon={comingSoon}
          />
        </div>

        <div className="flex flex-col gap-5">
          {metaParts.length > 0 && (
            <p className="text-caption text-[var(--color-text-muted)]">
              {metaParts.join(" · ")}
            </p>
          )}

          <h1 className="text-title-1 font-bold text-[var(--color-text)]">
            {product.name}
          </h1>

          {comingSoon ? (
            <div className="rounded-card border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
              <p className="text-body font-bold text-[var(--color-text)]">
                {labels.comingSoonTitle}
              </p>
              <p className="mt-1 text-caption text-[var(--color-text-muted)]">
                {labels.comingSoonBody}
              </p>
              <Button
                render={<Link href="/shop" />}
                variant="secondary"
                className="mt-4 font-bold"
              >
                {labels.backToShop}
              </Button>
            </div>
          ) : (
            <>
              <ProductPurchase
                product={{
                  id: product.id,
                  slug: product.slug,
                  name: product.name,
                  image: product.image,
                  sizes: product.sizes,
                }}
                description={product.description}
                labels={labels.purchase}
              />

              {product.sizes.every((size) => !size.inStock) && notify && (
                <a
                  href={notify}
                  className="text-caption font-bold text-[var(--color-brand)] underline-offset-4 hover:underline"
                >
                  {labels.notifyMe}
                </a>
              )}

              {inquiry && (
                <a
                  href={inquiry}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-caption text-[var(--color-text-muted)] underline-offset-4 hover:text-[var(--color-brand)] hover:underline"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  {labels.askAbout}
                </a>
              )}

              <ul className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-4 text-caption text-[var(--color-text-muted)]">
                <li className="flex items-center gap-2">
                  <Banknote className="h-4 w-4" aria-hidden="true" />
                  {labels.trustCod}
                </li>
                <li className="flex items-center gap-2">
                  <Truck className="h-4 w-4" aria-hidden="true" />
                  {labels.trustShipping.replace("{fee}", shippingFee)}
                </li>
                <li className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  {labels.trustConfirm}
                </li>
              </ul>
            </>
          )}

          {/* The accordion items are <h3>; this keeps the document heading
              order h1 → h2 → h3 without adding a visible title. */}
          <h2 className="sr-only">{labels.details}</h2>

          <Accordion className="border-t border-[var(--color-border)]">
            {product.description && (
              <AccordionItem value="description">
                <AccordionTrigger className="py-3 text-body font-bold">
                  {labels.description}
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-caption text-[var(--color-text-muted)]">
                  {product.description}
                </AccordionContent>
              </AccordionItem>
            )}

            {hasNotes && (
              <AccordionItem value="pyramid">
                <AccordionTrigger className="py-3 text-body font-bold">
                  {labels.pyramid}
                </AccordionTrigger>
                <AccordionContent className="flex flex-col gap-2 pb-4 text-caption text-[var(--color-text-muted)]">
                  {notes.top.length > 0 && (
                    <p>
                      <span className="font-bold text-[var(--color-text)]">
                        {labels.notesTop}
                      </span>{" "}
                      {notes.top.join("، ")}
                    </p>
                  )}
                  {notes.middle.length > 0 && (
                    <p>
                      <span className="font-bold text-[var(--color-text)]">
                        {labels.notesMiddle}
                      </span>{" "}
                      {notes.middle.join("، ")}
                    </p>
                  )}
                  {notes.base.length > 0 && (
                    <p>
                      <span className="font-bold text-[var(--color-text)]">
                        {labels.notesBase}
                      </span>{" "}
                      {notes.base.join("، ")}
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>
            )}

            <AccordionItem value="facts">
              <AccordionTrigger className="py-3 text-body font-bold">
                {labels.seasonPerformance}
              </AccordionTrigger>
              <AccordionContent className="pb-4 text-caption text-[var(--color-text-muted)]">
                {product.season} · {product.performance}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="shipping">
              <AccordionTrigger className="py-3 text-body font-bold">
                {labels.shippingReturns}
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-2 pb-4 text-caption text-[var(--color-text-muted)]">
                <p>{labels.shippingBody.replace("{fee}", shippingFee)}</p>
                <Link
                  href="/shipping-returns"
                  className="self-start font-bold text-[var(--color-brand)] underline-offset-4 hover:underline"
                >
                  {labels.readPolicy}
                </Link>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {related.length >= 2 && (
        <section
          aria-labelledby="related-heading"
          className="mt-[var(--space-section)]"
        >
          <h2 id="related-heading" className="mb-6 text-title-2 font-bold">
            {labels.related}
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
            {related.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                labels={cardLabels}
                suppressFeatured
              />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
