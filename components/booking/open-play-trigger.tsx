"use client";

import type { ReactNode } from "react";
import { useBookingModal } from "@/components/booking/booking-modal-provider";

/** Opens the open-play schedule overlay without leaving the current page. */
export function OpenPlayTrigger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { openOpenPlayList } = useBookingModal();

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={() => void openOpenPlayList()}
      className={className}
    >
      {children}
    </button>
  );
}
