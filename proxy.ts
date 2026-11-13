import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Supabase's default confirmation email can fall back to the Site URL root
 * (`/?code=...`) when a redirect URL is not allow-listed. Send those links
 * through the real callback handler instead of dropping the code on the
 * homepage. This also keeps links that were already emailed working after the
 * public Site URL changes.
 */
function authResultRedirect(request: NextRequest) {
  if (request.nextUrl.pathname !== "/") return null;

  const params = request.nextUrl.searchParams;
  const hasAuthResult =
    params.has("code") ||
    params.has("token_hash") ||
    params.has("error") ||
    params.has("error_description");

  if (!hasAuthResult) return null;

  const url = request.nextUrl.clone();
  url.pathname = "/auth/callback";
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const authRedirect = authResultRedirect(request);
  if (authRedirect) return authRedirect;

  const pathname = request.nextUrl.pathname;
  const isStaffRoute = pathname === "/staff" || pathname.startsWith("/staff/");

  // Player accounts were removed. Keep old bookmarks and emailed links useful
  // instead of showing a dead sign-in or account page.
  const legacyPlayerRoute =
    pathname === "/sign-in" ||
    pathname === "/sign-up" ||
    pathname === "/account" ||
    pathname.startsWith("/account/");

  if (legacyPlayerRoute) {
    return NextResponse.redirect(new URL("/lookup", request.url));
  }

  if (pathname === "/forgot-password") {
    return NextResponse.redirect(
      new URL("/staff-access/forgot-password", request.url),
    );
  }

  if (pathname === "/reset-password") {
    return NextResponse.redirect(
      new URL("/staff-access/reset-password", request.url),
    );
  }

  // Reached only for a root auth result; its redirect already returned above.
  if (pathname === "/") return NextResponse.next();

  return updateSession(request, { requireStaff: isStaffRoute });
}

export const config = {
  matcher: [
    /*
     * Only routes that read or write a session run the proxy. The public site
     * is guest-only, so its pages skip the Supabase client, middleware bundle
     * and auth round trip entirely — on the Workers Free CPU budget that work
     * was enough to push page requests over the limit.
     */
    // Supabase email links can fall back to the site root. Match only the
    // query strings that the callback handles, never a plain homepage visit.
    { source: "/", has: [{ type: "query", key: "code" }] },
    { source: "/", has: [{ type: "query", key: "token_hash" }] },
    { source: "/", has: [{ type: "query", key: "error" }] },
    { source: "/", has: [{ type: "query", key: "error_description" }] },
    // Staff session refresh and the staff-only gate.
    "/staff",
    "/staff/:path*",
    "/staff-access/:path*",
    "/notifications",
    "/auth/:path*",
    // Retired player routes and the legacy password pages still redirect.
    "/sign-in",
    "/sign-up",
    "/account/:path*",
    "/forgot-password",
    "/reset-password",
  ],
};
