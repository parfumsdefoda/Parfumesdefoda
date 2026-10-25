import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  /** Omitted on the last item (the current page). */
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  /** Absolute origin used for the JSON-LD `item` values. */
  siteUrl: string;
  /** Accessible name of the navigation landmark. */
  label?: string;
  className?: string;
}

/**
 * Breadcrumbs — the visible trail plus the BreadcrumbList a crawler reads.
 *
 * Both come from the same list, so the structured data can never describe a
 * path the shopper cannot see. The chevron points inline-end (RTL: left), and
 * the current page is marked `aria-current` instead of being a dead link.
 */
export function Breadcrumbs({
  items,
  siteUrl,
  label = "مسار التنقل",
  className,
}: BreadcrumbsProps) {
  if (items.length === 0) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: `${siteUrl}${item.href}` } : {}),
    })),
  };

  return (
    <nav aria-label={label} className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-caption text-[var(--color-text-muted)]">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronLeft
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-[var(--color-border-strong)]"
                />
              )}
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="rounded-control transition-colors hover:text-[var(--color-brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className="font-medium text-[var(--color-text)]"
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </nav>
  );
}
