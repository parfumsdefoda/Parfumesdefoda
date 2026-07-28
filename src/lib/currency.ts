/**
 * Format a number as Egyptian Pounds (EGP) with Arabic numerals.
 *
 * @example
 *   formatPrice(1200)   // "١٬٢٠٠ ج.م"
 *   formatPrice(50.5)   // "٥٠٫٥ ج.م"
 */
export function formatPrice(amount: number): string {
  return `${amount.toLocaleString("ar-EG")} ج.م`;
}

/**
 * Format a number for display without currency symbol.
 *
 * @example
 *   formatNumber(1200)   // "١٬٢٠٠"
 */
export function formatNumber(amount: number): string {
  return amount.toLocaleString("ar-EG");
}
