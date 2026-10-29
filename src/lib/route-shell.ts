/**
 * Which shell a route wears, and which floating chrome it may show.
 *
 * The header and footer live in the root layout now, so the one page family
 * that must not show navigation — the checkout flow — is decided from the
 * pathname in one place instead of being rebuilt per page.
 *
 * Pure and client-safe: no DOM, no window.
 */

function normalisePath(pathname: string): string {
  const path = pathname.split("?")[0].split("#")[0];
  return path.replace(/\/+$/, "") || "/";
}

export function isCheckoutPath(pathname: string): boolean {
  const path = normalisePath(pathname);
  return path === "/checkout" || path.startsWith("/checkout/");
}

export interface AdvisorLauncherState {
  /** The cart drawer is open. */
  cartOpen?: boolean;
  /** Any modal Sheet/Dialog is open (advisor, menu, filters, photo zoom). */
  overlayOpen?: boolean;
}

/**
 * May the floating advisor button be on screen for this route?
 *
 * Hidden on the whole checkout flow and on the cart page (the shopper is
 * already committing to an order), and while any overlay owns the screen.
 * The cart drawer also hides it through a `<html data-cart-open>` attribute, so
 * opening the cart never re-renders the launcher.
 */
export function isAdvisorLauncherVisible(
  pathname: string,
  state: AdvisorLauncherState = {},
): boolean {
  const path = normalisePath(pathname);
  if (path === "/cart") return false;
  if (isCheckoutPath(path)) return false;
  if (state.cartOpen || state.overlayOpen) return false;
  return true;
}
