import { NextResponse } from "next/server";

// Never prerender or cache: this must report the build the Worker is running
// right now, so an open tab can notice that a newer one was deployed.
export const dynamic = "force-dynamic";

/** The deployment id of the running build, or null when none was stamped. */
export function GET() {
  return NextResponse.json(
    { buildId: process.env.NEXT_DEPLOYMENT_ID ?? null },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
