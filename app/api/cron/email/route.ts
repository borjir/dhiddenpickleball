import { NextResponse } from "next/server";
import { processEmailOutbox } from "@/lib/email/process";
import { createAdminClient } from "@/lib/supabase/admin";

function authorized(request: Request) {
  const expected = process.env.EMAIL_CRON_SECRET?.trim();
  if (!expected) return false;

  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  const provided =
    bearer || request.headers.get("x-cron-secret")?.trim() || "";

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

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Supabase admin access is not configured." },
      { status: 503 },
    );
  }

  const { error } = await admin.rpc("enqueue_due_booking_reminders");
  if (error) {
    return NextResponse.json(
      { error: "Reminder queue could not be prepared." },
      { status: 500 },
    );
  }

  const result = await processEmailOutbox(50);
  return NextResponse.json(result);
}
