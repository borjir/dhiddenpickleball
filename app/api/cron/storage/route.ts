import { NextResponse } from "next/server";
import { purgePaymentProofs } from "@/lib/storage/purge-proofs";

/**
 * Deletes the payment proofs of cancelled bookings, rejected payments and
 * voided records. Everything else is kept permanently. Same bearer secret as
 * the email cron so one scheduler can drive both:
 *
 *   curl -H "Authorization: Bearer $EMAIL_CRON_SECRET" https://<domain>/api/cron/storage
 *
 * Safe to call as often as you like: a live or completed booking never loses its
 * proof, and each run is capped.
 */
function authorized(request: Request) {
  const expected = process.env.EMAIL_CRON_SECRET?.trim();
  if (!expected) return false;

  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  const provided = bearer || request.headers.get("x-cron-secret")?.trim() || "";

  return provided.length > 0 && provided === expected;
}

export async function GET(request: Request) {
  if (!process.env.EMAIL_CRON_SECRET?.trim()) {
    return NextResponse.json(
      { error: "EMAIL_CRON_SECRET is not configured." },
      { status: 503 },
    );
  }

  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await purgePaymentProofs();

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result);
}
