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
  const { openCourt, prewarmCourt } = useBookingModal();

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={() => void openCourt()}
      onPointerEnter={prewarmCourt}
      onFocus={prewarmCourt}
      onTouchStart={prewarmCourt}
      className={className}
    >
      {children}
    </button>
  );
}
