import { Banknote, MessageCircle, Truck } from "lucide-react";

export interface TrustItem {
  /** Icon key — the three facts the store actually offers. */
  icon: "payment" | "shipping" | "confirmation";
  title: string;
  detail: string;
}

export interface TrustBandProps {
  title: string;
  items: TrustItem[];
}

const ICONS = {
  payment: Banknote,
  shipping: Truck,
  confirmation: MessageCircle,
} as const;

/**
 * TrustBand — three facts, no claims.
 *
 * Cash on delivery, the flat shipping fee (read from data/settings.json through
 * the shipping helper, never typed here) and the WhatsApp confirmation every
 * order actually gets. There is deliberately no "authentic" or "guaranteed"
 * line: the store has not made those promises anywhere, so the homepage does
 * not make them either.
 */
export function TrustBand({ title, items }: TrustBandProps) {
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="trust-heading"
      className="border-t border-[var(--brand-gold)] bg-[var(--color-surface)]"
    >
      <div className="mx-auto w-full max-w-[1280px] px-4 py-[var(--space-section)]">
        <h2 id="trust-heading" className="sr-only">
          {title}
        </h2>
        <ul className="grid gap-6 sm:grid-cols-3">
          {items.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <li key={item.icon} className="flex items-start gap-3">
                <Icon
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-brand)]"
                />
                <div>
                  <p className="text-caption font-bold text-[var(--color-text)]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-caption text-[var(--color-text-muted)]">
                    {item.detail}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
