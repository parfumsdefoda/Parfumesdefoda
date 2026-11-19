export interface FooterLink {
  label: string;
  /** External link (WhatsApp, mail, tel). Opened in a new tab. */
  url?: string;
}

export interface FooterContact {
  whatsapp?: string;
  email?: string;
  phone?: string;
}

export interface FooterProps {
  storeName?: string;
  /** One line about the store, from data/footer.json. */
  description?: string
  contact?: FooterContact;
  contactTitle?: string;
  rights?: string;
  /** Checkout keeps only the contact line. */
  reduced?: boolean;
  className?: string;
}

/**
 * Footer — RUN 1.6: brand green, big logo, contact column only.
 *
 * `bg [--brand-green]` (the token derived from theme.json, never a raw hex),
 * purple text throughout (`--purple-950` body, brand purple headings), a 1px
 * purple hairline on top and no gold. The text heading "Parfums De Foda" is
 * replaced by the logo at ~120px high on desktop / ~88px on mobile.
 *
 * Logo treatment: the SVG (`public/logos/logo.svg`) is a transparent vector
 * whose green fill is the same hue as the footer background, so it is seated
 * on an ivory (paper) plate with a 1px purple border — a deliberate plate,
 * never a stray white box. The /#contact anchor stays on the contact column.
 *
 * The help column (المساعدة) is gone: /faq, /shipping-returns and /contact
 * remain as pages, but nothing in the footer links to them. The brand
 * tagline and the cash/shipping line do not render here either.
 */
export function Footer({
  storeName = "Parfums De Foda",
  description,
  contact,
  contactTitle = "تواصل معنا",
  rights = "جميع الحقوق محفوظة",
  reduced = false,
  className,
}: FooterProps) {
  const contactLinks: FooterLink[] = [];
  if (contact?.whatsapp) {
    contactLinks.push({
      label: "واتساب",
      url: `https://wa.me/${contact.whatsapp}`,
    });
  }
  if (contact?.email) {
    contactLinks.push({ label: contact.email, url: `mailto:${contact.email}` });
  }
  if (contact?.phone) {
    contactLinks.push({ label: contact.phone, url: `tel:${contact.phone}` });
  }

  const logo = (
    <span
      className="inline-flex items-center justify-center border border-[var(--purple-950)] bg-[var(--boutique-white)] px-4 py-3"
      role="img"
      aria-label={storeName}
    >
      <span
        aria-hidden="true"
        className="block h-[88px] w-[88px] bg-contain bg-center bg-no-repeat lg:h-[120px] lg:w-[120px]"
        style={{ backgroundImage: "url(/logos/logo.svg?v=20261119)" }}
      />
    </span>
  );

  return (
    <footer
      // The phone bar on a product page watches this marker and steps aside
      // while the footer is on screen, so it never covers it.
      data-page-end
      data-footer="green"
      className={`border-t border-[var(--purple-950)] bg-[var(--brand-green)] text-[var(--purple-950)] ${className ?? ""}`}
    >
      <div className="mx-auto w-full max-w-[1280px] px-4 py-7 lg:py-8">
        {reduced ? (
          <div
            id="contact"
            className="flex scroll-mt-24 flex-col items-center gap-3 text-center"
          >
            {contactLinks.slice(0, 2).map((link) => (
              <a
                key={link.label}
                href={link.url}
                className="inline-block -my-1.5 py-1.5 text-caption font-medium text-[var(--purple-950)] transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple-950)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-green)]"
              >
                {link.label}
              </a>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 items-center gap-8 sm:grid-cols-2">
            {/* Brand — the logo, big */}
            <div className="flex justify-center sm:justify-start">{logo}</div>

            {/* Contact — keeps the /#contact anchor alive */}
            <div id="contact" className="scroll-mt-24 text-center sm:text-start">
              <h2 className="mb-3 text-caption font-bold text-[var(--brand-purple)]">{contactTitle}</h2>
              <ul className="flex flex-col gap-2">
                {contactLinks.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.url}
                      target={link.url?.startsWith("http") ? "_blank" : undefined}
                      rel={
                        link.url?.startsWith("http")
                          ? "noopener noreferrer"
                          : undefined
                      }
                      className="inline-block -my-1.5 break-all py-1.5 text-caption font-medium text-[var(--purple-950)] transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple-950)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-green)]"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
              {description && (
                <p className="mt-4 max-w-xs text-caption font-medium leading-relaxed text-[var(--purple-950)]">
                  {description}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mt-7 border-t border-[var(--purple-950)]/30 pt-4">
          <p className="text-center text-caption font-medium text-[var(--purple-950)]">
            © {new Date().getFullYear()} {storeName} — {rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
