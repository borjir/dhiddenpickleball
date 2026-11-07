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

  return updateSession(request, { requireStaff: isStaffRoute });
}

export const config = {
  matcher: [
    /*
     * Refresh sessions on application routes. Static assets, image
     * optimisation, and the favicon do not need an auth round trip.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
