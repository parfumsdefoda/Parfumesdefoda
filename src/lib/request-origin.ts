/**
 * Same-origin guard for state-changing API requests.
 *
 * Browsers attach an `Origin` header to cross-site POSTs, so comparing it with
 * the request's own host (or the configured site URL) blocks a third-party page
 * from submitting orders on a visitor's behalf.
 *
 * Requests without an `Origin` header (curl, server-to-server, some native
 * clients) are allowed: they are not subject to browser cross-site abuse, and
 * rejecting them would break health checks and the smoke tests.
 */

function normalizeHostname(value: string | null): string | null {
  if (!value) return null;
  try {
    // `new URL` needs a scheme; headers only carry host[:port].
    const url = new URL(value.includes("://") ? value : `http://${value}`);
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Return true when the request either has no Origin header or an Origin whose
 * hostname matches the request host / configured site hostname.
 */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const originHost = normalizeHostname(origin);
  if (!originHost) return false;

  const allowed = new Set<string>();

  for (const header of ["host", "x-forwarded-host"]) {
    const host = normalizeHostname(request.headers.get(header));
    if (host) allowed.add(host);
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://parfumsdefoda.com";
  const siteHost = normalizeHostname(siteUrl);
  if (siteHost) allowed.add(siteHost);

  return allowed.has(originHost);
}
