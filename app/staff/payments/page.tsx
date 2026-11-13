import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ConfirmSubmitButton } from "@/components/staff/confirm-submit-button";
import { voidPaymentAction } from "@/app/staff/actions";
import {
  PaymentQueueEmpty,
  PaymentReviewCard,
  paymentReference,
} from "@/components/staff/payment-review";
import { SearchIcon, WalletIcon } from "@/components/ui/icons";
import {
  StaffEmpty,
  StaffFlash,
  StaffPageHeader,
  StaffPanel,
} from "@/components/staff/staff-ui";
import { StaffFilterBar, StaffSearchField } from "@/components/staff/staff-filters";
import { StaffPagination } from "@/components/staff/staff-pagination";
import { requireStaff } from "@/lib/staff/auth";
import {
  staffPageCount,
  staffPageHref,
  staffPageNumber,
} from "@/lib/staff/pagination";
import { paymentSearchParts, staffSearchTerm } from "@/lib/staff/search";
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
  q?: string | string[];
  page?: string | string[];
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
  const voided = Boolean(payment.voided_at);

  return (
    <article className="rounded-xl border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-strong sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={meta.variant} dot>
              {meta.label}
            </Badge>
            <span className="font-mono text-[0.6875rem] font-semibold tracking-[0.08em] text-muted">
              {reference}
            </span>
            {voided ? (
              <Badge variant="danger" dot>
                Voided
              </Badge>
            ) : null}
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
        <p
          className={cn(
            "font-display text-xl font-extrabold tracking-[-0.03em] tabular-nums sm:text-2xl",
            voided ? "text-muted line-through" : "text-heading",
          )}
        >
          {formatPeso(Number(payment.amount_php))}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-caption text-muted">
        <span>
          {voided
            ? `Voided: ${payment.voided_reason || "no reason recorded"}`
            : payment.status === "rejected"
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

      {voided ? null : (
        <form
          action={voidPaymentAction}
          className="mt-3 flex flex-wrap items-end gap-2 border-t border-line pt-3"
        >
          <input type="hidden" name="paymentId" value={payment.id} />
          <input type="hidden" name="returnPath" value="/staff/payments" />
          <label className="min-w-0 flex-1">
            <span className="block text-[0.6875rem] font-semibold text-muted">
              Wrong entry? Void it with a reason.
            </span>
            <input
              type="text"
              name="reason"
              maxLength={500}
              placeholder="Example: duplicate of the GCash receipt"
              className="mt-1 w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs text-ink"
            />
          </label>
          <ConfirmSubmitButton
            message="Void this payment? It stays in the audit trail but is removed from the totals."
            variant="ghost"
            size="sm"
            className="text-danger hover:border-danger/40 hover:bg-danger-soft"
          >
            Void payment
          </ConfirmSubmitButton>
        </form>
      )}
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
  const query = staffSearchTerm(text(params.q));
  const searchParts = query ? await paymentSearchParts(supabase, query) : null;
  const pageSize = 25;
  const page = staffPageNumber(text(params.page));
  const listParams = { status, q: query || undefined };

  const paymentsQuery = supabase
    .from("payments")
    .select(
      `id, status, amount_php, transaction_reference, proof_path, submitted_at, rejection_reason, voided_at, voided_reason,
       booking:bookings!payments_booking_id_fkey(reference, starts_at, player:customers!bookings_customer_id_fkey(full_name, email, phone:mobile)),
       group:booking_groups!payments_group_id_fkey(reference, created_at, player:customers!booking_groups_customer_id_fkey(full_name, email, phone:mobile))`,
      { count: "exact" },
    )
    .eq("status", status)
    .order(status === "awaiting_verification" ? "submitted_at" : "reviewed_at", {
      ascending: status === "awaiting_verification",
    })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const [paymentsResult, awaitingCount, paidCount, rejectedCount] = await Promise.all([
    searchParts ? paymentsQuery.or(searchParts.join(",")) : paymentsQuery,
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "awaiting_verification"),
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "paid")
      .is("voided_at", null),
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "rejected"),
  ]);

  const payments = (paymentsResult.data ?? []) as unknown as StaffPayment[];
  const total = paymentsResult.count ?? 0;
  const totalPages = staffPageCount(total, pageSize);

  if (!paymentsResult.error && page > totalPages) {
    redirect(staffPageHref("/staff/payments", listParams, totalPages));
  }

  const activeTabLabel = TABS.find((tab) => tab.value === status)?.label ?? "";
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

      <StaffFilterBar
        action="/staff/payments"
        active={Boolean(query)}
        clearHref={`/staff/payments?status=${status}`}
        submitLabel="Search payments"
        help="Search looks only in the payment list you are viewing."
        columns="sm:grid-cols-1"
      >
        <input type="hidden" name="status" value={status} />
        <StaffSearchField
          id="payment-search"
          label="Search payments"
          placeholder="Name, mobile, booking reference, or GCash reference"
          defaultValue={query}
          hint="Finds both the player and the reference written on the receipt."
        />
      </StaffFilterBar>

      <p className="mt-5 text-caption font-bold text-heading">Show payments</p>
      <div className="mt-1.5 flex items-center gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1 shadow-card">
        {TABS.map((tab) => {
          const active = tab.value === status;
          return (
            <Link
              key={tab.value}
              href={`/staff/payments?status=${tab.value}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-colors",
                active
                  ? "bg-brand-navy text-white shadow-sm"
                  : "text-muted hover:bg-brand-blue-soft/50 hover:text-heading",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[0.625rem] font-bold tabular-nums",
                  active
                    ? "bg-white/15 text-white"
                    : "bg-page text-muted ring-1 ring-line",
                )}
              >
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

        {query && !paymentsResult.error && payments.length > 0 ? (
          <p className="mb-3 text-caption font-semibold text-muted">
            {total} {total === 1 ? "payment" : "payments"}{" "}
            found for “{query}” in the “{activeTabLabel}” list.
          </p>
        ) : null}

        {!paymentsResult.error && payments.length === 0 ? (
          query ? (
            <StaffPanel title="Search results">
              <StaffEmpty
                icon={SearchIcon}
                title={`No payment found for “${query}”`}
                description="Try the player's mobile number, the booking reference, or the GCash reference. Another tab may hold this payment."
                action={
                  <Link
                    href={`/staff/payments?status=${status}`}
                    className={buttonClasses({ size: "sm" })}
                  >
                    Clear search
                  </Link>
                }
              />
            </StaffPanel>
          ) : status === "awaiting_verification" ? (
            <StaffPanel title="Verification queue">
              <PaymentQueueEmpty compact />
            </StaffPanel>
          ) : (
            <StaffPanel title="Payment history">
              <StaffEmpty
                icon={WalletIcon}
                title={`No ${activeTabLabel.toLowerCase()} payments`}
                description="Payments will appear here after staff review. Try the other tabs or search for a player."
              />
            </StaffPanel>
          )
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

        <StaffPagination
          page={page}
          pageSize={pageSize}
          total={total}
          basePath="/staff/payments"
          params={listParams}
          noun="payments"
        />
      </div>
    </>
  );
}

export default function StaffPaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  return <Payments searchParams={searchParams} />;
}
