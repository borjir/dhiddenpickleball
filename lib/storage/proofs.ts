/**
 * Payment proofs are the only thing in this system that grows without limit:
 * every GCash screenshot is ~108 kB and Supabase's Free plan gives 1 GB of
 * Storage, separate from the 500 MB database.
 *
 * The club's rule, as of 13 November 2026: **proofs are kept permanently**.
 * A screenshot is deleted only when the booking it belongs to will never need
 * it again — the booking or open-play registration was cancelled, the payment
 * was rejected, or staff voided the record. Verified, completed, no-show and
 * still-pending proofs are never deleted, however old they are.
 *
 * That means storage growth is now unbounded by design. The cap remains a
 * reporting concern, not a deletion trigger: `/staff/reports` shows how much of
 * the 1 GB is used so the club can decide before it fills.
 */

export const PROOF_BUCKET = "payment-proofs";

/** Objects deleted per run. Keeps one request bounded; repeated runs converge. */
export const PROOF_PURGE_BATCH = 300;

/** The fields that decide whether a proof is still needed. */
export type ProofState = {
  paymentStatus: string | null;
  paymentVoidedAt: string | null;
  bookingStatus: string | null;
  bookingVoidedAt: string | null;
};

/**
 * A proof can be thrown away only when nothing can ever need it again: the
 * booking or open-play registration was cancelled, the payment was rejected, or
 * staff voided the record. Paid, verified, completed and no-show keep theirs.
 */
export function proofIsDiscardable(state: ProofState): boolean {
  if (state.paymentVoidedAt) return true;
  if (state.paymentStatus === "rejected") return true;
  if (state.bookingVoidedAt) return true;
  return state.bookingStatus === "cancelled";
}

export type ProofCandidate = {
  paymentId: string;
  path: string;
  /** When the screenshot was uploaded; oldest are deleted first. */
  submittedAt: string;
  /**
   * The proof can never be needed again: the booking/registration was
   * cancelled, the payment was rejected, or the record was voided.
   */
  discard: boolean;
};

function age(order: string) {
  const parsed = Date.parse(order);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Decide which proofs this run should delete: every dead one, oldest first,
 * capped so one request stays bounded. A live or completed booking never
 * appears here.
 */
export function chooseProofsToPurge(candidates: ProofCandidate[]): ProofCandidate[] {
  return candidates
    .filter((candidate) => candidate.discard)
    .sort((a, b) => age(a.submittedAt) - age(b.submittedAt))
    .slice(0, PROOF_PURGE_BATCH);
}

/** Human-readable reason, used in the cron response and the staff message. */
export function describeProofPurge(
  chosen: ProofCandidate[],
  options: { inspected: number; totalBytes: number | null },
) {
  if (chosen.length === 0) {
    return options.inspected === 0
      ? "No payment proofs are stored yet."
      : "Nothing to delete: every stored proof belongs to a live or completed booking.";
  }

  const megabytes =
    options.totalBytes === null
      ? ""
      : ` ${(options.totalBytes / 1024 / 1024).toFixed(1)} MB in storage before cleanup.`;

  return `${chosen.length} cancelled or rejected proof${chosen.length === 1 ? "" : "s"} deleted.${megabytes}`;
}
