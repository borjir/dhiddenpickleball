import Link from "next/link";
import { reviewPaymentAction } from "@/app/staff/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { ArrowRightIcon, WalletIcon } from "@/components/ui/icons";
import { ConfirmSubmitButton } from "@/components/staff/confirm-submit-button";
import { formatPeso } from "@/lib/bookings";
import { formatStaffDateTime } from "@/lib/staff/time";
import { one, personLabel, type StaffPayment } from "@/lib/staff/types";
import { cn } from "@/lib/cn";

export function paymentReference(payment: StaffPayment) {
  return one(payment.booking)?.reference ?? one(payment.group)?.reference ?? "Unknown";
}

export function PaymentReviewCard({
  payment,
  returnPath,
  proofUrl,
  compact = false,
  className,
}: {
  payment: StaffPayment;
  returnPath: string;
  proofUrl?: string | null;
  compact?: boolean;
  className?: string;
}) {
  const booking = one(payment.booking);
  const group = one(payment.group);
  const reference = paymentReference(payment);
  const person = booking?.player ?? group?.player ?? null;

  return (
    <article
      className={cn(
        "rounded-lg border border-line bg-surface p-4 shadow-card",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">Awaiting verification</Badge>
            <span className="font-mono text-[0.6875rem] font-semibold tracking-[0.08em] text-muted">
              {reference}
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold text-heading">{personLabel(person)}</p>
          <p className="mt-0.5 text-caption text-muted">
            {booking ? `Court booking · ${formatStaffDateTime(booking.starts_at)}` : "Grouped court reservation"}
          </p>
        </div>
        <p className="font-display text-xl font-extrabold tracking-[-0.03em] text-heading">
          {formatPeso(Number(payment.amount_php))}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-caption text-muted">
        <span>
          Proof submitted {formatStaffDateTime(payment.submitted_at)}
        </span>
        {payment.transaction_reference ? (
          <span>
            Ref:{" "}
            <span className="font-mono text-heading">
              {payment.transaction_reference}
            </span>
          </span>
        ) : null}
        {proofUrl ? (
          <Link
            href={proofUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-accent-ink hover:text-heading"
          >
            View proof
            <ArrowRightIcon className="size-3.5" />
          </Link>
        ) : null}
      </div>

      {!compact ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <form action={reviewPaymentAction}>
            <input type="hidden" name="paymentId" value={payment.id} />
            <input type="hidden" name="returnPath" value={returnPath} />
            <input type="hidden" name="decision" value="approve" />
            <ConfirmSubmitButton
              message="Approve this payment only after checking the actual GCash transfer. Continue?"
              className="w-full"
              size="sm"
            >
              Approve payment
            </ConfirmSubmitButton>
          </form>
          <form action={reviewPaymentAction} className="flex gap-2">
            <input type="hidden" name="paymentId" value={payment.id} />
            <input type="hidden" name="returnPath" value={returnPath} />
            <input type="hidden" name="decision" value="reject" />
            <Input
              name="reason"
              placeholder="Reason for rejection"
              required
              maxLength={500}
              aria-label="Reason for rejection"
              className="h-9 min-w-0 flex-1 text-xs"
            />
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              className="shrink-0 text-danger hover:border-danger/40 hover:bg-danger-soft"
            >
              Reject
            </Button>
          </form>
        </div>
      ) : null}

      {!compact ? (
        <p className="mt-2 text-[0.6875rem] leading-relaxed text-muted">
          Only staff can verify the incoming transfer. A screenshot alone never marks a
          payment as paid.
        </p>
      ) : null}
    </article>
  );
}

export function PaymentQueueEmpty({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong bg-page/40 px-4 py-6 text-center">
      <span className="mx-auto grid size-9 place-items-center rounded-full bg-success-soft text-success">
        <WalletIcon className="size-4" />
      </span>
      <p className="mt-2 text-sm font-semibold text-heading">No payments waiting</p>
      <p className="mt-1 text-caption text-muted">
        {compact ? "The queue is clear." : "Proof uploads will appear here for verification."}
      </p>
    </div>
  );
}
