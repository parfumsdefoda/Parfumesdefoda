/**
 * Service types — shared between server (services) and client (components/hooks).
 *
 * These types have NO dependency on node:fs or any server-side code.
 * Client components import from this file instead of from service files
 * to avoid pulling node:fs into the client bundle.
 */

import type { FilterOption } from "./filter";
import type { FaqItem } from "@/features/faq";
import type { PolicySection } from "@/features/policies";
import type { MotionIntensity, ThemePalette } from "@/lib/theme-runtime";

// ─── Theme ───

export interface Theme {
  colors: Record<string, string>;
  /**
   * Token preset written onto `<html data-palette>` by layout.tsx.
   * `brand` is the store's light purple/paper look; `noir-or`, `ivoire-or`,
   * `bleu-froid` and `monochrome` are the ported lab presets. A value the CSS
   * does not declare falls back to `brand` (see src/lib/theme-runtime.ts).
   */
  palette?: ThemePalette;
  /**
   * Motion intensity written onto `<html data-motion>`: `none` | `subtle` |
   * `moderate` (default). Drives --duration-* and --motion-* across the store;
   * prefers-reduced-motion still takes precedence for the visitor.
   */
  motion?: MotionIntensity;
  [key: string]: unknown;
}

// ─── Settings ───

export interface ContactInfo {
  whatsapp: string;
  email: string;
  phone: string;
}

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  [key: string]: string | undefined;
}

export interface NavItem {
  label: string;
  href: string;
}

export interface FooterLink {
  label: string;
  href?: string;
  url?: string;
  path?: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface FooterData {
  description: string;
  columns: FooterColumn[];
}

export interface FullSettings {
  store: {
    name: string;
    website: string;
    currency: string;
    language: string;
    direction: string;
  };
  grid: {
    desktop: number;
    tablet: number;
    mobile: number;
  };
  shipping: {
    /** Flat shipping fee in EGP. No free-shipping threshold exists. */
    cost: number;
  };
  contact: ContactInfo;
  social: SocialLinks;
  navigation: NavItem[];
  footer: FooterData;
}

// ─── Filters ───

export interface FilterData {
  filters: FilterOption[];
  categories: string[];
  badges: string[];
  genders: string[];
  types: string[];
}

// ─── Content ───

export interface HeroContent {
  title: string;
  description: string;
}

export interface HomepageContent {
  hero: { title: string; subtitle: string };
  sections: { type: string; title: string }[];
}

export interface AboutContent {
  title: string;
  description: string;
}

export interface SiteContent {
  hero: HeroContent;
  homepage: HomepageContent;
  about: AboutContent;
  faq: FaqItem[];
  policies: PolicySection[];
}

// ─── Localization ───

export type LocaleMessages = Record<string, unknown>;
