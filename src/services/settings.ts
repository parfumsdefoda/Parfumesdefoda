import type { FullSettings, ContactInfo, SocialLinks, FooterColumn, FooterLink } from "@/types/services";
import { readJsonFile } from "@/lib/json-loader";

// Re-export types for backward compatibility
export type { FullSettings, ContactInfo, SocialLinks } from "@/types/services";
export type { NavItem, FooterColumn, FooterLink, FooterData } from "@/types/services";

/**
 * Load store settings, contact, social, navigation, and footer data
 * using server-side file reading.
 * Returns a merged settings object.
 */
export async function loadFullSettings(): Promise<FullSettings> {
  const defaults: FullSettings = {
    store: {
      name: "Parfums De Foda",
      website: "https://parfumsdefoda.com",
      currency: "EGP",
      language: "ar",
      direction: "rtl",
    },
    grid: { desktop: 3, tablet: 2, mobile: 1 },
    shipping: { cost: 60, freeAbove: 500 },
    contact: { whatsapp: "", email: "", phone: "" },
    social: {},
    navigation: [],
    footer: { description: "", columns: [] },
  };

  try {
    const [settings, contact, social, navigation, footer] = await Promise.all([
      readJsonFile<Record<string, unknown>>("data/settings.json", {}),
      readJsonFile<ContactInfo>("data/contact.json", defaults.contact),
      readJsonFile<SocialLinks>("data/social.json", defaults.social),
      readJsonFile<unknown>("data/navigation.json", defaults.navigation),
      readJsonFile<Record<string, unknown>>("data/footer.json", defaults.footer as unknown as Record<string, unknown>),
    ]);

    return {
      store: (settings.store as FullSettings["store"]) ?? defaults.store,
      grid: (settings.grid as FullSettings["grid"]) ?? defaults.grid,
      shipping: (settings.shipping as FullSettings["shipping"]) ?? defaults.shipping,
      contact: {
        whatsapp: contact.whatsapp ?? "",
        email: contact.email ?? "",
        phone: contact.phone ?? "",
      },
      social: social ?? defaults.social,
      navigation: Array.isArray(navigation)
        ? navigation.map((n: { label: string; path: string }) => ({
            label: n.label,
            href: n.path,
          }))
        : defaults.navigation,
      footer: {
        description: (footer.description as string) ?? defaults.footer.description,
        columns: Array.isArray(footer.columns)
          ? footer.columns.map((col: FooterColumn) => ({
              title: col.title,
              links: col.links.map((link: FooterLink) => ({
                label: link.label,
                ...(link.path ? { href: link.path } : {}),
                ...(link.url ? { url: link.url } : {}),
              })),
            }))
          : defaults.footer.columns,
      },
    };
  } catch {
    return defaults;
  }
}
