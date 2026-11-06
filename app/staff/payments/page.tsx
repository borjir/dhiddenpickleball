import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import {
  PaymentQueueEmpty,
  PaymentReviewCard,
  paymentReference,
} from "@/components/staff/payment-review";
import { StaffFlash, StaffPageHeader, StaffPanel } from "@/components/staff/staff-ui";
import { requireStaff } from "@/lib/staff/auth";
import {
  formatPeso,
  paymentStatusMeta,
  type PaymentStatus,
} from "@/lib/bookings";
import { formatStaffDateTime } from "@/lib/staff/time";
import { one, personLabel, type StaffPayment } from "@/lib/staff/types";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Payments",
};

type SearchParams = Promise<{
  status?: string | string[];
  notice?: string | string[];
  error?: string | string[];
}>;

const TABS: Array<{ value: PaymentStatus; label: string }> = [
  { value: "awaiting_verification", label: "To verify" },
  { value: "paid", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];

function text(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function PaymentHistoryCard({ payment }: { payment: StaffPayment }) {
  const booking = one(payment.booking);
  const group = one(payment.group);
  const reference = paymentReference(payment);
  const meta = paymentStatusMeta(payment.status);

  return (
    <article className="rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={meta.variant} dot>
              {meta.label}
            </Badge>
            <span className="font-mono text-[0.6875rem] font-semibold tracking-[0.08em] text-muted">
              {reference}
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold text-heading">
            {personLabel(booking?.player ?? group?.player)}
          </p>
          <p className="mt-0.5 text-caption text-muted">
            {booking
              ? formatStaffDateTime(booking.starts_at)
              : `Grouped reservation · ${formatStaffDateTime(group?.created_at)}`}
          </p>
        </div>
        <p className="font-display text-xl font-extrabold tracking-[-0.03em] text-heading">
          {formatPeso(Number(payment.amount_php))}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-caption text-muted">
        <span>
          {payment.status === "rejected"
            ? payment.rejection_reason || "Rejected by staff."
            : `Reviewed ${formatStaffDateTime(payment.submitted_at)}`}
        </span>
        <Link
          href={`/staff/bookings/${encodeURIComponent(reference)}`}
          className="font-semibold text-accent-ink hover:text-heading"
        >
          Open booking
        </Link>
      </div>
    </article>
  );
}

async function Payments({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await requireStaff();
  const params = await searchParams;
  const requestedStatus = text(params.status);
  const status = TABS.some((tab) => tab.value === requestedStatus)
    ? (requestedStatus as PaymentStatus)
    : "awaiting_verification";

  const [paymentsResult, awaitingCount, paidCount, rejectedCount] = await Promise.all([
    supabase
      .from("payments")
      .select(
        `id, status, amount_php, transaction_reference, proof_path, submitted_at, rejection_reason,
         booking:bookings!payments_booking_id_fkey(reference, starts_at, player:profiles!bookings_player_id_fkey(full_name, email, phone)),
         group:booking_groups!payments_group_id_fkey(reference, created_at, player:profiles!booking_groups_player_id_fkey(full_name, email, phone))`,
      )
      .eq("status", status)
      .order(status === "awaiting_verification" ? "submitted_at" : "reviewed_at", {
        ascending: status === "awaiting_verification",
      })
      .limit(80),
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "awaiting_verification"),
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "paid"),
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "rejected"),
  ]);

  const payments = (paymentsResult.data ?? []) as unknown as StaffPayment[];
  const paths = payments
    .map((payment) => payment.proof_path)
    .filter((path): path is string => Boolean(path));
  const signedByPath = new Map<string, string>();

  if (paths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrls(paths, 600);

    for (const item of signed ?? []) {
      if (item.path && item.signedUrl) signedByPath.set(item.path, item.signedUrl);
    }
  }

  const counts: Record<PaymentStatus, number> = {
    awaiting_verification: awaitingCount.count ?? 0,
    paid: paidCount.count ?? 0,
    rejected: rejectedCount.count ?? 0,
    unpaid: 0,
    awaiting_proof: 0,
    refund_pending: 0,
    partially_refunded: 0,
    refunded: 0,
  };

  return (
    <>
      <StaffPageHeader
        eyebrow="Money in"
        title="Payment verification"
        description="Check the actual GCash transfer before approving. The screenshot is evidence, not proof on its own."
        actions={
          <Link href="/staff/bookings" className={buttonClasses({ variant: "secondary", size: "sm" })}>
            Find a booking
          </Link>
        }
      />

      <div className="mt-5">
        <StaffFlash notice={text(params.notice) || null} error={text(params.error) || null} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-line">
        {TABS.map((tab) => {
          const active = tab.value === status;
          return (
            <Link
              key={tab.value}
              href={`/staff/payments?status=${tab.value}`}
              className={cn(
                "relative inline-flex min-h-10 items-center gap-2 rounded-t-lg px-3 text-sm font-semibold transition-colors",
                active
                  ? "bg-surface text-heading after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-brand-blue"
                  : "text-muted hover:bg-brand-blue-soft/50 hover:text-heading",
              )}
            >
              {tab.label}
              <span className="rounded-full bg-page px-1.5 py-0.5 text-[0.625rem] font-bold text-muted ring-1 ring-line">
                {counts[tab.value]}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-4">
        {paymentsResult.error ? (
          <Alert variant="warning" title="Payments could not be loaded">
            Refresh the page. If the problem continues, check the database connection.
          </Alert>
        ) : null}

        {!paymentsResult.error && payments.length === 0 ? (
          <StaffPanel title={status === "awaiting_verification" ? "Verification queue" : "Payment history"}>
            <PaymentQueueEmpty compact={status === "awaiting_verification"} />
          </StaffPanel>
        ) : null}

        {status === "awaiting_verification" ? (
          <div className="space-y-3">
            {payments.map((payment) => (
              <PaymentReviewCard
                key={payment.id}
                payment={payment}
                returnPath="/staff/payments"
                proofUrl={payment.proof_path ? signedByPath.get(payment.proof_path) : null}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <PaymentHistoryCard key={payment.id} payment={payment} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function StaffPaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  return <Payments searchParams={searchParams} />;
}
