/**
 * Shared application constants.
 */

// Site
export const SITE_NAME = "Parfums De Foda";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://parfumsdefoda.com";
export const CURRENCY = "EGP";

// LocalStorage keys
export const STORAGE_KEYS = {
  CART: "parfumsdefoda-cart",
  WISHLIST: "parfumsdefoda-wishlist",
} as const;

// Contact information (also available in data/contact.json)
export const CONTACT = {
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "201234567890",
  email: process.env.NEXT_PUBLIC_EMAIL || "info@parfumsdefoda.com",
} as const;

// Grid columns for responsive layout
export const GRID_COLUMNS = {
  DESKTOP: 4,
  TABLET: 2,
  MOBILE: 1,
} as const;

// Fixed shipping fee (EGP) — displayed on product cards and added to order total
export const SHIPPING_FEE = 100;

// Breakpoints
export const BREAKPOINTS = {
  DESKTOP: 1024,
  TABLET: 768,
} as const;
