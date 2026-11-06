"use client";

import type { ReactNode } from "react";
import { useBookingModal } from "@/components/booking/booking-modal-provider";

/** Opens the court booking overlay without leaving the current page. */
export function BookingTrigger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { openCourt } = useBookingModal();

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={() => void openCourt()}
      className={className}
    >
      {children}
    </button>
  );
}
