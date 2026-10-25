import type { Metadata } from "next";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { loadFullSettings } from "@/services/settings";
import { loadLocale } from "@/services/localization";
import { t } from "@/lib/locale";

/**
 * /contact — the ways to reach the store, taken from data/contact.json.
 *
 * Every link only renders when the corresponding value exists, so removing a
 * number from the JSON removes the row instead of leaving a dead link.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await loadLocale();
  const title = t(locale, "contact.title", "اتصل بنا");
  return {
    title,
    description: t(locale, "contact.description", "تواصل معنا لأي استفسار أو طلب"),
    alternates: { canonical: "/contact" },
  };
}

export default async function ContactPage() {
  const [settings, locale] = await Promise.all([loadFullSettings(), loadLocale()]);
  const { whatsapp, email, phone } = settings.contact;

  const rows = [
    whatsapp
      ? {
          key: "whatsapp",
          label: t(locale, "contact.whatsapp", "راسلنا عبر واتساب"),
          value: whatsapp,
          href: `https://wa.me/${whatsapp}`,
          Icon: MessageCircle,
          external: true,
        }
      : null,
    email
      ? {
          key: "email",
          label: t(locale, "contact.email", "أرسل لنا بريداً إلكترونياً"),
          value: email,
          href: `mailto:${email}`,
          Icon: Mail,
          external: false,
        }
      : null,
    phone
      ? {
          key: "phone",
          label: t(locale, "contact.phone", "اتصل بنا"),
          value: phone,
          href: `tel:${phone}`,
          Icon: Phone,
          external: false,
        }
      : null,
  ].filter((row) => row !== null);

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pb-[var(--space-section)] pt-8">
      <h1 className="mb-2 text-title-3 font-bold text-[var(--color-text)]">
        {t(locale, "contact.title", "اتصل بنا")}
      </h1>
      <p className="mb-8 text-caption text-[var(--color-text-muted)]">
        {t(locale, "contact.description", "تواصل معنا لأي استفسار أو طلب")}
      </p>

      <ul className="flex flex-col gap-3">
        {rows.map(({ key, label, value, href, Icon, external }) => (
          <li key={key}>
            <a
              href={href}
              {...(external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="flex items-center gap-3 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 transition-colors hover:border-[var(--color-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            >
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-caption font-bold text-[var(--color-text)]">
                  {label}
                </span>
                <span dir="ltr" className="truncate text-caption text-[var(--color-text-muted)]">
                  {value}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
