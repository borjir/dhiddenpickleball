import { NextResponse } from "next/server";
import { enqueueGuestBookingEmail } from "@/lib/email/events";
import { normalizeMobile, type GuestRecord } from "@/lib/guest";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { turnstileClientIp, verifyTurnstile } from "@/lib/turnstile";

const MAX_BYTES = 5 * 1024 * 1024;
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

function fail(message: string, status = 400) {
  return NextResponse.json({ status: "error", message }, { status });
}

/**
 * Guest payment proof upload. The guest proves ownership with the booking
 * reference and mobile number; only then is the file written with the
 * server-only service role and recorded by a security-definer RPC. No player
 * session or player row is involved.
 */
export async function POST(request: Request) {
  let form: FormData;

  try {
    form = await request.formData();
  } catch {
    return fail("Choose a payment proof file to upload.");
  }

  const file = form.get("file");
  const reference = String(form.get("reference") ?? "").trim();
  const mobile = normalizeMobile(String(form.get("mobile") ?? ""));
  const transactionReference = String(
    form.get("transactionReference") ?? "",
  ).trim();
  const turnstileToken = String(form.get("turnstileToken") ?? "");

  if (!(file instanceof File)) {
    return fail("Choose a screenshot or PDF of your payment.");
  }

  if (!reference || !mobile) {
    return fail("Enter the booking reference and mobile number again.");
  }

  if (file.size === 0 || file.size > MAX_BYTES) {
    return fail("Keep the payment proof under 5 MB.");
  }

  const extension = MIME_EXT[file.type];

  if (!extension) {
    return fail("Upload a JPG, PNG, WebP, or PDF file.");
  }

  if (transactionReference.length > 100) {
    return fail("Keep the GCash reference under 100 characters.");
  }

  const gate = await verifyTurnstile({
    token: turnstileToken,
    action: "payment_proof",
    remoteIp: turnstileClientIp(request.headers),
  });

  if (!gate.ok) {
    return fail(gate.message, gate.unavailable ? 503 : 400);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lookup_guest_record", {
    p_reference: reference.toUpperCase(),
    p_mobile: mobile,
  });

  if (error || !data) {
    return fail(
      "We could not confirm that booking. Check the reference and mobile number, then try again.",
    );
  }

  const record = data as GuestRecord;

  if (!["unpaid", "awaiting_proof", "rejected"].includes(record.paymentStatus)) {
    return fail("This booking is not waiting for a new payment proof.");
  }

  const admin = createAdminClient();

  if (!admin) {
    return fail(
      "Payment proof upload is not configured. Contact the club to send your proof.",
      500,
    );
  }

  const path = `guests/${record.id}/${crypto.randomUUID()}.${extension}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from("payment-proofs")
    .upload(path, bytes, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("[payment-proof] Upload failed:", uploadError.message);
    return fail("The file could not be uploaded. Try again.", 500);
  }

  const rpcName =
    record.kind === "group"
      ? "submit_guest_group_payment_proof"
      : "submit_guest_payment_proof";
  const { error: proofError } = await supabase.rpc(rpcName, {
    p_reference: record.reference,
    p_mobile: mobile,
    p_proof_path: path,
    p_transaction_reference: transactionReference || null,
  });

  if (proofError) {
    await admin.storage.from("payment-proofs").remove([path]);

    return fail(
      proofError.code === "22023" || proofError.code === "55000"
        ? proofError.message
        : "The payment proof could not be saved. Try again.",
    );
  }

  await enqueueGuestBookingEmail(
    "payment_proof_received",
    record.kind === "group"
      ? { groupId: record.id }
      : { bookingId: record.id },
  );

  return NextResponse.json({
    status: "success",
    message: "Payment proof received. Staff will verify it shortly.",
  });
}
