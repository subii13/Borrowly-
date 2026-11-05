import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic gate: send visitors without a session cookie to login before rendering private
 * areas. This is only a UX shortcut — every page, action and API route re-checks the session
 * and role against the database.
 */
export function proxy(req: NextRequest) {
  if (!req.cookies.has("borrowly_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/account/:path*", "/seller/:path*", "/admin/:path*", "/checkout/:path*"] };
