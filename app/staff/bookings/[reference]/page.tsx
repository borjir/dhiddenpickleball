import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  recordPaymentAction,
  updateBookingStatusAction,
} from "@/app/staff/actions";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ArrowLeftIcon, ShieldIcon } from "@/components/ui/icons";
import { ConfirmSubmitButton } from "@/components/staff/confirm-submit-button";
import { PaymentReviewCard } from "@/components/staff/payment-review";
import {
  StaffFacts,
  StaffFlash,
  StaffPageHeader,
  StaffPanel,
} from "@/components/staff/staff-ui";
import { requireStaff } from "@/lib/staff/auth";
import {
  bookingPaymentDescription,
  bookingStatusMeta,
  formatBookingDate,
  formatPeso,
  paymentStatusMeta,
  type BookingStatus,
  type PaymentStatus,
} from "@/lib/bookings";
import {
  formatStaffDateTime,
  formatStaffTimeRange,
  relativeHoldLabel,
} from "@/lib/staff/time";
import {
  personLabel,
  type StaffBooking,
  type StaffPayment,
  type StaffPerson,
} from "@/lib/staff/types";

export const metadata: Metadata = {
  title: "Booking detail",
};

type PageProps = {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ notice?: string | string[]; error?: string | string[] }>;
};

type GroupRecord = {
  id: string;
  reference: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  amount_php: number | string;
  hold_expires_at: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  source: "online" | "walk_in" | "staff";
  player: StaffPerson | null;
};

type PaymentRow = {
  id: string;
  status: PaymentStatus;
  amount_php: number | string;
  transaction_reference: string | null;
  proof_path: string | null;
  submitted_at: string | null;
  rejection_reason: string | null;
};

