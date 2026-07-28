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

// ─── Theme ───

export interface Theme {
  colors: Record<string, string>;
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
    cost: number;
    freeAbove?: number;
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
