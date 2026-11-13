import { createAdminClient } from "@/lib/supabase/admin";
import {
  PROOF_BUCKET,
  chooseProofsToPurge,
  describeProofPurge,
  proofIsDiscardable,
  type ProofCandidate,
} from "@/lib/storage/proofs";

export type ProofPurgeResult = {
  ok: true;
  inspected: number;
  deleted: number;
  failed: number;
  totalBytesBefore: number | null;
  message: string;
};

export type ProofPurgeFailure = { ok: false; error: string };

type PaymentRow = {
  id: string;
  proof_path: string | null;
  submitted_at: string | null;
  created_at: string | null;
  status: string | null;
  voided_at?: string | null;
  booking:
    | { status: string | null; voided_at: string | null }
    | { status: string | null; voided_at: string | null }[]
    | null;
};

function bookingOf(row: PaymentRow) {
  return Array.isArray(row.booking) ? (row.booking[0] ?? null) : row.booking;
}

function discardable(row: PaymentRow) {
  const booking = bookingOf(row);
  return proofIsDiscardable({
    paymentStatus: row.status,
    paymentVoidedAt: row.voided_at ?? null,
    bookingStatus: booking?.status ?? null,
    bookingVoidedAt: booking?.voided_at ?? null,
  });
}

/**
 * Current bucket usage. Supabase's Storage API has no "total size" call, so this
 * reads the metadata the dashboard also reports. Returns null when the storage
 * schema is not exposed, in which case the message simply omits the size.
 */
async function bucketBytes(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
): Promise<number | null> {
  const { data, error } = await admin
    .schema("storage")
    .from("objects")
    .select("metadata")
    .eq("bucket_id", PROOF_BUCKET);

  if (error || !Array.isArray(data)) return null;

  return data.reduce((total: number, row: { metadata?: { size?: number } | null }) => {
    const size = Number(row.metadata?.size ?? 0);
    return total + (Number.isFinite(size) ? size : 0);
  }, 0);
}

/**
 * Deletes the proofs of cancelled bookings, rejected payments and voided
 * records. Everything else is kept permanently. Deletion goes through the
 * Storage API on purpose: removing rows from `storage.objects` by SQL orphans
 * the file and still consumes the plan's storage.
 */
export async function purgePaymentProofs(): Promise<
  ProofPurgeResult | ProofPurgeFailure
> {
  const admin = createAdminClient();
  if (!admin) {
    return { ok: false, error: "Supabase admin access is not configured." };
  }

  const totalBytesBefore = await bucketBytes(admin);

  const { data, error } = await admin
    .from("payments")
    .select(
      "id, proof_path, submitted_at, created_at, status, voided_at, booking:bookings (status, voided_at)",
    )
    .not("proof_path", "is", null)
    .order("submitted_at", { ascending: true, nullsFirst: true })
    .limit(1000);

  if (error) {
    return { ok: false, error: "Payment proofs could not be read." };
  }

  const rows = (data ?? []) as unknown as PaymentRow[];
  const candidates: ProofCandidate[] = rows
    .filter((row): row is PaymentRow & { proof_path: string } => Boolean(row.proof_path))
    .map((row) => ({
      paymentId: row.id,
      path: row.proof_path,
      submittedAt: row.submitted_at ?? row.created_at ?? new Date(0).toISOString(),
      discard: discardable(row),
    }));

  const chosen = chooseProofsToPurge(candidates);

  if (chosen.length === 0) {
    return {
      ok: true,
      inspected: candidates.length,
      deleted: 0,
      failed: 0,
      totalBytesBefore,
      message: describeProofPurge([], {
        inspected: candidates.length,
        totalBytes: totalBytesBefore,
      }),
    };
  }

  const { data: removed, error: removeError } = await admin.storage
    .from(PROOF_BUCKET)
    .remove(chosen.map((item) => item.path));

  if (removeError) {
    return { ok: false, error: "Storage refused to delete the proof objects." };
  }

  const removedPaths = new Set(
    (removed ?? []).map((object: { name?: string }) => object.name ?? ""),
  );
  const cleared = chosen.filter((item) => removedPaths.has(item.path));

  if (cleared.length > 0) {
    const { error: clearError } = await admin
      .from("payments")
      .update({ proof_path: null })
      .in(
        "id",
        cleared.map((item) => item.paymentId),
      );

    if (clearError) {
      return {
        ok: false,
        error:
          "Proofs were deleted from storage but their payment rows still point at them.",
      };
    }
  }

  return {
    ok: true,
    inspected: candidates.length,
    deleted: cleared.length,
    failed: chosen.length - cleared.length,
    totalBytesBefore,
    message: describeProofPurge(cleared, {
      inspected: candidates.length,
      totalBytes: totalBytesBefore,
    }),
  };
}