function text(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function bookingCourtName(booking: StaffBooking) {
  return (
    booking.court_reservations?.[0]?.court?.name ??
    booking.service?.name ??
    "Court booking"
  );
}

function statusLabel(status: BookingStatus) {
  return bookingStatusMeta(status).label;
}

async function BookingDetail({ params, searchParams }: PageProps) {
  const { supabase } = await requireStaff();
  const { reference } = await params;
  const query = await searchParams;
  const normalized = reference.trim().toUpperCase();

  let group: GroupRecord | null = null;
  let bookingRows: StaffBooking[] = [];
  let sourceBooking: StaffBooking | null = null;

  if (normalized.startsWith("HG-")) {
    const { data: groupData, error: groupError } = await supabase
      .from("booking_groups")
      .select(
        `id, reference, status, payment_status, amount_php, hold_expires_at,
         confirmed_at, cancelled_at, cancellation_reason, created_at, source,
         player:customers!booking_groups_customer_id_fkey(full_name, email, phone:mobile)`,
      )
      .eq("reference", normalized)
      .maybeSingle();

    if (groupError) notFound();
    if (!groupData) notFound();
    group = groupData as unknown as GroupRecord;
  } else {
    const { data: bookingData, error: bookingError } = await supabase
      .from("bookings")
      .select(
        `id, reference, starts_at, ends_at, duration_minutes, status, payment_status,
         amount_php, hold_expires_at, group_id, source, notes,
         player:customers!bookings_customer_id_fkey(full_name, email, phone:mobile),
         service:services(name, code),
         court_reservations(court:courts(name))`,
      )
      .eq("reference", normalized)
      .maybeSingle();

    if (bookingError) notFound();
    if (!bookingData) notFound();
    sourceBooking = bookingData as unknown as StaffBooking;

    if (sourceBooking.group_id) {
      const { data: groupData } = await supabase
        .from("booking_groups")
        .select(
          `id, reference, status, payment_status, amount_php, hold_expires_at,
           confirmed_at, cancelled_at, cancellation_reason, created_at, source,
           player:customers!booking_groups_customer_id_fkey(full_name, email, phone:mobile)`,
        )
        .eq("id", sourceBooking.group_id)
        .maybeSingle();

      group = (groupData as unknown as GroupRecord | null) ?? null;
    }
  }

  if (group) {
    const { data: rows, error } = await supabase
      .from("bookings")
      .select(
        `id, reference, starts_at, ends_at, duration_minutes, status, payment_status,
         amount_php, hold_expires_at, group_id, source, notes,
         player:customers!bookings_customer_id_fkey(full_name, email, phone:mobile),
         service:services(name, code),
         court_reservations(court:courts(name))`,
      )
      .eq("group_id", group.id)
      .order("starts_at", { ascending: true });

    if (error) notFound();
    bookingRows = (rows ?? []) as unknown as StaffBooking[];
  } else if (sourceBooking) {
    bookingRows = [sourceBooking];
  }

  const primary = bookingRows[0];
  if (!primary) notFound();

  const targetType = group ? "group" : "booking";
  const targetId = group?.id ?? primary.id;
  const targetReference = group?.reference ?? primary.reference;
  const status = group?.status ?? primary.status;
  const paymentStatus = group?.payment_status ?? primary.payment_status;
  const amount = group?.amount_php ?? primary.amount_php;
  const person = group?.player ?? primary.player;
  const holdExpiresAt = group?.hold_expires_at ?? primary.hold_expires_at;
  const returnPath = `/staff/bookings/${encodeURIComponent(normalized)}`;
  const statusMeta = bookingStatusMeta(status);
  const paymentMeta = paymentStatusMeta(paymentStatus);
  const canRecordPayment =
    !["paid", "awaiting_verification"].includes(paymentStatus) &&
    status !== "cancelled" &&
    status !== "completed";
  const canReviewPayment = paymentStatus === "awaiting_verification";

  const { data: paymentData } = await supabase
    .from("payments")
    .select(
      "id, status, amount_php, transaction_reference, proof_path, submitted_at, rejection_reason",
    )
    .eq(group ? "group_id" : "booking_id", targetId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestPayment = paymentData as PaymentRow | null;
  let proofUrl: string | null = null;
  if (latestPayment?.proof_path) {
    const { data: signed } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(latestPayment.proof_path, 600);
    proofUrl = signed?.signedUrl ?? null;
  }

  const paymentForCard: StaffPayment | null = latestPayment
    ? {
        ...latestPayment,
        booking: group
          ? null
          : {
              reference: primary.reference,
              starts_at: primary.starts_at,
              player: primary.player,
            },
        group: group
          ? {
              reference: group.reference,
              created_at: group.created_at,
              player: group.player,
            }
          : null,
      }
    : null;

  return (
    <>
      <Link
        href="/staff/bookings"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-heading shadow-card transition-colors hover:border-line-strong hover:bg-brand-blue-soft/40"
      >
        <ArrowLeftIcon className="size-4" />
        Back to bookings
      </Link>

      <div className="mt-3">
        <StaffPageHeader
          eyebrow={group ? "Grouped reservation" : "Court booking"}
          title={group ? `${bookingRows.length} court ${bookingRows.length === 1 ? "time" : "times"}` : bookingCourtName(primary)}
          description={`${personLabel(person)} · ${targetReference}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusMeta.variant} dot>{statusMeta.label}</Badge>
              <Badge variant={paymentMeta.variant}>{paymentMeta.label}</Badge>
            </div>
          }
        />
      </div>

      <div className="mt-5">
        <StaffFlash notice={text(query.notice) || null} error={text(query.error) || null} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_23rem] xl:items-start">
        <div className="space-y-5">
          <StaffPanel
            title={group ? "Reserved court times" : "Session"}
            description={group ? "One reference and one payment cover every range." : undefined}
          >
            <div className="space-y-2.5">
              {bookingRows.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-line bg-page/50 p-3.5"
                >
                  <div>
                    <p className="text-sm font-bold text-heading">
                      {formatBookingDate(booking.starts_at)}
                    </p>
                    <p className="mt-0.5 text-caption text-muted">
                      {formatStaffTimeRange(booking.starts_at, booking.ends_at)} · {bookingCourtName(booking)}
                    </p>
                    <p className="mt-1 font-mono text-[0.625rem] text-muted">{booking.reference}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-heading">{formatPeso(Number(booking.amount_php))}</p>
                    <Badge variant={bookingStatusMeta(booking.status).variant} className="mt-1">
                      {bookingStatusMeta(booking.status).label}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </StaffPanel>

          <StaffPanel title="Payment" description={bookingPaymentDescription(paymentStatus)}>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="font-display text-3xl font-extrabold tracking-[-0.04em] text-heading">
                {formatPeso(Number(amount))}
              </p>
              <Badge variant={paymentMeta.variant} dot>{paymentMeta.label}</Badge>
            </div>

            {canReviewPayment && paymentForCard ? (
              <div className="mt-4">
                <PaymentReviewCard
                  payment={paymentForCard}
                  returnPath={returnPath}
                  proofUrl={proofUrl}
                />
              </div>
            ) : null}

            {latestPayment && !canReviewPayment ? (
              <div className="mt-4 rounded-lg border border-line bg-page/50 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-heading">
                    {latestPayment.status === "paid"
                      ? "Payment verified"
                      : latestPayment.status === "rejected"
                        ? "Proof rejected"
                        : "Latest payment"}
                  </p>
                  <span className="text-caption text-muted">
                    {formatStaffDateTime(latestPayment.submitted_at)}
                  </span>
                </div>
                {latestPayment.transaction_reference ? (
                  <p className="mt-1 text-caption text-muted">
                    Ref: <span className="font-mono text-heading">{latestPayment.transaction_reference}</span>
                  </p>
                ) : null}
                {latestPayment.rejection_reason ? (
                  <p className="mt-2 rounded-md bg-danger-soft px-2.5 py-2 text-caption text-danger">
                    {latestPayment.rejection_reason}
                  </p>
                ) : null}
                {proofUrl ? (
                  <Link
                    href={proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-sm font-semibold text-accent-ink"
                  >
                    View proof
                  </Link>
                ) : null}
              </div>
            ) : null}

            {canRecordPayment ? (
              <form action={recordPaymentAction} className="mt-4 border-t border-line pt-4">
                <input type="hidden" name="returnPath" value={returnPath} />
                {group ? (
                  <input type="hidden" name="groupId" value={group.id} />
                ) : (
                  <input type="hidden" name="bookingId" value={primary.id} />
                )}
                <p className="text-sm font-bold text-heading">Record payment at the desk</p>
                <p className="mt-0.5 text-caption text-muted">
                  Use this only after receiving the payment. It marks the full amount paid.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-[9rem_1fr_auto] sm:items-end">
                  <Field id="record-method" label="Method">
                    <Select id="record-method" name="method" defaultValue="cash">
                      <option value="cash">Cash</option>
                      <option value="gcash">GCash</option>
                      <option value="maya">Maya</option>
                      <option value="bank_transfer">Bank transfer</option>
                    </Select>
                  </Field>
                  <Field id="record-reference" label="Reference" optionalLabel>
                    <Input id="record-reference" name="reference" maxLength={120} placeholder="Optional" />
                  </Field>
                  <ConfirmSubmitButton
                    message="Record the full amount as paid? Only continue after receiving the payment."
                    size="md"
                  >
                    Record paid
                  </ConfirmSubmitButton>
                </div>
              </form>
            ) : null}
          </StaffPanel>

          <StaffPanel title="Booking actions" description="These changes are written to the audit log.">
            <div className="grid gap-3 sm:grid-cols-2">
              {status === "pending" ? (
                <form action={updateBookingStatusAction}>
                  <input type="hidden" name="returnPath" value={returnPath} />
                  <input type="hidden" name="targetType" value={targetType} />
                  <input type="hidden" name="targetId" value={targetId} />
                  <input type="hidden" name="status" value="confirmed" />
                  <SubmitButton
                    variant="secondary"
                    className="w-full"
                    pendingLabel="Confirming booking…"
                  >
                    Confirm booking
                  </SubmitButton>
                </form>
              ) : null}

              {status === "confirmed" || status === "pending" ? (
                <>
                  <form action={updateBookingStatusAction}>
                    <input type="hidden" name="returnPath" value={returnPath} />
                    <input type="hidden" name="targetType" value={targetType} />
                    <input type="hidden" name="targetId" value={targetId} />
                    <input type="hidden" name="status" value="completed" />
                    <SubmitButton
                      variant="secondary"
                      className="w-full"
                      pendingLabel="Completing booking…"
                    >
                      Mark completed
                    </SubmitButton>
                  </form>
                  <form action={updateBookingStatusAction}>
                    <input type="hidden" name="returnPath" value={returnPath} />
                    <input type="hidden" name="targetType" value={targetType} />
                    <input type="hidden" name="targetId" value={targetId} />
                    <input type="hidden" name="status" value="no_show" />
                    <ConfirmSubmitButton
                      message="Mark this booking as a no-show?"
                      variant="secondary"
                      className="w-full"
                    >
                      Mark no-show
                    </ConfirmSubmitButton>
                  </form>
                </>
              ) : null}
            </div>

            {status !== "cancelled" ? (
              <form action={updateBookingStatusAction} className="mt-4 border-t border-line pt-4">
                <input type="hidden" name="returnPath" value={returnPath} />
                <input type="hidden" name="targetType" value={targetType} />
                <input type="hidden" name="targetId" value={targetId} />
                <input type="hidden" name="status" value="cancelled" />
                <Field
                  id="cancel-reason"
                  label="Cancel this booking"
                  hint="Required. The court time is released immediately."
                >
                  <Textarea
                    id="cancel-reason"
                    name="reason"
                    rows={2}
                    maxLength={500}
                    placeholder="Reason the player or club needs to see"
                    required
                  />
                </Field>
                <ConfirmSubmitButton
                  message="Cancel this booking and release the court time?"
                  variant="danger"
                  className="mt-2 w-full sm:w-auto"
                >
                  Cancel booking
                </ConfirmSubmitButton>
              </form>
            ) : (
              <div className="mt-4 rounded-lg border border-line bg-page/50 p-3 text-caption text-muted">
                Cancelled {formatStaffDateTime(group?.cancelled_at ?? primary.cancelled_at)}
                {group?.cancellation_reason || primary.cancellation_reason
                  ? ` — ${group?.cancellation_reason ?? primary.cancellation_reason}`
                  : "."}
              </div>
            )}
          </StaffPanel>
        </div>

        <div className="space-y-5 xl:sticky xl:top-8">
          <StaffPanel title="Player">
            <p className="text-base font-bold text-heading">{personLabel(person)}</p>
            <p className="mt-1 break-all text-caption text-muted">{person?.email ?? "No email on file"}</p>
            {person?.phone ? <p className="mt-0.5 text-caption text-muted">{person.phone}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {person?.email ? (
                <a
                  href={`mailto:${person.email}`}
                  className="inline-flex min-h-9 items-center rounded-lg border border-line bg-page px-3 text-xs font-semibold text-heading"
                >
                  Email
                </a>
              ) : null}
              {person?.phone ? (
                <a
                  href={`tel:${person.phone}`}
                  className="inline-flex min-h-9 items-center rounded-lg border border-line bg-page px-3 text-xs font-semibold text-heading"
                >
                  Call
                </a>
              ) : null}
            </div>
          </StaffPanel>

          <StaffPanel title="Reservation facts">
            <StaffFacts
              items={[
                { label: "Reference", value: <span className="font-mono">{targetReference}</span> },
                { label: "Status", value: statusLabel(status) },
                { label: "Payment", value: paymentMeta.label },
                { label: "Source", value: group?.source ?? primary.source },
                { label: "Created", value: formatStaffDateTime(group?.created_at ?? primary.starts_at) },
                ...(holdExpiresAt
                  ? [{ label: "Hold", value: `${relativeHoldLabel(holdExpiresAt)} · ${formatStaffDateTime(holdExpiresAt)}` }]
                  : []),
                ...(group?.confirmed_at || primary.confirmed_at
                  ? [{ label: "Confirmed", value: formatStaffDateTime(group?.confirmed_at ?? primary.confirmed_at) }]
                  : []),
              ]}
            />
          </StaffPanel>

          <div className="rounded-xl border border-brand-blue/20 bg-brand-blue-soft/40 p-4">
            <div className="flex items-start gap-2.5">
              <ShieldIcon className="mt-0.5 size-5 shrink-0 text-accent-ink" />
              <div>
                <p className="text-sm font-bold text-heading">Staff-only actions</p>
                <p className="mt-1 text-caption leading-relaxed text-muted">
                  Changes to bookings, payments, and attendance are recorded in the audit log.
                  Verify the actual transfer before approving anything.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function StaffBookingDetailPage({ params, searchParams }: PageProps) {
  return <BookingDetail params={params} searchParams={searchParams} />;
}
