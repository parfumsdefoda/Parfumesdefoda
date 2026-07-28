/**
 * Validation helpers for the checkout form.
 * These are used alongside Zod schemas for runtime validation.
 */

/**
 * Egyptian phone number validation.
 * Accepts formats: 01xxxxxxxxx, +20xxxxxxxxxx, 0020xxxxxxxxxx
 */
export function isValidEgyptianPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  return /^(?:\+20|0020|0)1[0-25]{1}[0-9]{8}$/.test(cleaned);
}
