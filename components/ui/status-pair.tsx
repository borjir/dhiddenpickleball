import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

export interface StatusValue {
  label: string;
  variant: BadgeVariant;
}

export interface StatusPairProps {
  booking: StatusValue;
  payment: StatusValue;
  className?: string;
}

/**
 * Booking status and payment status are intentionally separate. A confirmed
 * reservation can still be unpaid or awaiting staff verification.
 */
export function StatusPair({ booking, payment, className }: StatusPairProps) {
  return (
    <dl className={cn("grid grid-cols-2 gap-2.5", className)}>
      <div className="rounded-md border border-line bg-page/70 p-3">
        <dt className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
          Booking
        </dt>
        <dd className="mt-1.5">
          <Badge variant={booking.variant} dot>
            {booking.label}
          </Badge>
        </dd>
      </div>
      <div className="rounded-md border border-line bg-page/70 p-3">
        <dt className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
          Payment
        </dt>
        <dd className="mt-1.5">
          <Badge variant={payment.variant} dot>
            {payment.label}
          </Badge>
        </dd>
      </div>
    </dl>
  );
}
