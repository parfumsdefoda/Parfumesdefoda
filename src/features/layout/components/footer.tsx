import Link from "next/link";

export interface FooterLink {
  label: string;
  href?: string;
  /** External link (WhatsApp, mail, tel). Opened in a new tab. */
  url?: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
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
  /** Shop and help columns; contact is rendered from `contact`. */
  columns?: FooterColumn[];
  contact?: FooterContact;
  /**
   * The facts line: cash on delivery + the flat shipping fee, already
   * formatted from data/settings.json. Never build this string in the footer.
   */
  note?: string;
  contactTitle?: string;
  rights?: string;
  /** Checkout keeps only the contact line — no shop or help links. */
  reduced?: boolean;
  className?: string;
}

/**
 * Footer — the quiet close of every page.
 *
 * Dark purple surface, one gold hairline on top, four short columns on a
 * desktop and a single column on a phone. Nothing here is invented: the links
 * are the catalogue routes, the help routes and the contact details from
 * data/contact.json; the facts line comes from the shipping helper.
 *
 * The contact column keeps `id="contact"`, so every existing `/#contact` link
 * (navigation data, WhatsApp messages) still lands on something real now that
 * the homepage no longer carries a contact section.
 */
export function Footer({
  storeName = "Parfums De Foda",
  description,
  columns = [],
  contact,
  note,
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
                className="text-caption text-[var(--color-on-dark-muted)] transition-colors hover:text-[var(--color-on-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--purple-950)]"
              >
                {link.label}
              </a>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="flex flex-col gap-3">
              <p className="text-body font-bold">{storeName}</p>
              {description && (
                <p className="max-w-xs text-caption leading-relaxed text-[var(--color-on-dark-muted)]">
                  {description}
                </p>
              )}
            </div>

            {columns.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h2 className="mb-3 text-caption font-bold">{column.title}</h2>
                <ul className="flex flex-col gap-2">
                  {column.links.map((link) => (
                    <li key={`${column.title}-${link.label}`}>
                      {link.href ? (
                        <Link
                          href={link.href}
                          className="text-caption text-[var(--color-on-dark-muted)] transition-colors hover:text-[var(--color-on-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--purple-950)]"
                        >
                          {link.label}
                        </Link>
                      ) : (
                        <a
                          href={link.url}
                          target={link.url?.startsWith("http") ? "_blank" : undefined}
                          rel={
                            link.url?.startsWith("http")
                              ? "noopener noreferrer"
                              : undefined
                          }
                          className="text-caption text-[var(--color-on-dark-muted)] transition-colors hover:text-[var(--color-on-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--purple-950)]"
                        >
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}

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
                      className="break-all text-caption text-[var(--color-on-dark-muted)] transition-colors hover:text-[var(--color-on-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--purple-950)]"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>

              {note && (
                <p className="mt-4 max-w-[15rem] text-caption leading-relaxed text-[var(--color-on-dark-muted)]">
                  {note}
                </p>
              )}
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
