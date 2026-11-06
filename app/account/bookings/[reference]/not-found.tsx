import type { Metadata } from "next";
import Link from "next/link";
import { AccountShell } from "@/components/account/account-shell";
import { buttonClasses } from "@/components/ui/button";
import { ArrowLeftIcon, CalendarIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Booking not found",
  robots: { index: false, follow: false },
};

export default function BookingNotFound() {
  return (
    <AccountShell>
      <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-line bg-surface px-6 py-10 text-center shadow-card">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-blue-soft text-accent-ink">
          <CalendarIcon className="size-6" />
        </span>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-[-0.02em] text-heading">
          Booking not found
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
          This reference does not match a booking on your account. Check the
          reference in your confirmation, or go back to your bookings.
        </p>
        <Link
          href="/account"
          className={buttonClasses({
            variant: "secondary",
            className: "mt-5",
          })}
        >
          <ArrowLeftIcon className="size-4" />
          Back to account
        </Link>
      </div>
    </AccountShell>
  );
}
