/**
 * Which shell a route wears.
 *
 * The header and footer live in the root layout now, so the one page family
 * that must not show navigation — the checkout flow — is decided from the
 * pathname in one place instead of being rebuilt per page.
 */
export function isCheckoutPath(pathname: string): boolean {
  const path = pathname.split("?")[0].replace(/\/+$/, "");
  return path === "/checkout" || path.startsWith("/checkout/");
}
