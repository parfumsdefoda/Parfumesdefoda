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
 * Footer — the quiet close of every page.
 *
 * Dark purple surface, one gold hairline on top, two short columns on a
 * desktop and a single column on a phone: the brand column and the contact
 * column. Nothing here is invented: the contact details come from
 * data/contact.json and the facts line from the shipping helper. The help
 * column (المساعدة) was removed; /faq and /shipping-returns remain as pages
 * but are no longer linked from the footer.
 *
 * The contact column keeps `id="contact"`, so every existing `/#contact` link
 * (navigation data, WhatsApp messages) still lands on something real now that
 * the homepage no longer carries a contact section.
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

  return (
    <footer
      // The phone bar on a product page watches this marker and steps aside
      // while the footer is on screen, so it never covers it.
      data-page-end
      className={`border-t border-[var(--brand-gold)] bg-[var(--purple-950)] text-[var(--color-on-dark)] ${className ?? ""}`}
    >
      <div className="mx-auto w-full max-w-[1280px] px-4 py-12">
        {reduced ? (
          <div
            id="contact"
            className="flex scroll-mt-24 flex-col items-center gap-3 text-center"
          >
            {contactLinks.slice(0, 2).map((link) => (
              <a
                key={link.label}
                href={link.url}
                className="inline-block -my-1.5 py-1.5 text-caption text-[var(--color-on-dark-muted)] transition-colors hover:text-[var(--color-on-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--purple-950)]"
              >
                {link.label}
              </a>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
            {/* Brand */}
            <div className="flex flex-col gap-3">
              <p className="text-body font-bold">{storeName}</p>
              {description && (
                <p className="max-w-xs text-caption leading-relaxed text-[var(--color-on-dark-muted)]">
                  {description}
                </p>
              )}
            </div>

            {/* Contact — keeps the /#contact anchor alive */}
            <div id="contact" className="scroll-mt-24">
              <h2 className="mb-3 text-caption font-bold">{contactTitle}</h2>
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
                      className="inline-block -my-1.5 break-all py-1.5 text-caption text-[var(--color-on-dark-muted)] transition-colors hover:text-[var(--color-on-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--purple-950)]"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="mt-10 border-t border-[var(--color-on-dark-border)] pt-6">
          <p className="text-center text-caption text-[var(--color-on-dark-muted)]">
            © {new Date().getFullYear()} {storeName} — {rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
