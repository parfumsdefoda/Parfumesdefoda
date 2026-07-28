"use client";

import type {
  FullSettings,
  ContactInfo,
  SocialLinks,
  NavItem,
  FooterColumn,
} from "@/types/services";

export type { FullSettings, ContactInfo, SocialLinks, NavItem, FooterColumn } from "@/types/services";

export interface UseSettingsReturn {
  /** Full settings data */
  settings: FullSettings;
  /** Whether settings are loading */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Store info */
  store: FullSettings["store"];
  /** Grid columns */
  grid: FullSettings["grid"];
  /** Shipping configuration */
  shipping: FullSettings["shipping"];
  /** Contact info (WhatsApp, email, phone) */
  contact: ContactInfo;
  /** Social links */
  social: SocialLinks;
  /** Navigation items */
  navigation: NavItem[];
  /** Footer columns */
  footerColumns: FooterColumn[];
  /** Footer description */
  footerDescription: string;
}

const defaultSettings: FullSettings = {
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

/**
 * Hook for consuming store settings.
 *
 * Data is pre-loaded by the Server Component and passed as initialSettings.
 * No client-side fetching — all file I/O happens server-side.
 */
export function useSettings(
  initialSettings: FullSettings = defaultSettings,
): UseSettingsReturn {
  const settings = initialSettings;

  return {
    settings,
    isLoading: false,
    error: null,
    store: settings.store,
    grid: settings.grid,
    shipping: settings.shipping,
    contact: settings.contact,
    social: settings.social,
    navigation: settings.navigation,
    footerColumns: settings.footer.columns,
    footerDescription: settings.footer.description,
  };
}
