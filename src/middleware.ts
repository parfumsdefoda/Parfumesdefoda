import { NextResponse, type NextRequest } from "next/server";
import { CATEGORY_ROUTES } from "@/lib/site-nav";

/**
 * Unknown category slugs answer a real 404.
 *
 * `/shop/[category]` reads the query string to keep filters shareable, which
 * makes it a dynamic route. A `notFound()` thrown there lands after the shell
 * has started streaming, so the response is a 200 carrying the 404 page — a
 * soft 404 that search engines index. The slug is pure and known here, so the
 * check happens before any rendering: an unknown category is rewritten to a
 * path that does not exist, and Next answers 404 with the not-found page.
 */
export function middleware(request: NextRequest): NextResponse {
  const path = request.nextUrl.pathname.replace(/\/+$/, "");
  const prefix = "/shop/";

  if (path.startsWith(prefix)) {
    const slug = path.slice(prefix.length);
    const known = CATEGORY_ROUTES.some((route) => route.slug === slug);
    if (!known) {
      return NextResponse.rewrite(new URL("/__not-found", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/shop/:path*",
};
