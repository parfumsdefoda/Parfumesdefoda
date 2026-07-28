import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export interface FooterLink {
  label: string;
  href?: string;
  url?: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface FooterProps {
  /** Store description */
  description?: string;
  /** Navigation columns */
  columns?: FooterColumn[];
  /** Copyright text */
  copyright?: string;
  /** Current year (for copyright) */
  year?: number;
  className?: string;
}

/**
 * Footer — site footer with columns of links and copyright.
 * Fully RTL-aware.
 * Pure presentational.
 */
export function Footer({
  description = "وجهتك الأولى للعطور الفاخرة",
  columns = [],
  copyright = "جميع الحقوق محفوظة",
  year,
  className,
}: FooterProps) {
  const currentYear = year ?? new Date().getFullYear();

  return (
    <footer
      className={`border-t border-[var(--border-default)] bg-[var(--bg-secondary)] ${className ?? ""}`}
    >
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-[1.5fr_2fr] gap-8">
          {/* Brand description */}
          <div>
            <p className="text-sm text-[var(--neutral-500)] leading-relaxed max-w-xs">
              {description}
            </p>
          </div>

          {/* Link columns */}
          {columns.length > 0 && (
            <div className="grid grid-cols-2 gap-6">
              {columns.map((col) => (
                <div key={col.title}>
                  <h4 className="text-sm font-semibold text-[var(--neutral-800)] mb-3">
                    {col.title}
                  </h4>
                  <ul className="space-y-2">
                    {col.links.map((link) => (
                      <li key={link.label}>
                        {link.href ? (
                          <Link
                            href={link.href}
                            className="text-sm text-[var(--neutral-500)] hover:text-[var(--color-accent)] transition-colors"
                          >
                            {link.label}
                          </Link>
                        ) : link.url ? (
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[var(--neutral-500)] hover:text-[var(--color-accent)] transition-colors"
                          >
                            {link.label}
                          </a>
                        ) : (
                          <span className="text-sm text-[var(--neutral-500)]">
                            {link.label}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator className="my-6" />

        <p className="text-center text-xs text-[var(--neutral-400)]">
          &copy; {currentYear} Parfums De Foda — {copyright}
        </p>
      </div>
    </footer>
  );
}
