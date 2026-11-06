import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isStaffRoute = pathname === "/staff" || pathname.startsWith("/staff/");
  const isAccountRoute =
    pathname === "/account" || pathname.startsWith("/account/");

  return updateSession(request, {
    requireStaff: isStaffRoute,
    redirectStaffToDashboard: isAccountRoute,
  });
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
